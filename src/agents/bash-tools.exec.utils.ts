import path from "node:path";
import { enqueueSystemEvent } from "../infra/system-events.js";
import { requestHeartbeatNow } from "../infra/heartbeat-wake.js";
import { tail } from "./bash-process-registry.js";
import {
    ExecHost,
    ExecSecurity,
    ExecAsk,
    ProcessSession
} from "./bash-tools.exec.types.js";

const DEFAULT_NOTIFY_TAIL_CHARS = 400;
const DEFAULT_APPROVAL_RUNNING_NOTICE_MS = 10_000;
const APPROVAL_SLUG_LENGTH = 8;

/**
 * Normaliza o host de execução.
 */
export function normalizeExecHost(value?: string | null): ExecHost | null {
    const normalized = value?.trim().toLowerCase();
    if (normalized === "sandbox" || normalized === "gateway" || normalized === "node") {
        return normalized as ExecHost;
    }
    return null;
}

/**
 * Normaliza o modo de segurança.
 */
export function normalizeExecSecurity(value?: string | null): ExecSecurity | null {
    const normalized = value?.trim().toLowerCase();
    if (normalized === "deny" || normalized === "allowlist" || normalized === "full") {
        return normalized as ExecSecurity;
    }
    return null;
}

/**
 * Normaliza o modo de confirmação (ask).
 */
export function normalizeExecAsk(value?: string | null): ExecAsk | null {
    const normalized = value?.trim().toLowerCase();
    if (normalized === "off" || normalized === "on-miss" || normalized === "always") {
        return normalized as ExecAsk;
    }
    return null;
}

/**
 * Retorna o label amigável do host.
 */
export function renderExecHostLabel(host: ExecHost): string {
    return host === "sandbox" ? "sandbox" : host === "gateway" ? "gateway" : "node";
}

/**
 * Limpa espaços extras para notificações.
 */
export function normalizeNotifyOutput(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

/**
 * Normaliza a lista de paths a serem prefixados.
 */
export function normalizePathPrepend(entries?: string[]): string[] {
    if (!Array.isArray(entries)) return [];
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const entry of entries) {
        if (typeof entry !== "string") continue;
        const trimmed = entry.trim();
        if (!trimmed || seen.has(trimmed)) continue;
        seen.add(trimmed);
        normalized.push(trimmed);
    }
    return normalized;
}

/**
 * Mescla paths existentes com novos prefixos.
 */
export function mergePathPrepend(existing: string | undefined, prepend: string[]): string | undefined {
    if (prepend.length === 0) return existing;
    const partsExisting = (existing ?? "")
        .split(path.delimiter)
        .map((part) => part.trim())
        .filter(Boolean);
    const merged: string[] = [];
    const seen = new Set<string>();
    for (const part of [...prepend, ...partsExisting]) {
        if (seen.has(part)) continue;
        seen.add(part);
        merged.push(part);
    }
    return merged.join(path.delimiter);
}

/**
 * Aplica prefixos de PATH ao ambiente fornecido.
 */
export function applyPathPrepend(
    env: Record<string, string>,
    prepend: string[],
    options?: { requireExisting?: boolean },
): void {
    if (prepend.length === 0) return;
    if (options?.requireExisting && !env.PATH) return;
    const merged = mergePathPrepend(env.PATH, prepend);
    if (merged) env.PATH = merged;
}

/**
 * Aplica o shell path ao ambiente.
 */
export function applyShellPath(env: Record<string, string>, shellPath?: string | null): void {
    if (!shellPath) return;
    const entries = shellPath
        .split(path.delimiter)
        .map((part) => part.trim())
        .filter(Boolean);
    if (entries.length === 0) return;
    const merged = mergePathPrepend(env.PATH, entries);
    if (merged) env.PATH = merged;
}

/**
 * Notifica o término de uma sessão no background, se necessário.
 */
export function maybeNotifyOnExit(session: ProcessSession, status: "completed" | "failed"): void {
    if (!session.backgrounded || !session.notifyOnExit || session.exitNotified) return;
    const sessionKey = session.sessionKey?.trim();
    if (!sessionKey) return;
    session.exitNotified = true;
    const exitLabel = session.exitSignal
        ? `signal ${session.exitSignal}`
        : `code ${session.exitCode ?? 0}`;
    const output = normalizeNotifyOutput(
        tail(session.tail || session.aggregated || "", DEFAULT_NOTIFY_TAIL_CHARS),
    );
    const summary = output
        ? `Exec ${status} (${session.id.slice(0, 8)}, ${exitLabel}) :: ${output}`
        : `Exec ${status} (${session.id.slice(0, 8)}, ${exitLabel})`;
    enqueueSystemEvent(summary, { sessionKey });
    requestHeartbeatNow({ reason: `exec:${session.id}:exit` });
}

/**
 * Cria um slug curto para IDs de aprovação.
 */
export function createApprovalSlug(id: string): string {
    return id.slice(0, APPROVAL_SLUG_LENGTH);
}

/**
 * Resolve o intervalo de notificação de execução.
 */
export function resolveApprovalRunningNoticeMs(value?: number): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return DEFAULT_APPROVAL_RUNNING_NOTICE_MS;
    }
    if (value <= 0) return 0;
    return Math.floor(value);
}

/**
 * Emite um evento de sistema relacionado ao exec.
 */
export function emitExecSystemEvent(text: string, opts: { sessionKey?: string; contextKey?: string }): void {
    const sessionKey = opts.sessionKey?.trim();
    if (!sessionKey) return;
    enqueueSystemEvent(text, { sessionKey, contextKey: opts.contextKey });
    requestHeartbeatNow({ reason: "exec-event" });
}
