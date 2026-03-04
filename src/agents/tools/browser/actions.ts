import {
    browserOpenTab,
    browserCloseTab,
    browserTabs,
    browserSnapshot,
} from "../../../browser/client.js";
import { browserNavigate, browserAct } from "../../../browser/client-actions-core.js";

export async function executeBrowserAction(action: string, args: any, baseUrl: string) {
    switch (action) {
        case "open_browser_url":
            return await browserNavigate(baseUrl, { url: args.url, profile: args.profile, targetId: args.tabId });
        case "click_browser_pixel":
            return await browserAct(baseUrl, { kind: "click", ref: "pixel", targetId: args.tabId }); // Simplified
        case "type_browser_text":
            return await browserAct(baseUrl, { kind: "type", text: args.text, ref: "input", targetId: args.tabId }); // Simplified
        case "refresh_browser_page":
            return await browserAct(baseUrl, { kind: "evaluate", fn: "location.reload()" });
        case "back_browser_page":
            return await browserAct(baseUrl, { kind: "evaluate", fn: "history.back()" });
        case "forward_browser_page":
            return await browserAct(baseUrl, { kind: "evaluate", fn: "history.forward()" });
        case "browser_snapshot":
            return await browserSnapshot(baseUrl, { format: "ai", ...args });
        case "browser_tabs":
            return await browserTabs(baseUrl, args);
        case "open_browser_tab":
            return await browserOpenTab(baseUrl, args.url, args);
        case "close_browser_tab":
            return await browserCloseTab(baseUrl, args.tabId, args);
        default:
            throw new Error(`Unknown browser action: ${action}`);
    }
}
