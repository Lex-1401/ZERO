
export type DevicePairingPendingRequest = {
    requestId: string;
    deviceId: string;
    publicKey: string;
    displayName?: string;
    platform?: string;
    clientId?: string;
    clientMode?: string;
    role?: string;
    roles?: string[];
    scopes?: string[];
    remoteIp?: string;
    silent?: boolean;
    isRepair?: boolean;
    ts: number;
};

export type DeviceAuthToken = {
    token: string;
    role: string;
    scopes: string[];
    createdAtMs: number;
    rotatedAtMs?: number;
    revokedAtMs?: number;
    lastUsedAtMs?: number;
};

export type DeviceAuthTokenSummary = {
    role: string;
    scopes: string[];
    createdAtMs: number;
    rotatedAtMs?: number;
    revokedAtMs?: number;
    lastUsedAtMs?: number;
};

export type PairedDevice = {
    deviceId: string;
    publicKey: string;
    displayName?: string;
    platform?: string;
    clientId?: string;
    clientMode?: string;
    role?: string;
    roles?: string[];
    scopes?: string[];
    remoteIp?: string;
    tokens?: Record<string, DeviceAuthToken>;
    createdAtMs: number;
    approvedAtMs: number;
};

export type DevicePairingList = {
    pending: DevicePairingPendingRequest[];
    paired: PairedDevice[];
};

export type DevicePairingStateFile = {
    pendingById: Record<string, DevicePairingPendingRequest>;
    pairedByDeviceId: Record<string, PairedDevice>;
};
