
import { resolveDefaultAgentId } from "../../agents/agent-scope.js";
import {
    canonicalizeMainSessionAlias,
    loadSessionStore,
    resolveMainSessionKey,
    resolveStorePath,
    type SessionEntry,
} from "../../config/sessions.js";
import { normalizeAgentId, parseAgentSessionKey, normalizeMainKey } from "../../routing/session-key.js";
import type { ZEROConfig } from "../../config/config.js";
import { listConfiguredAgentIds } from "./agents.js";

function canonicalizeSessionKeyForAgent(agentId: string, key: string): string {
    if (key === "global" || key === "unknown") return key;
    if (key.startsWith("agent:")) return key;
    return `agent:${normalizeAgentId(agentId)}:${key}`;
}

function resolveDefaultStoreAgentId(cfg: ZEROConfig): string {
    return normalizeAgentId(resolveDefaultAgentId(cfg));
}

export function resolveSessionStoreKey(params: { cfg: ZEROConfig; sessionKey: string }): string {
    const raw = params.sessionKey.trim();
    if (!raw) return raw;
    if (raw === "global" || raw === "unknown") return raw;

    const parsed = parseAgentSessionKey(raw);
    if (parsed) {
        const agentId = normalizeAgentId(parsed.agentId);
        const canonical = canonicalizeMainSessionAlias({
            cfg: params.cfg,
            agentId,
            sessionKey: raw,
        });
        if (canonical !== raw) return canonical;
        return raw;
    }

    const rawMainKey = normalizeMainKey(params.cfg.session?.mainKey);
    if (raw === "main" || raw === rawMainKey) {
        return resolveMainSessionKey(params.cfg);
    }
    const agentId = resolveDefaultStoreAgentId(params.cfg);
    return canonicalizeSessionKeyForAgent(agentId, raw);
}

export function resolveSessionStoreAgentId(cfg: ZEROConfig, canonicalKey: string): string {
    if (canonicalKey === "global" || canonicalKey === "unknown") {
        return resolveDefaultStoreAgentId(cfg);
    }
    const parsed = parseAgentSessionKey(canonicalKey);
    if (parsed?.agentId) return normalizeAgentId(parsed.agentId);
    return resolveDefaultStoreAgentId(cfg);
}

function canonicalizeSpawnedByForAgent(agentId: string, spawnedBy?: string): string | undefined {
    const raw = spawnedBy?.trim();
    if (!raw) return undefined;
    if (raw === "global" || raw === "unknown") return raw;
    if (raw.startsWith("agent:")) return raw;
    return `agent:${normalizeAgentId(agentId)}:${raw}`;
}

export function resolveGatewaySessionStoreTarget(params: { cfg: ZEROConfig; key: string }): {
    agentId: string;
    storePath: string;
    canonicalKey: string;
    storeKeys: string[];
} {
    const key = params.key.trim();
    const canonicalKey = resolveSessionStoreKey({
        cfg: params.cfg,
        sessionKey: key,
    });
    const agentId = resolveSessionStoreAgentId(params.cfg, canonicalKey);
    const storeConfig = params.cfg.session?.store;
    const storePath = resolveStorePath(storeConfig, { agentId });

    if (canonicalKey === "global" || canonicalKey === "unknown") {
        const storeKeys = key && key !== canonicalKey ? [canonicalKey, key] : [key];
        return { agentId, storePath, canonicalKey, storeKeys };
    }

    const storeKeys = new Set<string>();
    storeKeys.add(canonicalKey);
    if (key && key !== canonicalKey) storeKeys.add(key);
    return {
        agentId,
        storePath,
        canonicalKey,
        storeKeys: Array.from(storeKeys),
    };
}

function isStorePathTemplate(store?: string): boolean {
    return typeof store === "string" && store.includes("{agentId}");
}

export function loadCombinedSessionStoreForGateway(cfg: ZEROConfig): {
    storePath: string;
    store: Record<string, SessionEntry>;
} {
    const storeConfig = cfg.session?.store;
    if (storeConfig && !isStorePathTemplate(storeConfig)) {
        const storePath = resolveStorePath(storeConfig);
        const defaultAgentId = normalizeAgentId(resolveDefaultAgentId(cfg));
        const store = loadSessionStore(storePath);
        const combined: Record<string, SessionEntry> = {};
        for (const [key, entry] of Object.entries(store)) {
            const canonicalKey = canonicalizeSessionKeyForAgent(defaultAgentId, key);
            combined[canonicalKey] = {
                ...entry,
                spawnedBy: canonicalizeSpawnedByForAgent(defaultAgentId, entry.spawnedBy),
            };
        }
        return { storePath, store: combined };
    }

    const agentIds = listConfiguredAgentIds(cfg);
    const combined: Record<string, SessionEntry> = {};
    for (const agentId of agentIds) {
        const storePath = resolveStorePath(storeConfig, { agentId });
        const store = loadSessionStore(storePath);
        for (const [key, entry] of Object.entries(store)) {
            const canonicalKey = canonicalizeSessionKeyForAgent(agentId, key);
            const existing = combined[canonicalKey];
            combined[canonicalKey] = {
                ...existing,
                ...entry,
                spawnedBy: canonicalizeSpawnedByForAgent(agentId, entry.spawnedBy ?? (existing as any)?.spawnedBy),
            };
        }
    }

    const storePath =
        typeof storeConfig === "string" && storeConfig.trim() ? storeConfig.trim() : "(multiple)";
    return { storePath, store: combined };
}
