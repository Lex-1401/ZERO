
import { type ProfileContext } from "../server-context.types.js";

export function createProfileContext(_opts: any, _profile: any): ProfileContext {
    const state = { running: null };
    const ctx: any = {
        getProfileState: () => state as any,
        setProfileRunning: (running: any) => { state.running = running; },
        listTabs: async () => [],
        openTab: async (_url: string) => ({ id: "default", _url }) as any,
        isReachable: async () => true,
        isHttpReachable: async () => true,
        attachRunning: (_running: any) => { },
        ensureBrowserAvailable: async () => { },
        ensureTabAvailable: async (_id?: string) => ({ id: "default" }) as any,
        focusTab: async (_id: string) => { },
        closeTab: async (_id: string) => { },
        stopRunningBrowser: async () => ({ stopped: true }),
        resetProfile: async () => ({ moved: false, from: "" }),
    };
    return ctx;
}
