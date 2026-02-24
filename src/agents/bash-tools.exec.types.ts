import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { BashSandboxConfig } from "./bash-tools.shared.js";

export type ExecHost = "sandbox" | "gateway" | "node";
export type ExecSecurity = "deny" | "allowlist" | "full";
export type ExecAsk = "off" | "on-miss" | "always";

export interface PtyExitEvent {
    exitCode: number;
    signal?: number;
}

export type PtyListener<T> = (event: T) => void;

export interface PtyHandle {
    pid: number;
    write: (data: string | Buffer) => void;
    onData: (listener: PtyListener<string>) => void;
    onExit: (listener: PtyListener<PtyExitEvent>) => void;
}

export interface PtySpawn {
    (shell: string, args: string[], options: {
        name?: string;
        cols?: number;
        rows?: number;
        cwd?: string;
        env?: Record<string, string>;
    }): PtyHandle;
}

export interface ExecProcessOutcome {
    status: "completed" | "failed";
    exitCode: number | null;
    exitSignal: NodeJS.Signals | number | null;
    durationMs: number;
    aggregated: string;
    timedOut: boolean;
    reason?: string;
}

export interface ExecProcessHandle {
    session: ProcessSession;
    startedAt: number;
    pid?: number;
    promise: Promise<ExecProcessOutcome>;
    kill: () => void;
}

export interface ExecElevatedDefaults {
    enabled: boolean;
    allowed: boolean;
    defaultLevel: "on" | "off" | "ask" | "full";
}

export interface ExecToolDefaults {
    host?: ExecHost;
    security?: ExecSecurity;
    ask?: ExecAsk;
    node?: string;
    pathPrepend?: string[];
    safeBins?: string[];
    agentId?: string;
    backgroundMs?: number;
    timeoutSec?: number;
    approvalRunningNoticeMs?: number;
    sandbox?: BashSandboxConfig;
    elevated?: ExecElevatedDefaults;
    allowBackground?: boolean;
    scopeKey?: string;
    sessionKey?: string;
    messageProvider?: string;
    notifyOnExit?: boolean;
    cwd?: string;
}

export interface ExecToolDetails {
    status: "running" | "completed" | "failed" | "approval-pending";
    sessionId?: string;
    pid?: number;
    startedAt?: number;
    cwd?: string;
    tail?: string;
    exitCode?: number | null;
    durationMs?: number;
    aggregated?: string;
    approvalId?: string;
    approvalSlug?: string;
    expiresAtMs?: number;
    host?: ExecHost;
    command?: string;
    nodeId?: string;
}

export interface SessionStdin {
    destroyed: boolean;
    write: (data: any, cb?: (err?: Error | null) => void) => void;
    end: () => void;
}

export interface ProcessSession {
    id: string;
    command: string;
    scopeKey?: string;
    sessionKey?: string;
    notifyOnExit: boolean;
    exitNotified: boolean;
    child?: ChildProcessWithoutNullStreams;
    stdin?: SessionStdin;
    pid?: number;
    startedAt: number;
    cwd: string;
    maxOutputChars: number;
    pendingMaxOutputChars: number;
    totalOutputChars: number;
    pendingStdout: string[];
    pendingStderr: string[];
    pendingStdoutChars: number;
    pendingStderrChars: number;
    aggregated: string;
    tail: string;
    exited: boolean;
    exitCode?: number | null;
    exitSignal?: NodeJS.Signals | number | null;
    truncated: boolean;
    backgrounded: boolean;
}
