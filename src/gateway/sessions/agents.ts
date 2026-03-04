
import fs from "node:fs";
import path from "node:path";
import { resolveDefaultAgentId } from "../../agents/agent-scope.js";
import { resolveStateDir } from "../../config/paths.js";
import { normalizeAgentId, normalizeMainKey } from "../../routing/session-key.js";
import type { ZEROConfig } from "../../config/config.js";
import { resolveIdentityAvatarUrl } from "./avatar.js";
import type { GatewayAgentRow } from "./types.js";

function listExistingAgentIdsFromDisk(): string[] {
    const root = resolveStateDir();
    const agentsDir = path.join(root, "agents");
    try {
        const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
        return entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => normalizeAgentId(entry.name))
            .filter(Boolean);
    } catch {
        return [];
    }
}

export function listConfiguredAgentIds(cfg: ZEROConfig): string[] {
    const agents = cfg.agents?.list ?? [];
    if (agents.length > 0) {
        const ids = new Set<string>();
        for (const entry of agents) {
            if (entry?.id) ids.add(normalizeAgentId(entry.id));
        }
        const defaultId = normalizeAgentId(resolveDefaultAgentId(cfg));
        ids.add(defaultId);
        const sorted = Array.from(ids).filter(Boolean);
        sorted.sort((a, b) => a.localeCompare(b));
        return sorted.includes(defaultId)
            ? [defaultId, ...sorted.filter((id) => id !== defaultId)]
            : sorted;
    }

    const ids = new Set<string>();
    const defaultId = normalizeAgentId(resolveDefaultAgentId(cfg));
    ids.add(defaultId);
    for (const id of listExistingAgentIdsFromDisk()) ids.add(id);
    const sorted = Array.from(ids).filter(Boolean);
    sorted.sort((a, b) => a.localeCompare(b));
    if (sorted.includes(defaultId)) {
        return [defaultId, ...sorted.filter((id) => id !== defaultId)];
    }
    return sorted;
}

export function listAgentsForGateway(cfg: ZEROConfig): {
    defaultId: string;
    mainKey: string;
    scope: any;
    agents: GatewayAgentRow[];
} {
    const defaultId = normalizeAgentId(resolveDefaultAgentId(cfg));
    const mainKey = normalizeMainKey(cfg.session?.mainKey);
    const scope = cfg.session?.scope ?? "per-sender";
    const configuredById = new Map<
        string,
        {
            name?: string;
            role?: string;
            capabilities?: string[];
            identity?: GatewayAgentRow["identity"];
        }
    >();
    for (const entry of cfg.agents?.list ?? []) {
        if (!entry?.id) continue;
        const identity = entry.identity
            ? {
                name: entry.identity.name?.trim() || undefined,
                theme: entry.identity.theme?.trim() || undefined,
                emoji: entry.identity.emoji?.trim() || undefined,
                avatar: entry.identity.avatar?.trim() || undefined,
                avatarUrl: resolveIdentityAvatarUrl(
                    cfg,
                    normalizeAgentId(entry.id),
                    entry.identity.avatar?.trim(),
                ),
            }
            : undefined;
        configuredById.set(normalizeAgentId(entry.id), {
            name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : undefined,
            role: typeof entry.role === "string" && entry.role.trim() ? entry.role.trim() : undefined,
            capabilities: Array.isArray(entry.capabilities) ? entry.capabilities : undefined,
            identity,
        });
    }
    const explicitIds = new Set(
        (cfg.agents?.list ?? [])
            .map((entry) => (entry?.id ? normalizeAgentId(entry.id) : ""))
            .filter(Boolean),
    );
    const allowedIds = explicitIds.size > 0 ? new Set([...explicitIds, defaultId]) : null;
    let agentIds = listConfiguredAgentIds(cfg).filter((id) =>
        allowedIds ? allowedIds.has(id) : true,
    );
    if (mainKey && !agentIds.includes(mainKey)) {
        agentIds = [...agentIds, mainKey];
    }
    const agents = agentIds.map((id) => {
        const meta = configuredById.get(id);
        return {
            id,
            name: meta?.name,
            role: meta?.role,
            capabilities: meta?.capabilities,
            identity: meta?.identity,
        };
    });
    return { defaultId, mainKey, scope, agents };
}
