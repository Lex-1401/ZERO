import type { TelemetrySummary } from "../types";
import type { GatewayBrowserClient } from "../gateway";

export type TelemetryState = {
    client: GatewayBrowserClient | null;
    connected: boolean;
    missionControlLoading: boolean;
    missionControlSummary: TelemetrySummary | null;
};

export async function loadMissionControl(state: TelemetryState) {
    if (!state.client || !state.connected) return;
    if (state.missionControlLoading) return;

    state.missionControlLoading = true;
    try {
        const summary = await state.client.request<TelemetrySummary>("telemetry.summary", {});
        state.missionControlSummary = summary;
    } catch (err) {
        console.error("[telemetry] load failed:", err);
    } finally {
        state.missionControlLoading = false;
    }
}
