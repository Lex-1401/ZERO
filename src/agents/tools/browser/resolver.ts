
import { type BrowserNodeTarget } from "./types.js";

export async function resolveBrowserBaseUrl(params: {
    target?: "sandbox" | "host" | "custom";
    controlUrl?: string;
    defaultControlUrl?: string;
    allowHostControl?: boolean;
}): Promise<string> {
    const { target, controlUrl, defaultControlUrl, allowHostControl } = params;
    if (target === "host") {
        if (!allowHostControl) throw new Error("Host control not allowed.");
        return "http://localhost:3000"; // Simplified
    }
    if (target === "custom" && controlUrl) return controlUrl;
    return defaultControlUrl || "http://localhost:3000";
}

export async function resolveBrowserNodeTarget(params: {
    requestedNode?: string;
    target?: "sandbox" | "host" | "custom" | "node";
    controlUrl?: string;
    defaultControlUrl?: string;
}): Promise<BrowserNodeTarget | null> {
    const { requestedNode } = params;
    if (!requestedNode) return null;
    return { nodeId: requestedNode, label: "default" };
}
