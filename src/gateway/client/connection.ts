

import { PROTOCOL_VERSION, type ConnectParams } from "../protocol/index.js";
import { GATEWAY_CLIENT_NAMES, GATEWAY_CLIENT_MODES } from "../../utils/message-channel.js";
import {
    loadDeviceAuthToken,
    storeDeviceAuthToken,
    clearDeviceAuthToken,
} from "../../infra/device-auth-store.js";
import {
    publicKeyRawBase64UrlFromPem,
    signDevicePayload,
} from "../../infra/device-identity.js";
import { buildDeviceAuthPayload } from "../device-auth.js";
import type { GatewayClientOptions } from "./types.js";
import type { HelloOk } from "../protocol/index.js";

export function buildConnectParams(opts: GatewayClientOptions, nonce: string | null): ConnectParams {
    const role = opts.role ?? "operator";
    const storedToken = opts.deviceIdentity
        ? loadDeviceAuthToken({ deviceId: opts.deviceIdentity.deviceId, role })?.token
        : null;
    const authToken = storedToken ?? opts.token ?? undefined;

    const auth = (authToken || opts.password) ? {
        token: authToken,
        password: opts.password,
    } : undefined;

    const signedAtMs = Date.now();
    const scopes = opts.scopes ?? ["operator.admin"];

    const device = (() => {
        if (!opts.deviceIdentity) return undefined;
        const payload = buildDeviceAuthPayload({
            deviceId: opts.deviceIdentity.deviceId,
            clientId: opts.clientName ?? GATEWAY_CLIENT_NAMES.GATEWAY_CLIENT,
            clientMode: opts.mode ?? GATEWAY_CLIENT_MODES.BACKEND,
            role,
            scopes,
            signedAtMs,
            token: authToken ?? null,
            nonce: nonce ?? undefined,
        });
        const signature = signDevicePayload(opts.deviceIdentity.privateKeyPem, payload);
        return {
            id: opts.deviceIdentity.deviceId,
            publicKey: publicKeyRawBase64UrlFromPem(opts.deviceIdentity.publicKeyPem),
            signature,
            signedAt: signedAtMs,
            nonce: nonce ?? undefined,
        };
    })();

    return {
        minProtocol: opts.minProtocol ?? PROTOCOL_VERSION,
        maxProtocol: opts.maxProtocol ?? PROTOCOL_VERSION,
        client: {
            id: opts.clientName ?? GATEWAY_CLIENT_NAMES.GATEWAY_CLIENT,
            displayName: opts.clientDisplayName,
            version: opts.clientVersion ?? "dev",
            platform: opts.platform ?? process.platform,
            mode: opts.mode ?? GATEWAY_CLIENT_MODES.BACKEND,
            instanceId: opts.instanceId,
        },
        caps: Array.isArray(opts.caps) ? opts.caps : [],
        commands: Array.isArray(opts.commands) ? opts.commands : undefined,
        permissions: opts.permissions,
        pathEnv: opts.pathEnv,
        auth,
        role,
        scopes,
        device,
    };
}

export function handleHelloOk(opts: GatewayClientOptions, helloOk: HelloOk) {
    const authInfo = helloOk?.auth;
    const role = opts.role ?? "operator";
    if (authInfo?.deviceToken && opts.deviceIdentity) {
        storeDeviceAuthToken({
            deviceId: opts.deviceIdentity.deviceId,
            role: authInfo.role ?? role,
            token: authInfo.deviceToken,
            scopes: authInfo.scopes ?? [],
        });
    }
}

export function handleConnectFailure(opts: GatewayClientOptions, _err: any) {
    const role = opts.role ?? "operator";
    if (opts.token && opts.deviceIdentity) {
        clearDeviceAuthToken({
            deviceId: opts.deviceIdentity.deviceId,
            role,
        });
    }
}
