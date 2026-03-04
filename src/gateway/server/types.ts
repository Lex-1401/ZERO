
export interface GatewayServer {
    close: (opts?: { reason?: string; restartExpectedMs?: number | null }) => Promise<void>;
}

export interface GatewayServerOptions {
    bind?: string;
    host?: string;
    controlUiEnabled?: boolean;
}
