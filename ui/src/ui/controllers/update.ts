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

    // Fail-safe: release the UI after 45 seconds if the gateway doesn't come back
    const timeout = window.setTimeout(() => {
        if (state.updateRunning) {
            state.updateRunning = false;
        }
    }, 45000);

    try {
        // Note: this will cause a disconnection as the gateway restarts
        await state.client.request("update.run", {});
    } catch (err) {
        window.clearTimeout(timeout);
        state.updateStatusError = String(err);
        state.updateRunning = false;
    }
}

