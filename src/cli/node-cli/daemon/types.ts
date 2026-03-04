
export interface NodeDaemonInstallOptions {
    host?: string;
    port?: string | number;
    tls?: boolean;
    tlsFingerprint?: string;
    nodeId?: string;
    displayName?: string;
    runtime?: string;
    force?: boolean;
    json?: boolean;
}

export interface NodeDaemonLifecycleOptions {
    json?: boolean;
}

export interface NodeDaemonStatusOptions {
    json?: boolean;
}
