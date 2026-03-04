/**
 * Browser Route Context
 *
 * Creates the multi-profile browser routing context with legacy compatibility.
 * Extracted from server-context.ts for Atomic Modularity (< 500 lines).
 *
 * @module browser/route-context
 */

import { isChromeReachable } from "./chrome.js";
import { resolveProfile } from "./config.js";
import type {
    BrowserRouteContext,
    BrowserTab,
    ContextOptions,
    ProfileContext,
    ProfileStatus,
} from "./server-context.types.js";
import { createProfileContext } from "./server-context.js";

export function createBrowserRouteContext(opts: ContextOptions): BrowserRouteContext {
    const state = () => {
        const current = opts.getState();
        if (!current) throw new Error("Browser server not started");
        return current;
    };

    const forProfile = (profileName?: string): ProfileContext => {
        const current = state();
        const name = profileName ?? current.resolved.defaultProfile;
        const profile = resolveProfile(current.resolved, name);
        if (!profile) {
            const available = Object.keys(current.resolved.profiles).join(", ");
            throw new Error(`Profile "${name}" not found. Available profiles: ${available || "(none)"}`);
        }
        return createProfileContext(opts, profile);
    };

    const listProfiles = async (): Promise<ProfileStatus[]> => {
        const current = state();
        const result: ProfileStatus[] = [];

        for (const name of Object.keys(current.resolved.profiles)) {
            const profileState = current.profiles.get(name);
            const profile = resolveProfile(current.resolved, name);
            if (!profile) continue;

            let tabCount = 0;
            let running = false;

            if (profileState?.running) {
                running = true;
                try {
                    const ctx = createProfileContext(opts, profile);
                    const tabs = await ctx.listTabs();
                    tabCount = tabs.filter((t: BrowserTab) => t.type === "page").length;
                } catch {
                    // Browser might not be responsive
                }
            } else {
                // Check if something is listening on the port
                try {
                    const reachable = await isChromeReachable(profile.cdpUrl, 200);
                    if (reachable) {
                        running = true;
                        const ctx = createProfileContext(opts, profile);
                        const tabs = await ctx.listTabs().catch(() => []);
                        tabCount = tabs.filter((t: BrowserTab) => t.type === "page").length;
                    }
                } catch {
                    // Not reachable
                }
            }

            result.push({
                name,
                cdpPort: profile.cdpPort,
                cdpUrl: profile.cdpUrl,
                color: profile.color,
                running,
                tabCount,
                isDefault: name === current.resolved.defaultProfile,
                isRemote: !profile.cdpIsLoopback,
            });
        }

        return result;
    };

    // Create default profile context for backward compatibility
    const getDefaultContext = () => forProfile();

    const mapTabError = (err: unknown) => {
        const msg = String(err);
        if (msg.includes("ambiguous target id prefix")) {
            return { status: 409, message: "ambiguous target id prefix" };
        }
        if (msg.includes("tab not found")) {
            return { status: 404, message: msg };
        }
        if (msg.includes("not found")) {
            return { status: 404, message: msg };
        }
        return null;
    };

    return {
        state,
        forProfile,
        listProfiles,
        // Legacy methods delegate to default profile
        ensureBrowserAvailable: () => getDefaultContext().ensureBrowserAvailable(),
        ensureTabAvailable: (targetId) => getDefaultContext().ensureTabAvailable(targetId),
        isHttpReachable: (timeoutMs) => getDefaultContext().isHttpReachable(timeoutMs),
        isReachable: (timeoutMs) => getDefaultContext().isReachable(timeoutMs),
        listTabs: () => getDefaultContext().listTabs(),
        openTab: (url) => getDefaultContext().openTab(url),
        focusTab: (targetId) => getDefaultContext().focusTab(targetId),
        closeTab: (targetId) => getDefaultContext().closeTab(targetId),
        stopRunningBrowser: () => getDefaultContext().stopRunningBrowser(),
        resetProfile: () => getDefaultContext().resetProfile(),
        mapTabError,
    };
}
