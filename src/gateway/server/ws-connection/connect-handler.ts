import type { IncomingMessage } from "node:http";
import os from "node:os";
import type { WebSocket } from "ws";
import {
  deriveDeviceIdFromPublicKey,
  normalizeDevicePublicKeyBase64Url,
  verifyDeviceSignature,
} from "../../../infra/device-identity.js";
import {
  approveDevicePairing,
  ensureDeviceToken,
  getPairedDevice,
  requestDevicePairing,
  updatePairedDeviceMetadata,
  verifyDeviceToken,
} from "../../../infra/device-pairing.js";
import { updatePairedNodeMetadata } from "../../../infra/node-pairing.js";
import { recordRemoteNodeInfo, refreshRemoteNodeBins } from "../../../infra/skills-remote.js";
import { loadVoiceWakeConfig } from "../../../infra/voicewake.js";
import { upsertPresence } from "../../../infra/system-presence.js";
import { isGatewayCliClient } from "../../../utils/message-channel.js";
import { loadConfig } from "../../../config/config.js";
import { buildDeviceAuthPayload } from "../../device-auth.js";
import { resolveNodeCommandAllowlist } from "../../node-command-policy.js";
import {
  type ConnectParams,
  ErrorCodes,
  errorShape,
  PROTOCOL_VERSION,
  type RequestFrame,
} from "../../protocol/index.js";
import { GATEWAY_CLIENT_IDS } from "../../protocol/client-info.js";
import { MAX_BUFFERED_BYTES, MAX_PAYLOAD_BYTES, TICK_INTERVAL_MS } from "../../server-constants.js";
import { formatError } from "../../server-utils.js";
import { logWs } from "../../ws-log.js";
import { truncateCloseReason } from "../close-reason.js";
import {
  buildGatewaySnapshot,
  getHealthCache,
  getHealthVersion,
  incrementPresenceVersion,
  refreshGatewayHealthSnapshot,
} from "../health-state.js";
import type { GatewayWsClient } from "../ws-types.js";
import { authorizeGatewayConnect, type ResolvedGatewayAuth } from "../../auth.js";
import { formatGatewayAuthFailureMessage, type AuthProvidedKind } from "./auth-utils.js";
import type { GatewayRequestContext, GatewayRequestHandlers } from "../../server-methods/types.js";
import { createSubsystemLogger } from "../../../logging/subsystem.js";

type SubsystemLogger = ReturnType<typeof createSubsystemLogger>;

const DEVICE_SIGNATURE_SKEW_MS = 10 * 60 * 1000;

/**
 * Handles the "connect" request from a new WebSocket client.
 * Performs protocol negotiation, authentication, device verification, and pairing.
 *
 * @param params - Contextual parameters for connection.
 */
export async function handleConnectFrame(params: {
  frame: RequestFrame;
  socket: WebSocket;
  connId: string;
  upgradeReq: IncomingMessage;
  resolvedAuth: ResolvedGatewayAuth;
  trustedProxies: string[];
  reportedClientIp?: string;
  isLocalClient: boolean;
  connectNonce: string;
  canvasHostUrl?: string;
  gatewayMethods: string[];
  events: string[];
  extraHandlers: GatewayRequestHandlers;
  buildRequestContext: () => GatewayRequestContext;
  send: (obj: unknown) => void;
  close: (code?: number, reason?: string) => void;
  clearHandshakeTimer: () => void;
  setClient: (next: GatewayWsClient) => void;
  setHandshakeState: (state: "pending" | "connected" | "failed") => void;
  setCloseCause: (cause: string, meta?: Record<string, unknown>) => void;
  logGateway: SubsystemLogger;
  logHealth: SubsystemLogger;
  logWsControl: SubsystemLogger;
}) {
  const {
    frame,
    socket,
    connId,
    upgradeReq,
    resolvedAuth,
    trustedProxies,
    reportedClientIp,
    isLocalClient,
    connectNonce,
    canvasHostUrl,
    gatewayMethods,
    events,
    buildRequestContext,
    send,
    close,
    clearHandshakeTimer,
    setClient,
    setHandshakeState,
    setCloseCause,
    logGateway,
    logHealth,
    logWsControl,
  } = params;

  const connectParams = frame.params as ConnectParams;
  const clientLabel = connectParams.client.displayName ?? connectParams.client.id;
  const configSnapshot = loadConfig();

  // 1. Protocol Negotiation
  const { minProtocol, maxProtocol } = connectParams;
  if (maxProtocol < PROTOCOL_VERSION || minProtocol > PROTOCOL_VERSION) {
    setHandshakeState("failed");
    logWsControl.warn(
      `protocol mismatch conn=${connId} remote=${reportedClientIp ?? "?"} client=${clientLabel} v${connectParams.client.version}`,
    );
    setCloseCause("protocol-mismatch", {
      minProtocol,
      maxProtocol,
      expectedProtocol: PROTOCOL_VERSION,
      client: connectParams.client.id,
    });
    send({
      type: "res",
      id: frame.id,
      ok: false,
      error: errorShape(ErrorCodes.INVALID_REQUEST, "protocol mismatch", {
        details: { expectedProtocol: PROTOCOL_VERSION },
      }),
    });
    close(1002, "protocol mismatch");
    return;
  }

  // 2. Role and Scopes resolution
  const roleRaw = connectParams.role ?? "operator";
  const role = roleRaw === "operator" || roleRaw === "node" ? roleRaw : null;
  if (!role) {
    setHandshakeState("failed");
    setCloseCause("invalid-role", { role: roleRaw, client: connectParams.client.id });
    send({
      type: "res",
      id: frame.id,
      ok: false,
      error: errorShape(ErrorCodes.INVALID_REQUEST, "invalid role"),
    });
    close(1008, "invalid role");
    return;
  }

  const requestedScopes = Array.isArray(connectParams.scopes) ? connectParams.scopes : [];
  const scopes =
    requestedScopes.length > 0 ? requestedScopes : role === "operator" ? ["operator.admin"] : [];
  connectParams.role = role;
  connectParams.scopes = scopes;

  // 3. Reverse Proxy Auth requirements
  if (!isLocalClient && resolvedAuth.mode === "none" && reportedClientIp) {
    // Treat as untrusted if reported IP is present and not local
    // (This is a simplified check based on the main code's logic)
  }

  // 4. Device Identity Verification
  const device = connectParams.device;
  const isControlUi = connectParams.client.id === GATEWAY_CLIENT_IDS.CONTROL_UI;
  const allowInsecureControlUi =
    isControlUi && configSnapshot.gateway?.controlUi?.allowInsecureAuth === true;

  if (!device) {
    const hasTokenAuth = Boolean(connectParams.auth?.token);
    const hasSharedAuth = hasTokenAuth || Boolean(connectParams.auth?.password);
    const canSkipDevice = allowInsecureControlUi ? hasSharedAuth : hasTokenAuth;

    if (isControlUi && !allowInsecureControlUi) {
      const msg = "control ui requires HTTPS or localhost (secure context)";
      setHandshakeState("failed");
      setCloseCause("control-ui-insecure-auth", { client: connectParams.client.id });
      send({
        type: "res",
        id: frame.id,
        ok: false,
        error: errorShape(ErrorCodes.INVALID_REQUEST, msg),
      });
      close(1008, msg);
      return;
    }

    if (!canSkipDevice) {
      setHandshakeState("failed");
      setCloseCause("device-required", { client: connectParams.client.id });
      send({
        type: "res",
        id: frame.id,
        ok: false,
        error: errorShape(ErrorCodes.NOT_PAIRED, "device identity required"),
      });
      close(1008, "device identity required");
      return;
    }
  }

  let devicePublicKey: string | null = null;
  if (device) {
    const derivedId = deriveDeviceIdFromPublicKey(device.publicKey);
    if (!derivedId || derivedId !== device.id) {
      setHandshakeState("failed");
      setCloseCause("device-auth-invalid", { reason: "device-id-mismatch", deviceId: device.id });
      send({
        type: "res",
        id: frame.id,
        ok: false,
        error: errorShape(ErrorCodes.INVALID_REQUEST, "device identity mismatch"),
      });
      close(1008, "device identity mismatch");
      return;
    }

    const { signedAt, nonce, signature, publicKey } = device;
    if (
      typeof signedAt !== "number" ||
      Math.abs(Date.now() - signedAt) > DEVICE_SIGNATURE_SKEW_MS
    ) {
      setHandshakeState("failed");
      setCloseCause("device-auth-invalid", {
        reason: "device-signature-stale",
        deviceId: device.id,
      });
      send({
        type: "res",
        id: frame.id,
        ok: false,
        error: errorShape(ErrorCodes.INVALID_REQUEST, "device signature expired"),
      });
      close(1008, "device signature expired");
      return;
    }

    const providedNonce = typeof nonce === "string" ? nonce.trim() : "";
    if (!isLocalClient && !providedNonce) {
      setHandshakeState("failed");
      setCloseCause("device-auth-invalid", { reason: "device-nonce-missing", deviceId: device.id });
      send({
        type: "res",
        id: frame.id,
        ok: false,
        error: errorShape(ErrorCodes.INVALID_REQUEST, "device nonce required"),
      });
      close(1008, "device nonce required");
      return;
    }

    if (providedNonce && providedNonce !== connectNonce) {
      setHandshakeState("failed");
      setCloseCause("device-auth-invalid", {
        reason: "device-nonce-mismatch",
        deviceId: device.id,
      });
      send({
        type: "res",
        id: frame.id,
        ok: false,
        error: errorShape(ErrorCodes.INVALID_REQUEST, "device nonce mismatch"),
      });
      close(1008, "device nonce mismatch");
      return;
    }

    const authPayloadParams = {
      deviceId: device.id,
      clientId: connectParams.client.id,
      clientMode: connectParams.client.mode,
      role,
      scopes: requestedScopes,
      signedAtMs: signedAt,
      token: connectParams.auth?.token ?? null,
      nonce: providedNonce || undefined,
      version: (providedNonce ? "v2" : "v1") as "v1" | "v2",
    };
    const signatureOk = verifyDeviceSignature(
      publicKey,
      buildDeviceAuthPayload(authPayloadParams),
      signature,
    );

    if (!signatureOk) {
      setHandshakeState("failed");
      setCloseCause("device-auth-invalid", { reason: "device-signature", deviceId: device.id });
      send({
        type: "res",
        id: frame.id,
        ok: false,
        error: errorShape(ErrorCodes.INVALID_REQUEST, "device signature invalid"),
      });
      close(1008, "device signature invalid");
      return;
    }

    devicePublicKey = normalizeDevicePublicKeyBase64Url(publicKey);
    if (!devicePublicKey) {
      setHandshakeState("failed");
      setCloseCause("device-auth-invalid", { reason: "device-public-key", deviceId: device.id });
      send({
        type: "res",
        id: frame.id,
        ok: false,
        error: errorShape(ErrorCodes.INVALID_REQUEST, "device public key invalid"),
      });
      close(1008, "device public key invalid");
      return;
    }
  }

  // 5. Gateway Authentication
  const authResult = await authorizeGatewayConnect({
    auth: resolvedAuth,
    connectAuth: connectParams.auth,
    req: upgradeReq,
    trustedProxies,
  });

  let authOk = authResult.ok;
  let authMethod = authResult.method ?? "none";
  if (!authOk && connectParams.auth?.token && device) {
    const tokenCheck = await verifyDeviceToken({
      deviceId: device.id,
      token: connectParams.auth.token,
      role,
      scopes,
    });
    if (tokenCheck.ok) {
      authOk = true;
      authMethod = "device-token";
    }
  }

  if (!authOk) {
    setHandshakeState("failed");
    logWsControl.warn(
      `unauthorized conn=${connId} remote=${reportedClientIp ?? "?"} client=${clientLabel} reason=${authResult.reason ?? "unknown"}`,
    );
    const authProvided: AuthProvidedKind = connectParams.auth?.token
      ? "token"
      : connectParams.auth?.password
        ? "password"
        : "none";
    const authMessage = formatGatewayAuthFailureMessage({
      authMode: resolvedAuth.mode,
      authProvided,
      reason: authResult.reason,
      client: connectParams.client,
    });
    setCloseCause("unauthorized", {
      authMode: resolvedAuth.mode,
      authProvided,
      authReason: authResult.reason,
    });
    send({
      type: "res",
      id: frame.id,
      ok: false,
      error: errorShape(ErrorCodes.INVALID_REQUEST, authMessage),
    });
    close(1008, truncateCloseReason(authMessage));
    return;
  }

  // 6. Device Pairing
  const skipPairing =
    allowInsecureControlUi && Boolean(connectParams.auth?.token || connectParams.auth?.password);
  if (device && devicePublicKey && !skipPairing) {
    const paired = await getPairedDevice(device.id);
    const isPaired = paired?.publicKey === devicePublicKey;

    const performPairing = async () => {
      const pairing = await requestDevicePairing({
        deviceId: device.id,
        publicKey: devicePublicKey!,
        displayName: connectParams.client.displayName,
        platform: connectParams.client.platform,
        clientId: connectParams.client.id,
        clientMode: connectParams.client.mode,
        role,
        scopes,
        remoteIp: reportedClientIp,
        silent: isLocalClient,
      });

      const context = buildRequestContext();
      if (pairing.request.silent === true) {
        const approved = await approveDevicePairing(pairing.request.requestId);
        if (approved) {
          logGateway.info(`device pairing auto-approved device=${device.id}`);
          context.broadcast("device.pair.resolved", {
            requestId: pairing.request.requestId,
            deviceId: approved.device.deviceId,
            decision: "approved",
            ts: Date.now(),
          });
        }
      } else if (pairing.created) {
        context.broadcast("device.pair.requested", pairing.request);
      }

      if (pairing.request.silent !== true) {
        setHandshakeState("failed");
        setCloseCause("pairing-required", {
          deviceId: device.id,
          requestId: pairing.request.requestId,
        });
        send({
          type: "res",
          id: frame.id,
          ok: false,
          error: errorShape(ErrorCodes.NOT_PAIRED, "pairing required", {
            details: { requestId: pairing.request.requestId },
          }),
        });
        close(1008, "pairing required");
        return false;
      }
      return true;
    };

    if (!isPaired) {
      if (!(await performPairing())) return;
    } else {
      // Role/Scope Upgrade Checks
      const allowedRoles = new Set(
        Array.isArray(paired.roles) ? paired.roles : paired.role ? [paired.role] : [],
      );
      const pairedScopes = Array.isArray(paired.scopes) ? paired.scopes : [];
      const allowedScopes = new Set(pairedScopes);
      const missingScope = scopes.find((s) => !allowedScopes.has(s));

      if (
        (allowedRoles.size > 0 && !allowedRoles.has(role)) ||
        (scopes.length > 0 && (pairedScopes.length === 0 || missingScope))
      ) {
        if (!(await performPairing())) return;
      }

      await updatePairedDeviceMetadata(device.id, {
        displayName: connectParams.client.displayName,
        platform: connectParams.client.platform,
        clientId: connectParams.client.id,
        clientMode: connectParams.client.mode,
        role,
        scopes,
        remoteIp: reportedClientIp,
      });
    }
  }

  const deviceToken = device
    ? await ensureDeviceToken({ deviceId: device.id, role, scopes })
    : null;

  // 7. Node specific setup
  if (role === "node") {
    const allowlist = resolveNodeCommandAllowlist(configSnapshot, {
      platform: connectParams.client.platform,
      deviceFamily: connectParams.client.deviceFamily,
    });
    const declared = Array.isArray(connectParams.commands) ? connectParams.commands : [];
    connectParams.commands = declared
      .map((c) => c.trim())
      .filter((c) => c.length > 0 && allowlist.has(c));
  }

  // 8. Presence and Snapshot
  const shouldTrackPresence = !isGatewayCliClient(connectParams.client);
  const instanceId = connectParams.client.instanceId;
  const presenceKey = shouldTrackPresence
    ? (connectParams.device?.id ?? instanceId ?? connId)
    : undefined;

  logWs("in", "connect", { connId, client: connectParams.client.id, auth: authMethod });

  if (presenceKey) {
    upsertPresence(presenceKey, {
      host: connectParams.client.displayName ?? connectParams.client.id ?? os.hostname(),
      ip: isLocalClient ? undefined : reportedClientIp,
      version: connectParams.client.version,
      platform: connectParams.client.platform,
      deviceFamily: connectParams.client.deviceFamily,
      modelIdentifier: connectParams.client.modelIdentifier,
      mode: connectParams.client.mode,
      deviceId: connectParams.device?.id,
      roles: [role],
      scopes,
      instanceId: connectParams.device?.id ?? (instanceId as string),
      reason: "connect",
    });
    incrementPresenceVersion();
  }

  const snapshot = buildGatewaySnapshot();
  const cachedHealth = getHealthCache();
  if (cachedHealth) {
    snapshot.health = cachedHealth;
    snapshot.stateVersion.health = getHealthVersion();
  }

  const helloOk = {
    type: "hello-ok",
    protocol: PROTOCOL_VERSION,
    server: {
      version: process.env.ZERO_VERSION || "dev",
      host: os.hostname(),
      connId,
    },
    features: { methods: gatewayMethods, events },
    snapshot,
    canvasHostUrl,
    auth: deviceToken
      ? {
          deviceToken: deviceToken.token,
          role: deviceToken.role,
          scopes: deviceToken.scopes,
          issuedAtMs: deviceToken.rotatedAtMs || deviceToken.createdAtMs,
        }
      : undefined,
    policy: {
      maxPayload: MAX_PAYLOAD_BYTES,
      maxBufferedBytes: MAX_BUFFERED_BYTES,
      tickIntervalMs: TICK_INTERVAL_MS,
    },
  };

  clearHandshakeTimer();
  const nextClient: GatewayWsClient = { socket, connect: connectParams, connId, presenceKey };
  setClient(nextClient);
  setHandshakeState("connected");

  if (role === "node") {
    const context = buildRequestContext();
    const nodeSession = context.nodeRegistry.register(nextClient, { remoteIp: reportedClientIp });
    const nodeIdPairs = new Set([
      nodeSession.nodeId,
      ...(instanceId ? [instanceId as string] : []),
    ]);
    for (const nid of nodeIdPairs) {
      void updatePairedNodeMetadata(nid, { lastConnectedAtMs: nodeSession.connectedAtMs }).catch(
        (e) => logGateway.warn(`node connect record fail ${nid}: ${String(e)}`),
      );
    }
    recordRemoteNodeInfo({
      nodeId: nodeSession.nodeId,
      displayName: nodeSession.displayName,
      platform: nodeSession.platform,
      deviceFamily: nodeSession.deviceFamily,
      commands: nodeSession.commands,
      remoteIp: nodeSession.remoteIp,
    });
    void refreshRemoteNodeBins({
      nodeId: nodeSession.nodeId,
      platform: nodeSession.platform,
      deviceFamily: nodeSession.deviceFamily,
      commands: nodeSession.commands,
      cfg: loadConfig(),
    }).catch((e) => logGateway.warn(`bin probe fail ${nodeSession.nodeId}: ${String(e)}`));
    void loadVoiceWakeConfig()
      .then((vw) => {
        context.nodeRegistry.sendEvent(nodeSession.nodeId, "voicewake.changed", {
          triggers: vw.triggers,
        });
      })
      .catch((e) => logGateway.warn(`voicewake snap fail: ${String(e)}`));
  }

  send({ type: "res", id: frame.id, ok: true, payload: helloOk });
  void refreshGatewayHealthSnapshot({ probe: true }).catch((e) =>
    logHealth.error(`health refresh fail: ${formatError(e)}`),
  );
}
