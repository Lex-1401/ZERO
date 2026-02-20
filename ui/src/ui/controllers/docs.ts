import type { GatewayBrowserClient } from "../gateway";

export type DocEntry = {
    id: string;
    name: string;
};

export type DocsState = {
    client: GatewayBrowserClient | null;
    connected: boolean;
    docsLoading: boolean;
    docsList: DocEntry[];
    docsSelectedId: string | null;
    docsContent: string | null;
    docsError: string | null;
};

export async function loadDocsList(state: DocsState) {
    if (!state.client || !state.connected) return;
    if (state.docsLoading) return;
    state.docsLoading = true;
    state.docsError = null;
    try {
        const res = (await state.client.request("docs.list", {})) as { docs: DocEntry[] } | undefined;
        if (res) {
            state.docsList = res.docs;
            // Select first doc if none selected
            if (!state.docsSelectedId && res.docs.length > 0) {
                state.docsSelectedId = res.docs[0].id;
                void loadDocContent(state, res.docs[0].id);
            }
        }
    } catch (err) {
        state.docsError = String(err);
    } finally {
        state.docsLoading = false;
    }
}

export async function loadDocContent(state: DocsState, id: string) {
    if (!state.client || !state.connected) return;
    state.docsSelectedId = id;
    state.docsLoading = true;
    state.docsError = null;
    try {
        const res = (await state.client.request("docs.get", { id })) as { content: string } | undefined;
        if (res) state.docsContent = res.content;
    } catch (err) {
        state.docsError = String(err);
    } finally {
        state.docsLoading = false;
    }
}
