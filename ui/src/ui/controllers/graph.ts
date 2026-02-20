import type { AppViewState } from "../app-view-state";
import { parseAgentSessionKey } from "../../../../src/routing/session-key.js";

type GraphResponse = {
    ok: boolean;
    graph?: {
        nodes: Array<{ id: string; name: string; type: string; description?: string }>;
        edges: Array<{ source_id: string; target_id: string; relation: string }>;
    };
    error?: string;
};

export async function loadGraph(state: AppViewState) {
    if (state.graphLoading) return;
    state.graphLoading = true;
    state.graphError = null;
    state.requestUpdate?.();

    try {
        const list = state.agentsList?.agents ?? [];
        const parsed = parseAgentSessionKey(state.sessionKey);
        const agentId = parsed?.agentId ?? state.agentsList?.defaultId ?? "main";

        if (state.graphMode === "actions") {
            const sessions = state.sessionsResult?.sessions ?? [];
            state.graphData = buildActionGraph(sessions);
            state.graphLoading = false;
            state.requestUpdate?.();
            return;
        }

        // Construct API URL
        const url = `/api/memory/graph?agentId=${encodeURIComponent(agentId)}`;
        const token = state.client?.getToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(url, { headers });
        if (!res.ok) {
            throw new Error(`Graph fetch failed: ${res.statusText}`);
        }

        const data = await res.json() as GraphResponse;
        if (!data.ok) {
            throw new Error(data.error || "Unknown graph error");
        }

        state.graphData = data.graph ?? { nodes: [], edges: [] };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        state.graphData = null;
        state.graphError = msg;
    } finally {
        state.graphLoading = false;
        state.requestUpdate?.();
    }
}

export function buildActionGraph(sessions: Array<{ key: string; label?: string; spawnedBy?: string }>) {
    const nodes = sessions.map(s => ({
        id: s.key,
        name: s.label || s.key,
        type: "session"
    }));

    const edges = sessions
        .filter(s => s.spawnedBy)
        .map(s => ({
            source_id: s.spawnedBy!,
            target_id: s.key,
            relation: "spawns"
        }));

    return { nodes, edges };
}
