
import { buildGroupDisplayName, type SessionEntry } from "../../config/sessions.js";
import { normalizeAgentId, parseAgentSessionKey } from "../../routing/session-key.js";
import { normalizeSessionDeliveryFields } from "../../utils/delivery-context.js";
import { readFirstUserMessageFromTranscript, readLastMessagePreviewFromTranscript } from "./fs.js";
import { deriveSessionTitle } from "./naming.js";
import { type GatewaySessionRow, type SessionsListResult, type GatewaySessionsDefaults } from "./types.js";
import type { ZEROConfig } from "../../config/config.js";
import { resolveConfiguredModelRef } from "../../agents/model-selection.js";
import { lookupContextTokens } from "../../agents/context.js";
import { DEFAULT_CONTEXT_TOKENS, DEFAULT_MODEL, DEFAULT_PROVIDER } from "../../agents/defaults.js";

export function classifySessionKey(key: string, entry?: SessionEntry): GatewaySessionRow["kind"] {
    if (key === "global") return "global";
    if (key === "unknown") return "unknown";
    if (entry?.chatType === "group" || entry?.chatType === "channel") {
        return "group";
    }
    if (key.includes(":group:") || key.includes(":channel:")) {
        return "group";
    }
    return "direct";
}

export function parseGroupKey(
    key: string,
): { channel?: string; kind?: "group" | "channel"; id?: string } | null {
    const agentParsed = parseAgentSessionKey(key);
    const rawKey = agentParsed?.rest ?? key;
    const parts = rawKey.split(":").filter(Boolean);
    if (parts.length >= 3) {
        const [channel, kind, ...rest] = parts;
        if (kind === "group" || kind === "channel") {
            const id = rest.join(":");
            return { channel, kind, id };
        }
    }
    return null;
}

export function getSessionDefaults(cfg: ZEROConfig): GatewaySessionsDefaults {
    const resolved = resolveConfiguredModelRef({
        cfg,
        defaultProvider: DEFAULT_PROVIDER,
        defaultModel: DEFAULT_MODEL,
    });
    const contextTokens =
        cfg.agents?.defaults?.contextTokens ??
        lookupContextTokens(resolved.model) ??
        DEFAULT_CONTEXT_TOKENS;
    return {
        modelProvider: resolved.provider ?? null,
        model: resolved.model ?? null,
        contextTokens: contextTokens ?? null,
    };
}

export function listSessionsFromStore(params: {
    cfg: ZEROConfig;
    storePath: string;
    store: Record<string, SessionEntry>;
    opts: any;
}): SessionsListResult {
    const { cfg, storePath, store, opts } = params;
    const now = Date.now();

    const includeGlobal = opts.includeGlobal === true;
    const includeUnknown = opts.includeUnknown === true;
    const includeDerivedTitles = opts.includeDerivedTitles === true;
    const includeLastMessage = opts.includeLastMessage === true;
    const spawnedBy = typeof opts.spawnedBy === "string" ? opts.spawnedBy : "";
    const label = typeof opts.label === "string" ? opts.label.trim() : "";
    const agentId = typeof opts.agentId === "string" ? normalizeAgentId(opts.agentId) : "";
    const search = typeof opts.search === "string" ? opts.search.trim().toLowerCase() : "";
    const activeMinutes =
        typeof opts.activeMinutes === "number" && Number.isFinite(opts.activeMinutes)
            ? Math.max(1, Math.floor(opts.activeMinutes))
            : undefined;

    let sessions = Object.entries(store)
        .filter(([key]) => {
            if (!includeGlobal && key === "global") return false;
            if (!includeUnknown && key === "unknown") return false;
            if (agentId) {
                if (key === "global" || key === "unknown") return false;
                const parsed = parseAgentSessionKey(key);
                if (!parsed) return false;
                return normalizeAgentId(parsed.agentId) === agentId;
            }
            return true;
        })
        .filter(([key, entry]) => {
            if (!spawnedBy) return true;
            if (key === "unknown" || key === "global") return false;
            return entry?.spawnedBy === spawnedBy;
        })
        .filter(([, entry]) => {
            if (!label) return true;
            return entry?.label === label;
        })
        .map(([key, entry]) => {
            const updatedAt = entry?.updatedAt ?? null;
            const input = entry?.inputTokens ?? 0;
            const output = entry?.outputTokens ?? 0;
            const total = entry?.totalTokens ?? input + output;
            const parsed = parseGroupKey(key);
            const channel = entry?.channel ?? parsed?.channel;
            const subject = entry?.subject;
            const groupChannel = entry?.groupChannel;
            const space = entry?.space;
            const id = parsed?.id;
            const origin = entry?.origin;
            const originLabel = origin?.label;
            const displayName =
                entry?.displayName ??
                (channel
                    ? buildGroupDisplayName({
                        provider: channel,
                        subject,
                        groupChannel,
                        space,
                        id,
                        key,
                    })
                    : undefined) ??
                entry?.label ??
                originLabel;
            const deliveryFields = normalizeSessionDeliveryFields(entry);
            return {
                key,
                entry,
                kind: classifySessionKey(key, entry),
                label: entry?.label,
                displayName,
                channel,
                subject,
                groupChannel,
                space,
                chatType: entry?.chatType,
                origin,
                updatedAt,
                sessionId: entry?.sessionId,
                systemSent: entry?.systemSent,
                abortedLastRun: entry?.abortedLastRun,
                thinkingLevel: entry?.thinkingLevel,
                verboseLevel: entry?.verboseLevel,
                reasoningLevel: entry?.reasoningLevel,
                elevatedLevel: entry?.elevatedLevel,
                sendPolicy: entry?.sendPolicy,
                inputTokens: entry?.inputTokens,
                outputTokens: entry?.outputTokens,
                totalTokens: total,
                responseUsage: entry?.responseUsage,
                modelProvider: entry?.modelProvider,
                model: entry?.model,
                contextTokens: entry?.contextTokens,
                deliveryContext: deliveryFields.deliveryContext,
                lastChannel: deliveryFields.lastChannel ?? entry?.lastChannel,
                lastTo: deliveryFields.lastTo ?? entry?.lastTo,
                lastAccountId: deliveryFields.lastAccountId ?? entry?.lastAccountId,
            };
        })
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

    if (search) {
        sessions = sessions.filter((s) => {
            const fields = [s.displayName, s.label, s.subject, s.sessionId, s.key];
            return fields.some((f) => typeof f === "string" && f.toLowerCase().includes(search));
        });
    }

    if (activeMinutes !== undefined) {
        const cutoff = now - activeMinutes * 60_000;
        sessions = sessions.filter((s) => (s.updatedAt ?? 0) >= cutoff);
    }

    if (typeof opts.limit === "number" && Number.isFinite(opts.limit)) {
        const limit = Math.max(1, Math.floor(opts.limit));
        sessions = sessions.slice(0, limit);
    }

    const finalSessions: GatewaySessionRow[] = sessions.map((s) => {
        const { entry, ...rest } = s;
        let derivedTitle: string | undefined;
        let lastMessagePreview: string | undefined;
        if (entry?.sessionId) {
            if (includeDerivedTitles) {
                const firstUserMsg = readFirstUserMessageFromTranscript(
                    entry.sessionId,
                    storePath,
                    entry.sessionFile,
                );
                derivedTitle = deriveSessionTitle(entry, firstUserMsg);
            }
            if (includeLastMessage) {
                const lastMsg = readLastMessagePreviewFromTranscript(
                    entry.sessionId,
                    storePath,
                    entry.sessionFile,
                );
                if (lastMsg) lastMessagePreview = lastMsg;
            }
        }
        return { ...rest, derivedTitle, lastMessagePreview } satisfies GatewaySessionRow;
    });

    return {
        ts: now,
        path: storePath,
        count: finalSessions.length,
        defaults: getSessionDefaults(cfg),
        sessions: finalSessions,
    };
}
