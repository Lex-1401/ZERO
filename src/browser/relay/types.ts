
export interface CdpCommand {
    id: number;
    method: string;
    params?: unknown;
    sessionId?: string;
}

export interface CdpResponse {
    id: number;
    result?: unknown;
    error?: { message: string };
    sessionId?: string;
}

export interface ExtensionMessage {
    id?: number;
    method: "forwardCDPCommand" | "forwardCDPEvent" | "ping" | "pong";
    params?: any;
}

export interface ChromeExtensionRelayServer {
    host: string;
    port: number;
    baseUrl: string;
    cdpWsUrl: string;
    extensionConnected: () => boolean;
    stop: () => Promise<void>;
}
