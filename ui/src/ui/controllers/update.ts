import type { GatewayBrowserClient } from "../gateway";
import type { UpdateCheckResult } from "../types";

export type UpdateState = {
    client: GatewayBrowserClient | null;
    connected: boolean;
    updateStatusLoading: boolean;
    updateStatus: UpdateCheckResult | null;
    updateStatusError: string | null;
    updateRunning: boolean;
};

export async function loadUpdateStatus(state: UpdateState, opts: { fetchGit?: boolean } = {}) {
    if (!state.client || !state.connected) return;
    state.updateStatusLoading = true;
    state.updateStatusError = null;
    try {
        const res = (await state.client.request("update.status", {
            fetchGit: opts.fetchGit,
        })) as UpdateCheckResult;
        state.updateStatus = res;
    } catch (err) {
        state.updateStatusError = String(err);
    } finally {
        state.updateStatusLoading = false;
    }
}

export async function runSoftwareUpdate(state: UpdateState) {
    if (!state.client || !state.connected) return;
    state.updateRunning = true;
    try {
        // Note: this will cause a disconnection as the gateway restarts
        await state.client.request("update.run", {});
    } catch (err) {
        state.updateStatusError = String(err);
        state.updateRunning = false;
    }
}
