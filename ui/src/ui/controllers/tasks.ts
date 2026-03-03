import type { AppViewState } from "../app-view-state";
import type { TaskRecord } from "../views/tasks";

export async function loadTasks(state: AppViewState) {
    if (!state.client || state.taskStore.loading) return;
    state.taskStore.loading = true;
    state.requestUpdate?.();

    try {
        const list = await state.client.request<TaskRecord[]>("tasks.list", {});
        state.taskStore.list = list;
        state.taskStore.error = null;
    } catch (err) {
        state.taskStore.error = String(err);
    } finally {
        state.taskStore.loading = false;
        state.requestUpdate?.();
    }
}
