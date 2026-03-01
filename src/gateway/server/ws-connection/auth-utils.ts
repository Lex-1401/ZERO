import { GATEWAY_CLIENT_IDS } from "../../protocol/client-info.js";
import { isGatewayCliClient, isWebchatClient } from "../../../utils/message-channel.js";
import type { ResolvedGatewayAuth } from "../../auth.js";

/**
 * Kind of authentication provided by the client.
 */
export type AuthProvidedKind = "token" | "password" | "none";

/**
 * Formats a user-friendly error message for gateway authentication failures.
 *
 * @param params - Authentication mode, provided kind, reason, and client info.
 * @returns A formatted error string with helpful hints for the user.
 */
export function formatGatewayAuthFailureMessage(params: {
    authMode: ResolvedGatewayAuth["mode"];
    authProvided: AuthProvidedKind;
    reason?: string;
    client?: { id?: string | null; mode?: string | null };
}): string {
    const { authMode, authProvided, reason, client } = params;
    const isCli = isGatewayCliClient(client);
    const isControlUi = client?.id === GATEWAY_CLIENT_IDS.CONTROL_UI;
    const isWebchat = isWebchatClient(client);
    const uiHint = "open a tokenized dashboard URL or paste token in Control UI settings";
    const tokenHint = isCli
        ? "set gateway.remote.token to match gateway.auth.token"
        : isControlUi || isWebchat
            ? uiHint
            : "provide gateway auth token";
    const passwordHint = isCli
        ? "set gateway.remote.password to match gateway.auth.password"
        : isControlUi || isWebchat
            ? "enter the password in Control UI settings"
            : "provide gateway auth password";
    switch (reason) {
        case "token_missing":
            return `unauthorized: gateway token missing (${tokenHint})`;
        case "token_mismatch":
            return `unauthorized: gateway token mismatch (${tokenHint})`;
        case "token_missing_config":
            return "unauthorized: gateway token not configured on gateway (set gateway.auth.token)";
        case "password_missing":
            return `unauthorized: gateway password missing (${passwordHint})`;
        case "password_mismatch":
            return `unauthorized: gateway password mismatch (${passwordHint})`;
        case "password_missing_config":
            return "unauthorized: gateway password not configured on gateway (set gateway.auth.password)";
        case "tailscale_user_missing":
            return "unauthorized: tailscale identity missing (use Tailscale Serve auth or gateway token/password)";
        case "tailscale_proxy_missing":
            return "unauthorized: tailscale proxy headers missing (use Tailscale Serve or gateway token/password)";
        default:
            break;
    }

    if (authMode === "token" && authProvided === "none") {
        return `unauthorized: gateway token missing (${tokenHint})`;
    }
    if (authMode === "password" && authProvided === "none") {
        return `unauthorized: gateway password missing (${passwordHint})`;
    }
    return "unauthorized";
}
