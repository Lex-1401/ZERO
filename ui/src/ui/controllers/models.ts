import type { AppViewState } from "../app-view-state";

export async function loadModels(state: AppViewState) {
    if (!state.client || !state.connected) return;
    state.modelsLoading = true;
    try {
        const res = (await state.client.request("models.list", {})) as { models: unknown[] };
        state.models = res.models || [];
    } catch (err) {
        console.warn("failed to load models", err);
    } finally {
        state.modelsLoading = false;
    }
}
