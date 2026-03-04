
import { randomUUID } from "node:crypto";
import { WebSocket, type ClientOptions, type CertMeta } from "ws";
import { normalizeFingerprint } from "../infra/tls/fingerprint.js";
import { rawDataToString } from "../infra/ws.js";
import { logDebug, logError } from "../logger.js";
import { loadOrCreateDeviceIdentity } from "../infra/device-identity.js";
import {
  type EventFrame,
  type HelloOk,
  type RequestFrame,
  validateEventFrame,
  validateRequestFrame,
  validateResponseFrame,
} from "./protocol/index.js";
import type { GatewayClientOptions, Pending } from "./client/types.js";
import { buildConnectParams, handleHelloOk, handleConnectFailure } from "./client/connection.js";
import { GATEWAY_CLIENT_MODES } from "../utils/message-channel.js";

export const GATEWAY_CLOSE_CODE_HINTS: Readonly<Record<number, string>> = {
  1000: "normal closure",
  1006: "abnormal closure (no close frame)",
  1008: "policy violation",
  1012: "service restart",
};

export function describeGatewayCloseCode(code: number): string | undefined {
  return GATEWAY_CLOSE_CODE_HINTS[code];
}

/**
 * Um cliente WebSocket para conectar ao Zero Gateway.
 */
export class GatewayClient {
  private ws: WebSocket | null = null;
  private opts: GatewayClientOptions;
  private pending = new Map<string, Pending>();
  private backoffMs = 1000;
  private closed = false;
  private lastSeq: number | null = null;
  private connectNonce: string | null = null;
  private connectSent = false;
  private connectTimer: NodeJS.Timeout | null = null;
  private lastTick: number | null = null;
  private tickIntervalMs = 30_000;
  private tickTimer: NodeJS.Timeout | null = null;

  constructor(opts: GatewayClientOptions) {
    this.opts = {
      ...opts,
      deviceIdentity: opts.deviceIdentity ?? loadOrCreateDeviceIdentity(),
    };
  }

  start() {
    if (this.closed) return;
    const url = this.opts.url ?? "ws://127.0.0.1:18789";

    if (this.opts.tlsFingerprint && !url.startsWith("wss://")) {
      this.opts.onConnectError?.(new Error("gateway tls fingerprint requires wss:// gateway url"));
      return;
    }

    const wsOptions: ClientOptions = {
      maxPayload: 25 * 1024 * 1024,
    };

    if (url.startsWith("wss://") && this.opts.tlsFingerprint) {
      wsOptions.rejectUnauthorized = false;
      wsOptions.checkServerIdentity = ((_host: string, cert: CertMeta) => {
        const fingerprintValue = (cert as any)?.fingerprint256 ?? "";
        const fingerprint = normalizeFingerprint(fingerprintValue);
        const expected = normalizeFingerprint(this.opts.tlsFingerprint ?? "");
        if (!expected) return new Error("gateway tls fingerprint missing");
        if (!fingerprint) return new Error("gateway tls fingerprint unavailable");
        if (fingerprint !== expected) return new Error("gateway tls fingerprint mismatch");
        return undefined;
      }) as any;
    }

    try {
      this.ws = new WebSocket(url, wsOptions);
      this.ws.on("open", () => {
        if (url.startsWith("wss://") && this.opts.tlsFingerprint) {
          const tlsError = this.validateTlsFingerprint();
          if (tlsError) {
            this.opts.onConnectError?.(tlsError);
            this.ws?.close(1008, tlsError.message);
            return;
          }
        }
        this.queueConnect();
      });

      this.ws.on("message", (data) => this.handleMessage(rawDataToString(data)));

      this.ws.on("close", (code, reason) => {
        const reasonText = rawDataToString(reason);
        this.ws = null;
        this.flushPendingErrors(new Error(`gateway closed (${code}): ${reasonText}`));
        this.scheduleReconnect();
        this.opts.onClose?.(code, reasonText);
      });

      this.ws.on("error", (err) => {
        logDebug(`gateway client error: ${String(err)}`);
        if (!this.connectSent) {
          this.opts.onConnectError?.(err instanceof Error ? err : new Error(String(err)));
        }
      });
    } catch (err) {
      this.opts.onConnectError?.(err as Error);
      this.scheduleReconnect();
    }
  }

  stop() {
    this.closed = true;
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.ws?.close();
    this.ws = null;
    this.flushPendingErrors(new Error("gateway client stopped"));
  }

  private queueConnect() {
    this.connectNonce = null;
    this.connectSent = false;
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = setTimeout(() => this.sendConnect(), 750);
  }

  private sendConnect() {
    if (this.connectSent) return;
    this.connectSent = true;

    const params = buildConnectParams(this.opts, this.connectNonce);

    void this.request<HelloOk>("connect", params)
      .then((helloOk) => {
        handleHelloOk(this.opts, helloOk);
        this.backoffMs = 1000;
        this.tickIntervalMs = helloOk.policy?.tickIntervalMs ?? 30_000;
        this.lastTick = Date.now();
        this.startTickWatch();
        this.opts.onHelloOk?.(helloOk);
      })
      .catch((err) => {
        handleConnectFailure(this.opts, err);
        this.opts.onConnectError?.(err instanceof Error ? err : new Error(String(err)));
        const msg = `gateway connect failed: ${String(err)}`;
        if (this.opts.mode === GATEWAY_CLIENT_MODES.PROBE) logDebug(msg);
        else logError(msg);
        this.ws?.close(1008, "connect failed");
      });
  }

  private handleMessage(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      if (validateEventFrame(parsed)) {
        this.handleEvent(parsed as EventFrame);
      } else if (validateResponseFrame(parsed)) {
        this.handleResponse(parsed);
      }
    } catch (err) {
      logDebug(`gateway client parse error: ${String(err)}`);
    }
  }

  private handleEvent(evt: EventFrame) {
    if (evt.event === "connect.challenge") {
      const payload = evt.payload as { nonce?: string } | undefined;
      if (payload?.nonce) {
        this.connectNonce = payload.nonce;
        this.sendConnect();
      }
      return;
    }

    if (typeof evt.seq === "number") {
      if (this.lastSeq !== null && evt.seq > this.lastSeq + 1) {
        this.opts.onGap?.({ expected: this.lastSeq + 1, received: evt.seq });
      }
      this.lastSeq = evt.seq;
    }

    if (evt.event === "tick") {
      this.lastTick = Date.now();
    }

    this.opts.onEvent?.(evt);
  }

  private handleResponse(parsed: any) {
    const pending = this.pending.get(parsed.id);
    if (!pending) return;

    const status = (parsed.payload as any)?.status;
    if (pending.expectFinal && status === "accepted") return;

    this.pending.delete(parsed.id);
    if (parsed.ok) {
      pending.resolve(parsed.payload);
    } else {
      pending.reject(new Error(parsed.error?.message ?? "unknown error"));
    }
  }

  private scheduleReconnect() {
    if (this.closed || this.opts.disableReconnect) return;
    if (this.tickTimer) clearInterval(this.tickTimer);
    const delay = this.opts.eagerReconnect ? 1000 : this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 30_000);
    setTimeout(() => this.start(), delay).unref();
  }

  private flushPendingErrors(err: Error) {
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }

  private startTickWatch() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    const interval = Math.max(this.tickIntervalMs, 1000);
    this.tickTimer = setInterval(() => {
      if (this.closed || !this.lastTick) return;
      if (Date.now() - this.lastTick > this.tickIntervalMs * 2) {
        this.ws?.close(4000, "tick timeout");
      }
    }, interval);
  }

  private validateTlsFingerprint(): Error | null {
    if (!this.opts.tlsFingerprint || !this.ws) return null;
    const expected = normalizeFingerprint(this.opts.tlsFingerprint);
    const socket = (this.ws as any)._socket;
    if (!socket?.getPeerCertificate) return new Error("gateway tls fingerprint unavailable");
    const cert = socket.getPeerCertificate();
    const fingerprint = normalizeFingerprint(cert?.fingerprint256 ?? "");
    if (!fingerprint) return new Error("gateway tls fingerprint unavailable");
    if (fingerprint !== expected) return new Error("gateway tls fingerprint mismatch");
    return null;
  }

  async request<T = unknown>(
    method: string,
    params?: unknown,
    opts?: { expectFinal?: boolean },
  ): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("gateway not connected");
    }
    const id = randomUUID();
    const frame: RequestFrame = { type: "req", id, method, params };
    if (!validateRequestFrame(frame)) {
      throw new Error(`invalid request frame: ${JSON.stringify(validateRequestFrame.errors)}`);
    }
    const p = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as any, reject, expectFinal: !!opts?.expectFinal });
    });
    this.ws.send(JSON.stringify(frame));
    return p;
  }
}
