
export type JITAuthRequest = {
    pluginId: string;
    toolName: string;
    error: any;
};

export function detectAuthRequirement(error: any): string | null {
    const msg = String(error).toLowerCase();
    if (msg.includes("unauthorized") || msg.includes("401") || msg.includes("invalid token") || msg.includes("credentials missing")) {
        // Try to find a redirect URL in the error message if provided by the plugin
        const match = msg.match(/https?:\/\/[^\s]+/);
        return match ? match[0] : "PENDING_AUTH";
    }
    return null;
}

export function buildAuthLink(pluginId: string, _baseUrl: string = "http://localhost:18789"): string {
    // Generate a local redirect link that the user can click
    return `[Authorize ${pluginId}](http://localhost:18789/auth/${pluginId}/start)`;
}
