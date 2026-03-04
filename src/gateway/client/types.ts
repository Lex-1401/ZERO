
import type { HelloOk, EventFrame } from "../protocol/index.js";
import type { GatewayClientName, GatewayClientMode } from "../../utils/message-channel.js";
import type { DeviceIdentity } from "../../infra/device-identity.js";

export type Pending = {
    resolve: (value: unknown) => void;
    reject: (err: unknown) => void;
    expectFinal: boolean;
};

export type GatewayClientOptions = {
    url?: string;
    token?: string;
    password?: string;
    instanceId?: string;
    clientName?: GatewayClientName;
    clientDisplayName?: string;
    clientVersion?: string;
    platform?: string;
    mode?: GatewayClientMode;
    role?: string;
    scopes?: string[];
    caps?: string[];
    commands?: string[];
    permissions?: Record<string, boolean>;
    pathEnv?: string;
    deviceIdentity?: DeviceIdentity;
    minProtocol?: number;
    maxProtocol?: number;
    tlsFingerprint?: string;
    allowInsecureLocal?: boolean; // De uma versão anterior que parece útil
    disableReconnect?: boolean;
    eagerReconnect?: boolean;
    onEvent?: (evt: EventFrame) => void;
    onHelloOk?: (hello: HelloOk) => void;
    onConnectError?: (err: Error) => void;
    onClose?: (code: number, reason: string) => void;
    onGap?: (info: { expected: number; received: number }) => void;
};
