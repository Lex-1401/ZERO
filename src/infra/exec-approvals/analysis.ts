import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { DEFAULT_AGENT_ID } from "../../routing/session-key.js";
import {
    expandHome,
    normalizeAllowlistPattern,
    saveExecApprovals,
    resolveExecApprovalsPath,
    resolveExecApprovalsSocketPath,
    resolveExecutablePath,
    resolveCommandResolutionFromArgv
} from "./utils.js";
import { DEFAULT_SAFE_BINS } from "./constants.js";
import type {
    ExecAllowlistEntry,
    CommandResolution,
    ExecCommandSegment,
    ExecCommandAnalysis,
    ExecAllowlistEvaluation,
    ExecAllowlistAnalysis,
    ExecAsk,
    ExecSecurity,
    ExecApprovalsFile
} from "./types.js";

const DISALLOWED_PIPELINE_TOKENS = new Set([">", "<", "`", "\n", "\r", "(", ")"]);

export function normalizeMatchTarget(value: string): string {
    if (process.platform === "win32") {
        const stripped = value.replace(/^\\\\\\[?.]\\/, "");
        return stripped.replace(/\\/g, "/").toLowerCase();
    }
    return value.replace(/\\\\/g, "/").toLowerCase();
}

export function tryRealpath(value: string): string | null {
    try {
        return fs.realpathSync(value);
    } catch {
        return null;
    }
}

export function globToRegExp(pattern: string): RegExp {
    let regex = "^";
    let i = 0;
    while (i < pattern.length) {
        const ch = pattern[i];
        if (ch === "*") {
            const next = pattern[i + 1];
            if (next === "*") {
                regex += ".*";
                i += 2;
                continue;
            }
            regex += "[^/]*";
            i += 1;
            continue;
        }
        if (ch === "?") {
            regex += ".";
            i += 1;
            continue;
        }
        regex += ch.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&");
        i += 1;
    }
    regex += "$";
    return new RegExp(regex, "i");
}

export function matchesPattern(pattern: string, target: string): boolean {
    const trimmed = pattern.trim();
    if (!trimmed) return false;
    const expanded = trimmed.startsWith("~") ? expandHome(trimmed) : trimmed;
    const hasWildcard = /[*?]/.test(expanded);
    let normalizedPattern = expanded;
    let normalizedTarget = target;
    if (process.platform === "win32" && !hasWildcard) {
        normalizedPattern = tryRealpath(expanded) ?? expanded;
        normalizedTarget = tryRealpath(target) ?? target;
    }
    normalizedPattern = normalizeMatchTarget(normalizedPattern);
    normalizedTarget = normalizeMatchTarget(normalizedTarget);
    const regex = globToRegExp(normalizedPattern);
    return regex.test(normalizedTarget);
}

export function resolveAllowlistCandidatePath(
    resolution: CommandResolution | null,
    cwd?: string,
): string | undefined {
    if (!resolution) return undefined;
    if (resolution.resolvedPath) return resolution.resolvedPath;
    const raw = resolution.rawExecutable?.trim();
    if (!raw) return undefined;
    const expanded = raw.startsWith("~") ? expandHome(raw) : raw;
    if (!expanded.includes("/") && !expanded.includes("\\")) return undefined;
    if (path.isAbsolute(expanded)) return expanded;
    const base = cwd && cwd.trim() ? cwd.trim() : process.cwd();
    return path.resolve(base, expanded);
}

export function matchAllowlist(
    entries: ExecAllowlistEntry[],
    resolution: CommandResolution | null,
): ExecAllowlistEntry | null {
    if (!entries.length || !resolution?.resolvedPath) return null;
    const resolvedPath = resolution.resolvedPath;
    for (const entry of entries) {
        const pattern = entry.pattern?.trim();
        if (!pattern) continue;
        const hasPath = pattern.includes("/") || pattern.includes("\\") || pattern.includes("~");
        if (!hasPath) continue;
        if (matchesPattern(pattern, resolvedPath)) return entry;
    }
    return null;
}

export function iterateQuoteAware(
    command: string,
    onChar: (ch: string, next: string | undefined, index: number) => "split" | "skip" | "include" | { reject: string },
): { ok: true; parts: string[]; hasSplit: boolean } | { ok: false; reason: string } {
    const parts: string[] = [];
    let buf = "";
    let inSingle = false;
    let inDouble = false;
    let escaped = false;
    let hasSplit = false;

    const pushPart = () => {
        const trimmed = buf.trim();
        if (trimmed) {
            parts.push(trimmed);
        }
        buf = "";
    };

    for (let i = 0; i < command.length; i += 1) {
        const ch = command[i];
        const next = command[i + 1];

        if (escaped) {
            buf += ch;
            escaped = false;
            continue;
        }
        if (!inSingle && !inDouble && ch === "\\") {
            escaped = true;
            buf += ch;
            continue;
        }
        if (inSingle) {
            if (ch === "'") inSingle = false;
            buf += ch;
            continue;
        }
        if (inDouble) {
            if (ch === '"') inDouble = false;
            buf += ch;
            continue;
        }
        if (ch === "'") {
            inSingle = true;
            buf += ch;
            continue;
        }
        if (ch === '"') {
            inDouble = true;
            buf += ch;
            continue;
        }

        const action = onChar(ch, next, i);
        if (typeof action === "object" && "reject" in action) {
            return { ok: false, reason: action.reject };
        }
        if (action === "split") {
            pushPart();
            hasSplit = true;
            continue;
        }
        if (action === "skip") {
            continue;
        }
        buf += ch;
    }

    if (escaped || inSingle || inDouble) {
        return { ok: false, reason: "unterminated shell quote/escape" };
    }
    pushPart();
    return { ok: true, parts, hasSplit };
}

export function splitShellPipeline(command: string): { ok: boolean; reason?: string; segments: string[] } {
    let emptySegment = false;
    const result = iterateQuoteAware(command, (ch, next) => {
        if (ch === "|" && next === "|") {
            return { reject: "unsupported shell token: ||" };
        }
        if (ch === "|" && next === "&") {
            return { reject: "unsupported shell token: |&" };
        }
        if (ch === "|") {
            emptySegment = true;
            return "split";
        }
        if (ch === "&" || ch === ";") {
            return { reject: `unsupported shell token: ${ch}` };
        }
        if (DISALLOWED_PIPELINE_TOKENS.has(ch)) {
            return { reject: `unsupported shell token: ${ch}` };
        }
        if (ch === "$" && next === "(") {
            return { reject: "unsupported shell token: $()" };
        }
        emptySegment = false;
        return "include";
    });

    if (!result.ok) {
        return { ok: false, reason: (result as { reason: string }).reason, segments: [] };
    }
    if (emptySegment || result.parts.length === 0) {
        return {
            ok: false,
            reason: result.parts.length === 0 ? "empty command" : "empty pipeline segment",
            segments: [],
        };
    }
    return { ok: true, segments: result.parts };
}

export function tokenizeShellSegment(segment: string): string[] | null {
    const tokens: string[] = [];
    let buf = "";
    let inSingle = false;
    let inDouble = false;
    let escaped = false;

    const pushToken = () => {
        if (buf.length > 0) {
            tokens.push(buf);
            buf = "";
        }
    };

    for (let i = 0; i < segment.length; i += 1) {
        const ch = segment[i];
        if (escaped) {
            buf += ch;
            escaped = false;
            continue;
        }
        if (!inSingle && !inDouble && ch === "\\") {
            escaped = true;
            continue;
        }
        if (inSingle) {
            if (ch === "'") {
                inSingle = false;
            } else {
                buf += ch;
            }
            continue;
        }
        if (inDouble) {
            if (ch === '"') {
                inDouble = false;
            } else {
                buf += ch;
            }
            continue;
        }
        if (ch === "'") {
            inSingle = true;
            continue;
        }
        if (ch === '"') {
            inDouble = true;
            continue;
        }
        if (/\s/.test(ch)) {
            pushToken();
            continue;
        }
        buf += ch;
    }

    if (escaped || inSingle || inDouble) {
        return null;
    }
    pushToken();
    return tokens;
}

export function parseSegmentsFromParts(
    parts: string[],
    cwd?: string,
    env?: NodeJS.ProcessEnv,
): ExecCommandSegment[] | null {
    const segments: ExecCommandSegment[] = [];
    for (const raw of parts) {
        const argv = tokenizeShellSegment(raw);
        if (!argv || argv.length === 0) {
            return null;
        }
        segments.push({
            raw,
            argv,
            resolution: resolveCommandResolutionFromArgv(argv, cwd, env),
        });
    }
    return segments;
}

export function analyzeShellCommand(params: {
    command: string;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}): ExecCommandAnalysis {
    const chainParts = splitCommandChain(params.command);
    if (chainParts) {
        const chains: ExecCommandSegment[][] = [];
        const allSegments: ExecCommandSegment[] = [];

        for (const part of chainParts) {
            const pipelineSplit = splitShellPipeline(part);
            if (!pipelineSplit.ok) {
                return { ok: false, reason: pipelineSplit.reason, segments: [] };
            }
            const segments = parseSegmentsFromParts(pipelineSplit.segments, params.cwd, params.env);
            if (!segments) {
                return { ok: false, reason: "unable to parse shell segment", segments: [] };
            }
            chains.push(segments);
            allSegments.push(...segments);
        }

        return { ok: true, segments: allSegments, chains };
    }

    const split = splitShellPipeline(params.command);
    if (!split.ok) {
        return { ok: false, reason: split.reason, segments: [] };
    }
    const segments = parseSegmentsFromParts(split.segments, params.cwd, params.env);
    if (!segments) {
        return { ok: false, reason: "unable to parse shell segment", segments: [] };
    }
    return { ok: true, segments };
}

export function analyzeArgvCommand(params: {
    argv: string[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}): ExecCommandAnalysis {
    const argv = params.argv.filter((entry) => entry.trim().length > 0);
    if (argv.length === 0) {
        return { ok: false, reason: "empty argv", segments: [] };
    }
    return {
        ok: true,
        segments: [
            {
                raw: argv.join(" "),
                argv,
                resolution: resolveCommandResolutionFromArgv(argv, params.cwd, params.env),
            },
        ],
    };
}

export function isPathLikeToken(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed === "-") return false;
    if (trimmed.startsWith("./") || trimmed.startsWith("../") || trimmed.startsWith("~")) return true;
    if (trimmed.startsWith("/")) return true;
    return /^[A-Za-z]:[\\/]/.test(trimmed);
}

function defaultFileExists(filePath: string): boolean {
    try {
        return fs.existsSync(filePath);
    } catch {
        return false;
    }
}

export function normalizeSafeBins(entries?: string[]): Set<string> {
    if (!Array.isArray(entries)) return new Set();
    const normalized = entries
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => entry.length > 0);
    return new Set(normalized);
}

export function resolveSafeBins(entries?: string[] | null): Set<string> {
    if (entries === undefined) return normalizeSafeBins(DEFAULT_SAFE_BINS);
    return normalizeSafeBins(entries ?? []);
}

export function isSafeBinUsage(params: {
    argv: string[];
    resolution: CommandResolution | null;
    safeBins: Set<string>;
    cwd?: string;
    fileExists?: (filePath: string) => boolean;
}): boolean {
    if (params.safeBins.size === 0) return false;
    const resolution = params.resolution;
    const execName = resolution?.executableName?.toLowerCase();
    if (!execName) return false;
    const matchesSafeBin =
        params.safeBins.has(execName) ||
        (process.platform === "win32" && params.safeBins.has(path.parse(execName).name));
    if (!matchesSafeBin) return false;
    if (!resolution?.resolvedPath) return false;
    const cwd = params.cwd ?? process.cwd();
    const exists = params.fileExists ?? defaultFileExists;
    const argv = params.argv.slice(1);
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token) continue;
        if (token === "-") continue;
        if (token.startsWith("-")) {
            const eqIndex = token.indexOf("=");
            if (eqIndex > 0) {
                const value = token.slice(eqIndex + 1);
                if (value && (isPathLikeToken(value) || exists(path.resolve(cwd, value)))) {
                    return false;
                }
            }
            continue;
        }
        if (isPathLikeToken(token)) return false;
        if (exists(path.resolve(cwd, token))) return false;
    }
    return true;
}

export function evaluateSegments(
    segments: ExecCommandSegment[],
    params: {
        allowlist: ExecAllowlistEntry[];
        safeBins: Set<string>;
        cwd?: string;
        skillBins?: Set<string>;
        autoAllowSkills?: boolean;
    },
): { satisfied: boolean; matches: ExecAllowlistEntry[] } {
    const matches: ExecAllowlistEntry[] = [];
    const allowSkills = params.autoAllowSkills === true && (params.skillBins?.size ?? 0) > 0;

    const satisfied = segments.every((segment) => {
        const candidatePath = resolveAllowlistCandidatePath(segment.resolution, params.cwd);
        const candidateResolution =
            candidatePath && segment.resolution
                ? { ...segment.resolution, resolvedPath: candidatePath }
                : segment.resolution;
        const match = matchAllowlist(params.allowlist, candidateResolution);
        if (match) matches.push(match);
        const safe = isSafeBinUsage({
            argv: segment.argv,
            resolution: segment.resolution,
            safeBins: params.safeBins,
            cwd: params.cwd,
        });
        const skillAllow =
            allowSkills && segment.resolution?.executableName
                ? params.skillBins?.has(segment.resolution.executableName)
                : false;
        return Boolean(match || safe || skillAllow);
    });

    return { satisfied, matches };
}

export function evaluateExecAllowlist(params: {
    analysis: ExecCommandAnalysis;
    allowlist: ExecAllowlistEntry[];
    safeBins: Set<string>;
    cwd?: string;
    skillBins?: Set<string>;
    autoAllowSkills?: boolean;
}): ExecAllowlistEvaluation {
    const allowlistMatches: ExecAllowlistEntry[] = [];
    if (!params.analysis.ok || params.analysis.segments.length === 0) {
        return { allowlistSatisfied: false, allowlistMatches };
    }

    if (params.analysis.chains) {
        for (const chainSegments of params.analysis.chains) {
            const result = evaluateSegments(chainSegments, {
                allowlist: params.allowlist,
                safeBins: params.safeBins,
                cwd: params.cwd,
                skillBins: params.skillBins,
                autoAllowSkills: params.autoAllowSkills,
            });
            if (!result.satisfied) {
                return { allowlistSatisfied: false, allowlistMatches: [] };
            }
            allowlistMatches.push(...result.matches);
        }
        return { allowlistSatisfied: true, allowlistMatches };
    }

    const result = evaluateSegments(params.analysis.segments, {
        allowlist: params.allowlist,
        safeBins: params.safeBins,
        cwd: params.cwd,
        skillBins: params.skillBins,
        autoAllowSkills: params.autoAllowSkills,
    });
    return { allowlistSatisfied: result.satisfied, allowlistMatches: result.matches };
}

export function splitCommandChain(command: string): string[] | null {
    const parts: string[] = [];
    let buf = "";
    let inSingle = false;
    let inDouble = false;
    let escaped = false;
    let foundChain = false;
    let invalidChain = false;

    const pushPart = () => {
        const trimmed = buf.trim();
        if (trimmed) {
            parts.push(trimmed);
            buf = "";
            return true;
        }
        buf = "";
        return false;
    };

    for (let i = 0; i < command.length; i += 1) {
        const ch = command[i];
        if (escaped) {
            buf += ch;
            escaped = false;
            continue;
        }
        if (!inSingle && !inDouble && ch === "\\") {
            escaped = true;
            buf += ch;
            continue;
        }
        if (inSingle) {
            if (ch === "'") inSingle = false;
            buf += ch;
            continue;
        }
        if (inDouble) {
            if (ch === '"') inDouble = false;
            buf += ch;
            continue;
        }
        if (ch === "'") {
            inSingle = true;
            buf += ch;
            continue;
        }
        if (ch === '"') {
            inDouble = true;
            buf += ch;
            continue;
        }

        if (ch === "&" && command[i + 1] === "&") {
            if (!pushPart()) invalidChain = true;
            i += 1;
            foundChain = true;
            continue;
        }
        if (ch === "|" && command[i + 1] === "|") {
            if (!pushPart()) invalidChain = true;
            i += 1;
            foundChain = true;
            continue;
        }
        if (ch === ";") {
            if (!pushPart()) invalidChain = true;
            foundChain = true;
            continue;
        }

        buf += ch;
    }

    const pushedFinal = pushPart();
    if (!foundChain) return null;
    if (invalidChain || !pushedFinal) return null;
    return parts.length > 0 ? parts : null;
}

export function evaluateShellAllowlist(params: {
    command: string;
    allowlist: ExecAllowlistEntry[];
    safeBins: Set<string>;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    skillBins?: Set<string>;
    autoAllowSkills?: boolean;
}): ExecAllowlistAnalysis {
    const chainParts = splitCommandChain(params.command);
    if (!chainParts) {
        const analysis = analyzeShellCommand({
            command: params.command,
            cwd: params.cwd,
            env: params.env,
        });
        if (!analysis.ok) {
            return {
                analysisOk: false,
                allowlistSatisfied: false,
                allowlistMatches: [],
                segments: [],
            };
        }
        const evaluation = evaluateExecAllowlist({
            analysis,
            allowlist: params.allowlist,
            safeBins: params.safeBins,
            cwd: params.cwd,
            skillBins: params.skillBins,
            autoAllowSkills: params.autoAllowSkills,
        });
        return {
            analysisOk: true,
            allowlistSatisfied: evaluation.allowlistSatisfied,
            allowlistMatches: evaluation.allowlistMatches,
            segments: analysis.segments,
        };
    }

    const allowlistMatches: ExecAllowlistEntry[] = [];
    const segments: ExecCommandSegment[] = [];

    for (const part of chainParts) {
        const analysis = analyzeShellCommand({
            command: part,
            cwd: params.cwd,
            env: params.env,
        });
        if (!analysis.ok) {
            return {
                analysisOk: false,
                allowlistSatisfied: false,
                allowlistMatches: [],
                segments: [],
            };
        }

        segments.push(...analysis.segments);
        const evaluation = evaluateExecAllowlist({
            analysis,
            allowlist: params.allowlist,
            safeBins: params.safeBins,
            cwd: params.cwd,
            skillBins: params.skillBins,
            autoAllowSkills: params.autoAllowSkills,
        });
        allowlistMatches.push(...evaluation.allowlistMatches);
        if (!evaluation.allowlistSatisfied) {
            return {
                analysisOk: true,
                allowlistSatisfied: false,
                allowlistMatches,
                segments,
            };
        }
    }

    return {
        analysisOk: true,
        allowlistSatisfied: true,
        allowlistMatches,
        segments,
    };
}

export function minSecurity(a: ExecSecurity, b: ExecSecurity): ExecSecurity {
    const scores: Record<ExecSecurity, number> = { deny: 3, allowlist: 2, full: 1 };
    return scores[a] >= scores[b] ? a : b;
}

export function maxAsk(a: ExecAsk, b: ExecAsk): ExecAsk {
    const scores: Record<ExecAsk, number> = { always: 3, "on-miss": 2, off: 1 };
    return scores[a] >= scores[b] ? a : b;
}

export function requiresExecApproval(params: {
    ask: ExecAsk;
    security: ExecSecurity;
    analysisOk: boolean;
    allowlistSatisfied: boolean;
}): boolean {
    return (
        params.ask === "always" ||
        (params.ask === "on-miss" &&
            params.security === "allowlist" &&
            (!params.analysisOk || !params.allowlistSatisfied))
    );
}

export function recordAllowlistUse(
    approvals: ExecApprovalsFile,
    agentId: string | undefined,
    entry: ExecAllowlistEntry,
    command: string,
    resolvedPath?: string,
) {
    const target = agentId ?? DEFAULT_AGENT_ID;
    const agents = approvals.agents ?? {};
    const existing = agents[target] ?? {};
    const allowlist = Array.isArray(existing.allowlist) ? existing.allowlist : [];
    const nextAllowlist = allowlist.map((item) =>
        item.pattern === entry.pattern
            ? {
                ...item,
                id: item.id ?? crypto.randomUUID(),
                lastUsedAt: Date.now(),
                lastUsedCommand: command,
                lastResolvedPath: resolvedPath,
            }
            : item,
    );
    agents[target] = { ...existing, allowlist: nextAllowlist };
    approvals.agents = agents;
    saveExecApprovals(approvals);
}

export function addAllowlistEntry(
    approvals: ExecApprovalsFile,
    agentId: string | undefined,
    pattern: string,
) {
    const target = agentId ?? DEFAULT_AGENT_ID;
    const agents = approvals.agents ?? {};
    const existing = agents[target] ?? {};
    const allowlist = Array.isArray(existing.allowlist) ? existing.allowlist : [];
    const trimmed = pattern.trim();
    if (!trimmed) return;
    if (allowlist.some((entry) => entry.pattern === trimmed)) return;
    allowlist.push({ id: crypto.randomUUID(), pattern: trimmed, lastUsedAt: Date.now() });
    agents[target] = { ...existing, allowlist };
    approvals.agents = agents;
    saveExecApprovals(approvals);
}
