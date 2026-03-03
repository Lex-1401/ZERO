import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";
import { rawDataToString } from "../../../infra/ws.js";
import type { createSubsystemLogger } from "../../../logging/subsystem.js";
import { isWebchatClient } from "../../../utils/message-channel.js";
import type { ResolvedGatewayAuth } from "../../auth.js";
import { loadConfig } from "../../../config/config.js";
import { isLocalGatewayAddress, isTrustedProxyAddress, resolveGatewayClientIp } from "../../net.js";
import {
  type ConnectParams,
  ErrorCodes,
  type ErrorShape,
  errorShape,
  type RequestFrame,
  validateConnectParams,
  validateRequestFrame,
} from "../../protocol/index.js";
import type { GatewayRequestContext, GatewayRequestHandlers } from "../../server-methods/types.js";
import { handleGatewayRequest } from "../../server-methods.js";
import { formatForLog, logWs } from "../../ws-log.js";
import { truncateCloseReason } from "../close-reason.js";
import type { GatewayWsClient } from "../ws-types.js";
import { getOrCreateVoiceSession } from "../../../voice/session.js";
import { Buffer } from "node:buffer";
import { handleConnectFrame } from "./connect-handler.js";

type SubsystemLogger = ReturnType<typeof createSubsystemLogger>;

export type GatewayWsContext = {
  socket: WebSocket;
  upgradeReq: IncomingMessage;
  connId: string;
  remoteAddr?: string;
  forwardedFor?: string;
  realIp?: string;
  requestHost?: string;
  requestOrigin?: string;
  requestUserAgent?: string;
  canvasHostUrl?: string;
  connectNonce: string;
  resolvedAuth: ResolvedGatewayAuth;
  gatewayMethods: string[];
  events: string[];
  extraHandlers: GatewayRequestHandlers;
  buildRequestContext: () => GatewayRequestContext;
  send: (obj: unknown) => void;
  close: (code?: number, reason?: string) => void;
  isClosed: () => boolean;
  clearHandshakeTimer: () => void;
  getClient: () => GatewayWsClient | null;
  setClient: (next: GatewayWsClient) => void;
  setHandshakeState: (state: "pending" | "connected" | "failed") => void;
  setCloseCause: (cause: string, meta?: Record<string, unknown>) => void;
  setLastFrameMeta: (meta: { type?: string; method?: string; id?: string }) => void;
  logGateway: SubsystemLogger;
  logHealth: SubsystemLogger;
  logWsControl: SubsystemLogger;
};

/**
 * Attaches message handlers to a gateway WebSocket connection.
 * Handles binary audio and JSON-based request/response protocol.
 *
 * @param params - Configuration and handlers for the connection.
 */
export function attachGatewayWsMessageHandler(params: GatewayWsContext) {
  const { socket } = params;
  const securityMap = setupSecurity(params);
  const isWebchatConnect = (p: ConnectParams | null | undefined) => isWebchatClient(p?.client);

  socket.on("message", async (data, isBinaryFlag) => {
    await handleIncomingData({
      data,
      isBinaryFlag,
      isWebchatConnect,
      securityMap,
      ...params,
    });
  });
}

function setupSecurity(params: GatewayWsContext): Record<string, any> {
  const { remoteAddr, forwardedFor, realIp } = params;
  const configSnapshot = loadConfig();
  const trustedProxies = configSnapshot.gateway?.trustedProxies ?? [];
  const clientIp = resolveGatewayClientIp({ remoteAddr, forwardedFor, realIp, trustedProxies });

  const hasProxyHeaders = Boolean(forwardedFor || realIp);
  const remoteIsTrustedProxy = isTrustedProxyAddress(remoteAddr, trustedProxies);
  const hasUntrustedProxyHeaders = hasProxyHeaders && !remoteIsTrustedProxy;
  const isLocalClient = !hasUntrustedProxyHeaders && isLocalGatewayAddress(clientIp);
  const reportedClientIp = hasUntrustedProxyHeaders ? undefined : clientIp;

  if (hasUntrustedProxyHeaders) {
    params.logWsControl.warn(
      "Proxy headers detected from untrusted address. Connection will not be treated as local.",
    );
  }

  return { trustedProxies, reportedClientIp, isLocalClient };
}

async function handleIncomingData(
  params: GatewayWsContext & {
    data: any;
    isBinaryFlag: boolean;
    isWebchatConnect: (p: any) => boolean;
    securityMap: any;
  },
) {
  const { data, isBinaryFlag, isClosed, getClient, connId, send, setLastFrameMeta } = params;
  if (isClosed()) return;

  if (isBinaryFlag) return handleBinaryData(data, getClient, connId, send);

  try {
    const stringData = rawDataToString(data);
    console.log(`[WS-Raw] conn=${connId} data=${stringData.slice(0, 100)}`);
    const parsed = JSON.parse(stringData);
    updateLastFrameMeta(parsed, setLastFrameMeta);

    const client = getClient();
    if (!client) return await processHandshake({ parsed, ...params, ...params.securityMap });

    await processAuthenticatedRequest({ parsed, client, ...params });
  } catch (err) {
    handleInboundError(err, connId, getClient, params.logGateway, params.close);
  }
}

function handleBinaryData(data: any, getClient: () => any, connId: string, send: any) {
  const buf = Buffer.isBuffer(data)
    ? data
    : Buffer.concat(Array.isArray(data) ? data : [Buffer.from(data)]);
  if (getClient()) {
    getOrCreateVoiceSession(connId, send).handleAudio(buf);
  }
}

function handleInboundError(
  err: any,
  connId: string,
  getClient: () => any,
  logGateway: any,
  close: any,
) {
  logGateway.error(`parse/handle error: ${String(err)}`);
  logWs("out", "parse-error", { connId, error: formatForLog(err) });
  if (!getClient()) close();
}

/**
 * Updates metadata for the last received frame.
 */
function updateLastFrameMeta(parsed: any, setter: (meta: any) => void) {
  if (parsed && typeof parsed === "object") {
    setter({
      type: typeof parsed.type === "string" ? parsed.type : undefined,
      method: typeof parsed.method === "string" ? parsed.method : undefined,
      id: typeof parsed.id === "string" ? parsed.id : undefined,
    });
  }
}

/**
 * Handles the initial connection handshake.
 */
async function processHandshake(params: any) {
  const { parsed, ...handlers } = params;
  if (
    !validateRequestFrame(parsed) ||
    parsed.method !== "connect" ||
    !validateConnectParams(parsed.params)
  ) {
    const error = !validateRequestFrame(parsed) ? "invalid request frame" : "invalid handshake";
    handlers.setHandshakeState("failed");
    handlers.setCloseCause("invalid-handshake", { error });
    if (validateRequestFrame(parsed)) {
      handlers.send({
        type: "res",
        id: parsed.id,
        ok: false,
        error: errorShape(ErrorCodes.INVALID_REQUEST, error),
      });
    }
    handlers.close(1008, truncateCloseReason(error));
    return;
  }
  await handleConnectFrame({ frame: parsed, ...handlers });
}

/**
 * Processes requests from an already authenticated client.
 */
async function processAuthenticatedRequest(params: {
  parsed: any;
  client: GatewayWsClient;
  connId: string;
  extraHandlers: GatewayRequestHandlers;
  buildRequestContext: () => GatewayRequestContext;
  isWebchatConnect: (p: any) => boolean;
  send: (obj: unknown) => void;
  logGateway: SubsystemLogger;
}) {
  const { parsed, client, extraHandlers, buildRequestContext, isWebchatConnect, send, logGateway } =
    params;

  if (!validateRequestFrame(parsed)) {
    return send({
      type: "res",
      id: parsed?.id ?? "invalid",
      ok: false,
      error: errorShape(ErrorCodes.INVALID_REQUEST, "invalid request frame"),
    });
  }

  const req = parsed as RequestFrame;
  const respond = (ok: boolean, payload?: unknown, error?: ErrorShape) =>
    send({ type: "res", id: req.id, ok, payload, error });

  try {
    await handleGatewayRequest({
      req,
      respond,
      client,
      isWebchatConnect,
      extraHandlers,
      context: buildRequestContext(),
    });
  } catch (err) {
    logGateway.error(`request handler failed: ${formatForLog(err)}`);
    respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, formatForLog(err)));
  }
}
