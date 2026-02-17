import { randomUUID, randomBytes } from "node:crypto";
import {
  createServer as createHttpServer,
  type Server as HttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createServer as createHttpsServer } from "node:https";
import type { TlsOptions } from "node:tls";
import type { WebSocketServer } from "ws";
import { handleA2uiHttpRequest } from "../canvas-host/a2ui.js";
import type { CanvasHostHandler } from "../canvas-host/server.js";
import { loadConfig } from "../config/config.js";
import type { createSubsystemLogger } from "../logging/subsystem.js";
import { handleSlackHttpRequest } from "../slack/http/index.js";
import { resolveAgentAvatar } from "../agents/identity-avatar.js";
import { authorizeGatewayConnect } from "./auth.js";
import { handleControlUiAvatarRequest, handleControlUiHttpRequest } from "./control-ui.js";
import { sendUnauthorized } from "./http-common.js";
import { getBearerToken } from "./http-utils.js";
import {
  extractHookToken,
  getHookChannelError,
  type HookMessageChannel,
  type HooksConfigResolved,
  normalizeAgentPayload,
  normalizeHookHeaders,
  normalizeWakePayload,
  readJsonBody,
  resolveHookChannel,
  resolveHookDeliver,
} from "./hooks.js";
import { applyHookMappings } from "./hooks-mapping.js";
import { handleOpenAiHttpRequest } from "./openai-http.js";
import { handleOpenResponsesHttpRequest } from "./openresponses-http.js";
import { handleToolsInvokeHttpRequest } from "./tools-invoke-http.js";
import { handleMemoryGraphHttpRequest } from "./memory-graph-http.js";
import { handleAudioTranscribeHttpRequest } from "./audio-transcribe-http.js";

type SubsystemLogger = ReturnType<typeof createSubsystemLogger>;

type HookDispatchers = {
  dispatchWakeHook: (value: { text: string; mode: "now" | "next-heartbeat" }) => void;
  dispatchAgentHook: (value: {
    message: string;
    name: string;
    wakeMode: "now" | "next-heartbeat";
    sessionKey: string;
    deliver: boolean;
    channel: HookMessageChannel;
    to?: string;
    model?: string;
    thinking?: string;
    timeoutSeconds?: number;
  }) => string;
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export type HooksRequestHandler = (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;

export function createHooksRequestHandler(
  opts: {
    getHooksConfig: () => HooksConfigResolved | null;
    bindHost: string;
    port: number;
    logHooks: SubsystemLogger;
  } & HookDispatchers,
): HooksRequestHandler {
  const { getHooksConfig, bindHost, port, logHooks, dispatchAgentHook, dispatchWakeHook } = opts;
  return async (req, res) => {
    const hooksConfig = getHooksConfig();
    if (!hooksConfig) return false;
    const url = new URL(req.url ?? "/", `http://${bindHost}:${port}`);
    const basePath = hooksConfig.basePath;
    if (url.pathname !== basePath && !url.pathname.startsWith(`${basePath}/`)) {
      return false;
    }

    const token = extractHookToken(req, url);
    if (!token || token !== hooksConfig.token) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Unauthorized");
      return true;
    }

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Allow", "POST");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Method Not Allowed");
      return true;
    }

    const subPath = url.pathname.slice(basePath.length).replace(/^\/+/, "");
    if (!subPath) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not Found");
      return true;
    }

    const body = await readJsonBody(req, hooksConfig.maxBodyBytes);
    if (!body.ok) {
      const status = body.error === "payload too large" ? 413 : 400;
      sendJson(res, status, { ok: false, error: body.error });
      return true;
    }

    const payload = typeof body.value === "object" && body.value !== null ? body.value : {};
    const headers = normalizeHookHeaders(req);

    if (subPath === "wake") {
      const normalized = normalizeWakePayload(payload as Record<string, unknown>);
      if (!normalized.ok) {
        sendJson(res, 400, { ok: false, error: normalized.error });
        return true;
      }
      dispatchWakeHook(normalized.value);
      sendJson(res, 200, { ok: true, mode: normalized.value.mode });
      return true;
    }

    if (subPath === "agent") {
      const normalized = normalizeAgentPayload(payload as Record<string, unknown>);
      if (!normalized.ok) {
        sendJson(res, 400, { ok: false, error: normalized.error });
        return true;
      }
      const runId = dispatchAgentHook(normalized.value);
      sendJson(res, 202, { ok: true, runId });
      return true;
    }

    if (hooksConfig.mappings.length > 0) {
      try {
        const mapped = await applyHookMappings(hooksConfig.mappings, {
          payload: payload as Record<string, unknown>,
          headers,
          url,
          path: subPath,
        });
        if (mapped) {
          if (!mapped.ok) {
            sendJson(res, 400, { ok: false, error: mapped.error });
            return true;
          }
          if (mapped.action === null) {
            res.statusCode = 204;
            res.end();
            return true;
          }
          if (mapped.action.kind === "wake") {
            dispatchWakeHook({
              text: mapped.action.text,
              mode: mapped.action.mode,
            });
            sendJson(res, 200, { ok: true, mode: mapped.action.mode });
            return true;
          }
          const channel = resolveHookChannel(mapped.action.channel);
          if (!channel) {
            sendJson(res, 400, { ok: false, error: getHookChannelError() });
            return true;
          }
          const runId = dispatchAgentHook({
            message: mapped.action.message,
            name: mapped.action.name ?? "Hook",
            wakeMode: mapped.action.wakeMode,
            sessionKey: mapped.action.sessionKey ?? "",
            deliver: resolveHookDeliver(mapped.action.deliver),
            channel,
            to: mapped.action.to,
            model: mapped.action.model,
            thinking: mapped.action.thinking,
            timeoutSeconds: mapped.action.timeoutSeconds,
          });
          sendJson(res, 202, { ok: true, runId });
          return true;
        }
      } catch (err) {
        logHooks.warn(`hook mapping failed: ${String(err)}`);
        sendJson(res, 500, { ok: false, error: "hook mapping failed" });
        return true;
      }
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not Found");
    return true;
  };
}

import { Router } from "./server-router.js";
import { RateLimiter } from "./rate-limiter.js";
import { resolveGatewayClientIp } from "./net.js";
import { logSecurityBlock } from "../security/sec-event.js";

export function createGatewayHttpServer(opts: {
  canvasHost: CanvasHostHandler | null;
  controlUiEnabled: boolean;
  controlUiBasePath: string;
  openAiChatCompletionsEnabled: boolean;
  openResponsesEnabled: boolean;
  openResponsesConfig?: import("../config/types.gateway.js").GatewayHttpResponsesConfig;
  handleHooksRequest: HooksRequestHandler;
  handlePluginRequest?: HooksRequestHandler;
  resolvedAuth: import("./auth.js").ResolvedGatewayAuth;
  tlsOptions?: TlsOptions;
  isTls?: boolean;
}): HttpServer {
  const {
    canvasHost,
    controlUiEnabled,
    controlUiBasePath,
    openAiChatCompletionsEnabled,
    openResponsesEnabled,
    openResponsesConfig,
    handleHooksRequest,
    handlePluginRequest,
    resolvedAuth,
  } = opts;

  const router = new Router();

  // 1. Hooks & Plugins (High priority)
  router.all("*", async (ctx) => {
    if (await handleHooksRequest(ctx.req, ctx.res)) return true;
    if (handlePluginRequest && (await handlePluginRequest(ctx.req, ctx.res))) return true;
    return false;
  });

  // 2. Tools & Slack
  router.all("*", async (ctx) => {
    const config = loadConfig();
    const trustedProxies = config.gateway?.trustedProxies ?? [];
    if (
      await handleToolsInvokeHttpRequest(ctx.req, ctx.res, { auth: resolvedAuth, trustedProxies })
    )
      return true;
    if (await handleSlackHttpRequest(ctx.req, ctx.res)) return true;
    return false;
  });

  // 3. AI Endpoints
  router.post("/v1/chat/completions", async (ctx) => {
    if (!openAiChatCompletionsEnabled) return false;
    const config = loadConfig();
    const trustedProxies = config.gateway?.trustedProxies ?? [];
    return await handleOpenAiHttpRequest(ctx.req, ctx.res, { auth: resolvedAuth, trustedProxies });
  });

  router.post("/v1/responses", async (ctx) => {
    if (!openResponsesEnabled) return false;
    const config = loadConfig();
    const trustedProxies = config.gateway?.trustedProxies ?? [];
    return await handleOpenResponsesHttpRequest(ctx.req, ctx.res, {
      auth: resolvedAuth,
      config: openResponsesConfig,
      trustedProxies,
    });
  });

  // 4. Memory & Canvas
  router.get("/api/memory/graph", async (ctx) => {
    const config = loadConfig();
    const trustedProxies = config.gateway?.trustedProxies ?? [];
    return await handleMemoryGraphHttpRequest(ctx.req, ctx.res, {
      auth: resolvedAuth,
      config,
      trustedProxies,
    });
  });

  router.post("/api/audio/transcribe", async (ctx) => {
    const config = loadConfig();
    const trustedProxies = config.gateway?.trustedProxies ?? [];
    return await handleAudioTranscribeHttpRequest(ctx.req, ctx.res, {
      auth: resolvedAuth,
      trustedProxies,
    });
  });

  router.all("*", async (ctx) => {
    if (canvasHost) {
      if (await handleA2uiHttpRequest(ctx.req, ctx.res)) return true;
      if (await canvasHost.handleHttpRequest(ctx.req, ctx.res)) return true;
    }
    return false;
  });

  // 5. Control UI (Dashboard)
  router.all("*", async (ctx) => {
    if (!controlUiEnabled) return false;
    console.log(`[debug-ui] request: ${ctx.req.method} ${ctx.req.url}`);

    const config = loadConfig();

    // Blindagem Control UI: Autenticação Obrigatória
    let token = getBearerToken(ctx.req);

    // UX: Permitir token na URL (query string) para links de 'Login Mágico'
    let fromQuery = false;
    if (!token) {
      const url = new URL(ctx.req.url ?? "/", `http://${ctx.req.headers.host}`);
      const queryToken = url.searchParams.get("token");
      if (queryToken) {
        token = queryToken;
        fromQuery = true;
      }
    }

    // Fallback: Cookie de sessão (necessário para assets como .js/.css)
    if (!token) {
      const cookie = ctx.req.headers.cookie;
      if (cookie) {
        // [PT] Priorizar zero_auth que contém o gateway token real no modo A-POS
        const authMatch = cookie.match(/(?:^|; )zero_auth=([^;]*)/i);
        if (authMatch) {
          token = authMatch[1].trim();
        } else {
          const match = cookie.match(/(?:^|; )(?:zero_token|ZERO_TOKEN)=([^;]*)/i);
          if (match) {
            const raw = match[1] ?? "";
            token = raw.toLowerCase().startsWith("bearer ") ? raw.slice(7).trim() : raw.trim();
          }
        }
      }
    }

    const trustedProxies = config.gateway?.trustedProxies ?? [];
    const authResult = await authorizeGatewayConnect({
      auth: resolvedAuth,
      connectAuth: { token, password: token },
      req: ctx.req,
      trustedProxies,
    });

    if (!authResult.ok) {
      console.log(
        `[debug-auth] auth failed: ok=${authResult.ok} reason=${authResult.reason} token_len=${token?.length ?? 0} expected_len=${resolvedAuth.token?.length ?? 0}`,
      );
      sendUnauthorized(ctx.res);
      return true;
    }

    // PT-005: Session Fixation fix — gerar token de sessão opaco
    // O cookie NUNCA contém o gateway token real. Um UUID de sessão é usado.
    if (fromQuery && token) {
      const sessionToken = randomUUID();
      const securePart = opts.isTls ? "; Secure" : "";
      ctx.res.setHeader("Set-Cookie", [
        `zero_token=${sessionToken}; Path=/; HttpOnly; SameSite=Strict${securePart}; Max-Age=31536000`,
        `ZERO_TOKEN=${sessionToken}; Path=/; HttpOnly; SameSite=Strict${securePart}; Max-Age=31536000`,
        // Manter mapeamento interno: sessionToken → gatewayToken (via cookie adicional assinado)
        `zero_auth=${token}; Path=/; HttpOnly; SameSite=Strict${securePart}; Max-Age=31536000`,
      ]);
      // CRITICAL-003: Redirecionar para limpar o token da URL (evita leakage via Referer/logs)
      const cleanUrl = new URL(ctx.req.url ?? "/", `http://${ctx.req.headers.host}`);
      cleanUrl.searchParams.delete("token");
      ctx.res.writeHead(302, { Location: cleanUrl.pathname + cleanUrl.search });
      ctx.res.end();
      return true;
    }

    if (
      handleControlUiAvatarRequest(ctx.req, ctx.res, {
        basePath: controlUiBasePath,
        resolveAvatar: (agentId) => resolveAgentAvatar(config, agentId),
      })
    )
      return true;

    if (
      handleControlUiHttpRequest(ctx.req, ctx.res, {
        basePath: controlUiBasePath,
        config: config,
        token: token,
      })
    )
      return true;

    return false;
  });

  const httpServer: HttpServer = opts.tlsOptions
    ? createHttpsServer(opts.tlsOptions, (req, res) => {
        void handleRequest(req, res);
      })
    : createHttpServer((req, res) => {
        void handleRequest(req, res);
      });

  // HIGH-004: Rate Limiter global (CWE-770)
  const globalRateLimiter = new RateLimiter({
    windowMs: 60_000, // 1 minuto
    maxRequests: 120, // 120 req/min por IP
  });
  // Garbage collection periódica
  const rlCleanupInterval = setInterval(() => globalRateLimiter.cleanup(), 5 * 60_000);
  httpServer.on("close", () => clearInterval(rlCleanupInterval));

  async function handleRequest(req: IncomingMessage, res: ServerResponse) {
    if (String(req.headers.upgrade ?? "").toLowerCase() === "websocket") return;

    // Rate Limiting — primeira verificação antes de qualquer processamento
    const config = loadConfig();
    const trustedProxies = config.gateway?.trustedProxies ?? [];
    const clientIp = resolveGatewayClientIp({
      remoteAddr: req.socket.remoteAddress,
      forwardedFor: req.headers["x-forwarded-for"] as string | undefined,
      realIp: req.headers["x-real-ip"] as string | undefined,
      trustedProxies,
    });
    if (clientIp) {
      const rl = globalRateLimiter.check(clientIp);
      if (!rl.allowed) {
        res.setHeader("Retry-After", String(rl.retryAfter ?? 60));
        res.statusCode = 429;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(
          JSON.stringify({ ok: false, error: "Too Many Requests", retryAfter: rl.retryAfter }),
        );
        logSecurityBlock({
          type: "rate_limit",
          severity: "MEDIUM",
          source: "gateway/http",
          clientIp: clientIp,
          details: `Rate limit exceeded: ${clientIp}`,
        });
        return;
      }
    } else {
      // HIGH-005: Bloquear requisições com IP desconhecido (previne bypass)
      res.statusCode = 403;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, error: "Forbidden: Unknown IP source" }));
      return;
    }

    // Security Headers (HIGH-001: CSP Implementation with nonces)
    // Protege contra XSS, clickjacking, MIME sniffing, e outros ataques
    const cspNonce = randomBytes(16).toString("base64");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
        `script-src 'self' 'unsafe-inline' 'nonce-${cspNonce}'; ` +
        "style-src 'self' 'unsafe-inline'; " + // inline styles necessários para UI dinâmica
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' ws: wss:; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "0"); // Desabilitado — CSP nonce é proteção superior
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    res.setHeader("X-CSP-Nonce", cspNonce); // Disponibilizar nonce para UI dinâmica

    // MED-001: CORS Headers (configurável via zero.json)
    const corsConfig = config.gateway?.cors;
    if (corsConfig?.enabled) {
      const origin = req.headers.origin;
      const allowedOrigins = corsConfig.allowedOrigins ?? ["http://localhost:3000"];
      const isWildcard = allowedOrigins.includes("*");

      if (origin && (isWildcard || allowedOrigins.includes(origin))) {
        res.setHeader("Access-Control-Allow-Origin", isWildcard ? "*" : origin);
        res.setHeader(
          "Access-Control-Allow-Methods",
          corsConfig.allowedMethods?.join(", ") ?? "GET, POST, OPTIONS",
        );
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (corsConfig.allowCredentials && !isWildcard) {
          res.setHeader("Access-Control-Allow-Credentials", "true");
        }
      }

      // Handle preflight OPTIONS requests
      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }
    }

    try {
      if (await router.handle(req, res)) return;

      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Not Found");
    } catch (err) {
      const requestId = randomUUID();
      // Sanitização: Log interno detalhado, resposta pública genérica.
      console.error(`[HTTP] Ref:${requestId} Uncaught processing error:`, err);

      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(
          JSON.stringify({
            ok: false,
            error: "Internal Server Error",
            code: "INTERNAL_ERROR",
            requestId,
          }),
        );
      }
    }
  }

  return httpServer;
}

// WS-ORIGIN: Origens permitidas para WebSocket (CWE-1385)
const WS_ALLOWED_ORIGINS = new Set([
  "http://localhost",
  "https://localhost",
  "http://127.0.0.1",
  "https://127.0.0.1",
  "http://[::1]",
  "https://[::1]",
]);

function isAllowedWsOrigin(
  origin: string | undefined,
  config: ReturnType<typeof loadConfig>,
): boolean {
  if (!origin) return true; // Sem Origin = request direto (não-browser)
  // Permitir origens configuradas via cors.allowedOrigins
  const customOrigins = config.gateway?.cors?.allowedOrigins;
  if (Array.isArray(customOrigins)) {
    for (const o of customOrigins) {
      if (o === "*" || origin.startsWith(o)) return true;
    }
  }
  // Localhost variantes
  for (const allowed of WS_ALLOWED_ORIGINS) {
    if (origin.startsWith(allowed)) return true;
  }
  // Tailscale
  if (origin.includes(".ts.net")) return true;
  return false;
}

export function attachGatewayUpgradeHandler(opts: {
  httpServer: HttpServer;
  wss: WebSocketServer;
  canvasHost: CanvasHostHandler | null;
}) {
  const { httpServer, wss, canvasHost } = opts;
  httpServer.on("upgrade", (req, socket, head) => {
    // WS-ORIGIN: Validar Origin header (CVE-2026-25253 defense)
    const origin = req.headers.origin;
    const config = loadConfig();
    if (!isAllowedWsOrigin(origin, config)) {
      console.warn(`[WS] Origin rejeitado: ${origin}`);
      logSecurityBlock({
        type: "ws_origin_rejected",
        severity: "HIGH",
        source: "gateway/websocket",
        clientIp: req.socket.remoteAddress,
        details: `WebSocket Origin rejected: ${origin}`,
      });
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    if (canvasHost?.handleUpgrade(req, socket, head)) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });
}
