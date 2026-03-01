import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import {
    type ExecApprovalsFile,
    type ExecApprovalsSnapshot,
    resolveExecApprovalsSocketPath,
    requestExecApprovalViaSocket
} from "../../infra/exec-approvals.js";
import { ensureZEROCliOnPath } from "../../infra/path-env.js";
import { DEFAULT_NODE_PATH, OUTPUT_CAP } from "./constants.js";
import type { RunResult, SystemExecApprovalsSetParams, SystemWhichParams } from "./types.js";

export function redactExecApprovals(file: ExecApprovalsFile): ExecApprovalsFile {
    const socketPath = file.socket?.path?.trim();
    return {
        ...file,
        socket: socketPath ? { path: socketPath } : undefined,
    };
}

export function requireExecApprovalsBaseHash(
    params: SystemExecApprovalsSetParams,
    snapshot: ExecApprovalsSnapshot,
) {
    if (!snapshot.exists) return;
    if (!snapshot.hash) {
        throw new Error("INVALID_REQUEST: exec approvals base hash unavailable; reload and retry");
    }
    const baseHash = typeof params.baseHash === "string" ? params.baseHash.trim() : "";
    if (!baseHash) {
        throw new Error("INVALID_REQUEST: exec approvals base hash required; reload and retry");
    }
    if (baseHash !== snapshot.hash) {
        throw new Error("INVALID_REQUEST: exec approvals changed; reload and retry");
    }
}

export async function runCommand(
    argv: string[],
    cwd: string | undefined,
    env: Record<string, string> | undefined,
    timeoutMs: number | undefined,
): Promise<RunResult> {
    return await new Promise((resolve) => {
        let stdout = "";
        let stderr = "";
        let outputLen = 0;
        let truncated = false;
        let timedOut = false;
        let settled = false;

        const child = spawn(argv[0], argv.slice(1), {
            cwd,
            env,
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true,
        });

        const onChunk = (chunk: Buffer, target: "stdout" | "stderr") => {
            if (outputLen >= OUTPUT_CAP) {
                truncated = true;
                return;
            }
            const remaining = OUTPUT_CAP - outputLen;
            const slice = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
            const str = slice.toString("utf8");
            outputLen += slice.length;
            if (target === "stdout") stdout += str;
            else stderr += str;
            if (chunk.length > remaining) truncated = true;
        };

        child.stdout?.on("data", (chunk) => onChunk(chunk as Buffer, "stdout"));
        child.stderr?.on("data", (chunk) => onChunk(chunk as Buffer, "stderr"));

        let timer: NodeJS.Timeout | undefined;
        if (timeoutMs && timeoutMs > 0) {
            timer = setTimeout(() => {
                timedOut = true;
                try {
                    child.kill("SIGKILL");
                } catch {
                    // ignore
                }
            }, timeoutMs);
        }

        const finalize = (exitCode?: number, error?: string | null) => {
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            resolve({
                exitCode,
                timedOut,
                success: exitCode === 0 && !timedOut && !error,
                stdout,
                stderr,
                error: error ?? null,
                truncated,
            });
        };

        child.on("error", (err) => {
            finalize(undefined, err.message);
        });
        child.on("exit", (code) => {
            finalize(code === null ? undefined : code, null);
        });
    });
}

function resolveEnvPath(env?: Record<string, string>): string[] {
    const raw =
        env?.PATH ??
        (env as Record<string, string>)?.Path ??
        process.env.PATH ??
        process.env.Path ??
        DEFAULT_NODE_PATH;
    return raw.split(path.delimiter).filter(Boolean);
}

export function ensureNodePathEnv(): string {
    ensureZEROCliOnPath({ pathEnv: process.env.PATH ?? "" });
    const current = process.env.PATH ?? "";
    if (current.trim()) return current;
    process.env.PATH = DEFAULT_NODE_PATH;
    return DEFAULT_NODE_PATH;
}

function resolveExecutable(bin: string, env?: Record<string, string>) {
    if (bin.includes("/") || bin.includes("\\")) return null;
    const extensions =
        process.platform === "win32"
            ? (process.env.PATHEXT ?? process.env.PathExt ?? ".EXE;.CMD;.BAT;.COM")
                .split(";")
                .map((ext) => ext.toLowerCase())
            : [""];
    for (const dir of resolveEnvPath(env)) {
        for (const ext of extensions) {
            const candidate = path.join(dir, bin + ext);
            if (fs.existsSync(candidate)) return candidate;
        }
    }
    return null;
}

export async function handleSystemWhich(params: SystemWhichParams, env?: Record<string, string>) {
    const bins = params.bins.map((bin) => bin.trim()).filter(Boolean);
    const found: Record<string, string> = {};
    for (const bin of bins) {
        const path = resolveExecutable(bin, env);
        if (path) found[bin] = path;
    }
    return { bins: found };
}

export async function runViaMacAppExecHost(params: {
    approvals: { socketPath: string; token: string };
    request: Record<string, any>;
}): Promise<any | null> {
    const { approvals, request } = params;
    return await requestExecApprovalViaSocket({
        socketPath: approvals.socketPath,
        token: approvals.token,
        request: request,
    });
}
