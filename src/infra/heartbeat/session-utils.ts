
import {
    resolveAgentMainSessionKey,
} from "../../config/sessions.js";
import {
    canonicalizeMainSessionAlias,
    loadSessionStore,
    resolveAgentIdFromSessionKey,
    resolveStorePath,
    updateSessionStore,
} from "../../config/sessions.js";
import { resolveDefaultAgentId } from "../../agents/agent-scope.js";
import { normalizeAgentId, toAgentStoreSessionKey } from "../../routing/session-key.js";
import { stripHeartbeatToken } from "../../auto-reply/heartbeat.js";
import { type ReplyPayload } from "../../auto-reply/types.js";
import { type ZEROConfig } from "../../config/config.js";
import { type HeartbeatConfig } from "./types.js";

export function resolveHeartbeatSession(cfg: ZEROConfig, agentId?: string, heartbeat?: HeartbeatConfig) {
    const sessionCfg = cfg.session;
    const scope = sessionCfg?.scope ?? "per-sender";
    const resolvedAgentId = normalizeAgentId(agentId ?? resolveDefaultAgentId(cfg));
    const mainSessionKey =
        scope === "global" ? "global" : resolveAgentMainSessionKey({ cfg, agentId: resolvedAgentId });
    const storeAgentId = scope === "global" ? resolveDefaultAgentId(cfg) : resolvedAgentId;
    const storePath = resolveStorePath(sessionCfg?.store, { agentId: storeAgentId });
    const store = loadSessionStore(storePath);
    const mainEntry = store[mainSessionKey];

    if (scope === "global") {
        return { sessionKey: mainSessionKey, storePath, store, entry: mainEntry };
    }

    const trimmed = heartbeat?.session?.trim() ?? "";
    if (!trimmed) {
        return { sessionKey: mainSessionKey, storePath, store, entry: mainEntry };
    }

    const normalized = trimmed.toLowerCase();
    if (normalized === "main" || normalized === "global") {
        return { sessionKey: mainSessionKey, storePath, store, entry: mainEntry };
    }

    const candidate = toAgentStoreSessionKey({
        agentId: resolvedAgentId,
        requestKey: trimmed,
        mainKey: cfg.session?.mainKey,
    });
    const canonical = canonicalizeMainSessionAlias({
        cfg,
        agentId: resolvedAgentId,
        sessionKey: candidate,
    });
    if (canonical !== "global") {
        const sessionAgentId = resolveAgentIdFromSessionKey(canonical);
        if (sessionAgentId === normalizeAgentId(resolvedAgentId)) {
            return { sessionKey: canonical, storePath, store, entry: store[canonical] };
        }
    }

    return { sessionKey: mainSessionKey, storePath, store, entry: mainEntry };
}

export function resolveHeartbeatReplyPayload(
    replyResult: ReplyPayload | ReplyPayload[] | undefined,
): ReplyPayload | undefined {
    if (!replyResult) return undefined;
    if (!Array.isArray(replyResult)) return replyResult;
    for (let idx = replyResult.length - 1; idx >= 0; idx -= 1) {
        const payload = replyResult[idx];
        if (!payload) continue;
        if (payload.text || payload.mediaUrl || (payload.mediaUrls && payload.mediaUrls.length > 0)) {
            return payload;
        }
    }
    return undefined;
}

export function resolveHeartbeatReasoningPayloads(
    replyResult: ReplyPayload | ReplyPayload[] | undefined,
): ReplyPayload[] {
    const payloads = Array.isArray(replyResult) ? replyResult : replyResult ? [replyResult] : [];
    return payloads.filter((payload) => {
        const text = typeof payload.text === "string" ? payload.text : "";
        return text.trimStart().startsWith("Reasoning:");
    });
}

export async function restoreHeartbeatUpdatedAt(params: {
    storePath: string;
    sessionKey: string;
    updatedAt?: number;
}) {
    const { storePath, sessionKey, updatedAt } = params;
    if (typeof updatedAt !== "number") return;
    const store = loadSessionStore(storePath);
    const entry = store[sessionKey];
    if (!entry) return;
    const nextUpdatedAt = Math.max(entry.updatedAt ?? 0, updatedAt);
    if (entry.updatedAt === nextUpdatedAt) return;
    await updateSessionStore(storePath, (nextStore) => {
        const nextEntry = nextStore[sessionKey] ?? entry;
        if (!nextEntry) return;
        const resolvedUpdatedAt = Math.max(nextEntry.updatedAt ?? 0, updatedAt);
        if (nextEntry.updatedAt === resolvedUpdatedAt) return;
        nextStore[sessionKey] = { ...nextEntry, updatedAt: resolvedUpdatedAt };
    });
}

export function normalizeHeartbeatReply(
    payload: ReplyPayload,
    responsePrefix: string | undefined,
    ackMaxChars: number,
) {
    const stripped = stripHeartbeatToken(payload.text, {
        mode: "heartbeat",
        maxAckChars: ackMaxChars,
    });
    const hasMedia = Boolean(payload.mediaUrl || (payload.mediaUrls?.length ?? 0) > 0);
    if (stripped.shouldSkip && !hasMedia) {
        return {
            shouldSkip: true,
            text: "",
            hasMedia,
        };
    }
    let finalText = stripped.text;
    if (responsePrefix && finalText && !finalText.startsWith(responsePrefix)) {
        finalText = `${responsePrefix} ${finalText}`;
    }
    return { shouldSkip: false, text: finalText, hasMedia };
}
