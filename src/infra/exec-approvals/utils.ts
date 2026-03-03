import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import { DEFAULT_AGENT_ID } from "../../routing/session-key.js";
import type {
  ExecSecurity,
  ExecAsk,
  ExecApprovalsDefaults,
  ExecAllowlistEntry,
  ExecApprovalsAgent,
  ExecApprovalsFile,
  ExecApprovalsSnapshot,
  ExecApprovalsResolved,
  ExecApprovalsDefaultOverrides,
  CommandResolution,
  ExecApprovalDecision,
} from "./types.js";

import {
  DEFAULT_SECURITY,
  DEFAULT_ASK,
  DEFAULT_ASK_FALLBACK,
  DEFAULT_AUTO_ALLOW_SKILLS,
  DEFAULT_SOCKET,
  DEFAULT_FILE,
  DEFAULT_SAFE_BINS,
} from "./constants.js";

export function hashExecApprovalsRaw(raw: string | null): string {
  return crypto
    .createHash("sha256")
    .update(raw ?? "")
    .digest("hex");
}

export function expandHome(value: string): string {
  if (!value) return value;
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value;
}

export function resolveExecApprovalsPath(): string {
  return expandHome(DEFAULT_FILE);
}

export function resolveExecApprovalsSocketPath(): string {
  return expandHome(DEFAULT_SOCKET);
}

export function normalizeAllowlistPattern(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed.toLowerCase() : null;
}

export function mergeLegacyAgent(
  current: ExecApprovalsAgent,
  legacy: ExecApprovalsAgent,
): ExecApprovalsAgent {
  const allowlist: ExecAllowlistEntry[] = [];
  const seen = new Set<string>();
  const pushEntry = (entry: ExecAllowlistEntry) => {
    const key = normalizeAllowlistPattern(entry.pattern);
    if (!key || seen.has(key)) return;
    seen.add(key);
    allowlist.push(entry);
  };
  for (const entry of current.allowlist ?? []) pushEntry(entry);
  for (const entry of legacy.allowlist ?? []) pushEntry(entry);

  return {
    security: current.security ?? legacy.security,
    ask: current.ask ?? legacy.ask,
    askFallback: current.askFallback ?? legacy.askFallback,
    autoAllowSkills: current.autoAllowSkills ?? legacy.autoAllowSkills,
    allowlist: allowlist.length > 0 ? allowlist : undefined,
  };
}

export function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

export function ensureAllowlistIds(
  allowlist: ExecAllowlistEntry[] | undefined,
): ExecAllowlistEntry[] | undefined {
  if (!Array.isArray(allowlist) || allowlist.length === 0) return allowlist;
  let changed = false;
  const next = allowlist.map((entry) => {
    if (entry.id) return entry;
    changed = true;
    return { ...entry, id: crypto.randomUUID() };
  });
  return changed ? next : allowlist;
}

export function normalizeExecApprovals(file: ExecApprovalsFile): ExecApprovalsFile {
  const socketPath = file.socket?.path?.trim();
  const token = file.socket?.token?.trim();
  const agents = { ...file.agents };
  const legacyDefault = agents.default;
  if (legacyDefault) {
    const main = agents[DEFAULT_AGENT_ID];
    agents[DEFAULT_AGENT_ID] = main ? mergeLegacyAgent(main, legacyDefault) : legacyDefault;
    delete agents.default;
  }
  for (const [key, agent] of Object.entries(agents)) {
    const allowlist = ensureAllowlistIds(agent.allowlist);
    if (allowlist !== agent.allowlist) {
      agents[key] = { ...agent, allowlist };
    }
  }
  const normalized: ExecApprovalsFile = {
    version: 1,
    socket: {
      path: socketPath && socketPath.length > 0 ? socketPath : undefined,
      token: token && token.length > 0 ? token : undefined,
    },
    defaults: {
      security: file.defaults?.security,
      ask: file.defaults?.ask,
      askFallback: file.defaults?.askFallback,
      autoAllowSkills: file.defaults?.autoAllowSkills,
    },
    agents,
  };
  return normalized;
}

export function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function readExecApprovalsSnapshot(): ExecApprovalsSnapshot {
  const filePath = resolveExecApprovalsPath();
  if (!fs.existsSync(filePath)) {
    const file = normalizeExecApprovals({ version: 1, agents: {} });
    return {
      path: filePath,
      exists: false,
      raw: null,
      file,
      hash: hashExecApprovalsRaw(null),
    };
  }
  const raw = fs.readFileSync(filePath, "utf8");
  let parsed: ExecApprovalsFile | null = null;
  try {
    parsed = JSON.parse(raw) as ExecApprovalsFile;
  } catch {
    parsed = null;
  }
  const file =
    parsed?.version === 1
      ? normalizeExecApprovals(parsed)
      : normalizeExecApprovals({ version: 1, agents: {} });
  return {
    path: filePath,
    exists: true,
    raw,
    file,
    hash: hashExecApprovalsRaw(raw),
  };
}

export function loadExecApprovals(): ExecApprovalsFile {
  const filePath = resolveExecApprovalsPath();
  try {
    if (!fs.existsSync(filePath)) {
      return normalizeExecApprovals({ version: 1, agents: {} });
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as ExecApprovalsFile;
    if (parsed?.version !== 1) {
      return normalizeExecApprovals({ version: 1, agents: {} });
    }
    return normalizeExecApprovals(parsed);
  } catch {
    return normalizeExecApprovals({ version: 1, agents: {} });
  }
}

export function saveExecApprovals(file: ExecApprovalsFile) {
  const filePath = resolveExecApprovalsPath();
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600 });
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // best-effort on platforms without chmod
  }
}

export function ensureExecApprovals(): ExecApprovalsFile {
  const loaded = loadExecApprovals();
  const next = normalizeExecApprovals(loaded);
  const socketPath = next.socket?.path?.trim();
  const token = next.socket?.token?.trim();
  const updated: ExecApprovalsFile = {
    ...next,
    socket: {
      path: socketPath && socketPath.length > 0 ? socketPath : resolveExecApprovalsSocketPath(),
      token: token && token.length > 0 ? token : generateToken(),
    },
  };
  saveExecApprovals(updated);
  return updated;
}

export function normalizeSecurity(
  value: ExecSecurity | undefined,
  fallback: ExecSecurity,
): ExecSecurity {
  if (value === "allowlist" || value === "full" || value === "deny") return value;
  return fallback;
}

export function normalizeAsk(value: ExecAsk | undefined, fallback: ExecAsk): ExecAsk {
  if (value === "always" || value === "off" || value === "on-miss") return value;
  return fallback;
}

export function resolveExecApprovals(
  agentId?: string,
  overrides?: ExecApprovalsDefaultOverrides,
): ExecApprovalsResolved {
  const file = ensureExecApprovals();
  return resolveExecApprovalsFromFile({
    file,
    agentId,
    overrides,
    path: resolveExecApprovalsPath(),
    socketPath: expandHome(file.socket?.path ?? resolveExecApprovalsSocketPath()),
    token: file.socket?.token ?? "",
  });
}

export function resolveExecApprovalsFromFile(params: {
  file: ExecApprovalsFile;
  agentId?: string;
  overrides?: ExecApprovalsDefaultOverrides;
  path?: string;
  socketPath?: string;
  token?: string;
}): ExecApprovalsResolved {
  const file = normalizeExecApprovals(params.file);
  const defaults = file.defaults ?? {};
  const agentKey = params.agentId ?? DEFAULT_AGENT_ID;
  const agent = file.agents?.[agentKey] ?? {};
  const wildcard = file.agents?.["*"] ?? {};
  const fallbackSecurity = params.overrides?.security ?? DEFAULT_SECURITY;
  const fallbackAsk = params.overrides?.ask ?? DEFAULT_ASK;
  const fallbackAskFallback = params.overrides?.askFallback ?? DEFAULT_ASK_FALLBACK;
  const fallbackAutoAllowSkills = params.overrides?.autoAllowSkills ?? DEFAULT_AUTO_ALLOW_SKILLS;
  const resolvedDefaults: Required<ExecApprovalsDefaults> = {
    security: normalizeSecurity(defaults.security, fallbackSecurity),
    ask: normalizeAsk(defaults.ask, fallbackAsk),
    askFallback: normalizeSecurity(
      defaults.askFallback ?? fallbackAskFallback,
      fallbackAskFallback,
    ),
    autoAllowSkills: Boolean(defaults.autoAllowSkills ?? fallbackAutoAllowSkills),
  };
  const resolvedAgent: Required<ExecApprovalsDefaults> = {
    security: normalizeSecurity(
      agent.security ?? wildcard.security ?? resolvedDefaults.security,
      resolvedDefaults.security,
    ),
    ask: normalizeAsk(agent.ask ?? wildcard.ask ?? resolvedDefaults.ask, resolvedDefaults.ask),
    askFallback: normalizeSecurity(
      agent.askFallback ?? wildcard.askFallback ?? resolvedDefaults.askFallback,
      resolvedDefaults.askFallback,
    ),
    autoAllowSkills: Boolean(
      agent.autoAllowSkills ?? wildcard.autoAllowSkills ?? resolvedDefaults.autoAllowSkills,
    ),
  };
  const allowlist = [
    ...(Array.isArray(wildcard.allowlist) ? wildcard.allowlist : []),
    ...(Array.isArray(agent.allowlist) ? agent.allowlist : []),
  ];
  return {
    path: params.path ?? resolveExecApprovalsPath(),
    socketPath: expandHome(
      params.socketPath ?? file.socket?.path ?? resolveExecApprovalsSocketPath(),
    ),
    token: params.token ?? file.socket?.token ?? "",
    defaults: resolvedDefaults,
    agent: resolvedAgent,
    allowlist,
    file,
  };
}

export function isExecutableFile(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    if (process.platform !== "win32") {
      fs.accessSync(filePath, fs.constants.X_OK);
    }
    return true;
  } catch {
    return false;
  }
}

export function parseFirstToken(command: string): string | null {
  const trimmed = command.trim();
  if (!trimmed) return null;
  const first = trimmed[0];
  if (first === '"' || first === "'") {
    const end = trimmed.indexOf(first, 1);
    if (end > 1) return trimmed.slice(1, end);
    return trimmed.slice(1);
  }
  const match = /^[^\s]+/.exec(trimmed);
  return match ? match[0] : null;
}

export function resolveExecutablePath(
  rawExecutable: string,
  cwd?: string,
  env?: NodeJS.ProcessEnv,
) {
  const expanded = rawExecutable.startsWith("~") ? expandHome(rawExecutable) : rawExecutable;
  if (expanded.includes("/") || expanded.includes("\\")) {
    if (path.isAbsolute(expanded)) {
      return isExecutableFile(expanded) ? expanded : undefined;
    }
    const base = cwd && cwd.trim() ? cwd.trim() : process.cwd();
    const candidate = path.resolve(base, expanded);
    return isExecutableFile(candidate) ? candidate : undefined;
  }
  const envPath = env?.PATH ?? env?.Path ?? process.env.PATH ?? process.env.Path ?? "";
  const entries = envPath.split(path.delimiter).filter(Boolean);
  const hasExtension = process.platform === "win32" && path.extname(expanded).length > 0;
  const extensions =
    process.platform === "win32"
      ? hasExtension
        ? [""]
        : (
            env?.PATHEXT ??
            env?.Pathext ??
            process.env.PATHEXT ??
            process.env.Pathext ??
            ".EXE;.CMD;.BAT;.COM"
          )
            .split(";")
            .map((ext) => ext.toLowerCase())
      : [""];
  for (const entry of entries) {
    for (const ext of extensions) {
      const candidate = path.join(entry, expanded + ext);
      if (isExecutableFile(candidate)) return candidate;
    }
  }
  return undefined;
}

export function resolveCommandResolution(
  command: string,
  cwd?: string,
  env?: NodeJS.ProcessEnv,
): CommandResolution | null {
  const rawExecutable = parseFirstToken(command);
  if (!rawExecutable) return null;
  const resolvedPath = resolveExecutablePath(rawExecutable, cwd, env);
  const executableName = resolvedPath ? path.basename(resolvedPath) : rawExecutable;
  return { rawExecutable, resolvedPath, executableName };
}

export function resolveCommandResolutionFromArgv(
  argv: string[],
  cwd?: string,
  env?: NodeJS.ProcessEnv,
): CommandResolution | null {
  const rawExecutable = argv[0]?.trim();
  if (!rawExecutable) return null;
  const resolvedPath = resolveExecutablePath(rawExecutable, cwd, env);
  const executableName = resolvedPath ? path.basename(resolvedPath) : rawExecutable;
  return { rawExecutable, resolvedPath, executableName };
}
