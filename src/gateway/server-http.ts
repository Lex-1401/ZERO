
/**
 * Gateway HTTP Server
 *
 * Implements the main HTTP server for the ZERO Gateway.
 * Delegated to src/gateway/http/ for maintainability and Atomic Modularity.
 */

import { type Server as HttpServer } from "node:http";
import { type WebSocketServer } from "ws";
import { createGatewayHttpServer as createHttpServer } from "./http/server.js";
import { createHooksRequestHandler as createHookHandler, type HooksRequestHandler } from "./http/hooks.js";
import { sendJson, isAllowedWsOrigin } from "./http/utils.js";

export { createHookHandler, sendJson, isAllowedWsOrigin };
export type { HooksRequestHandler };

export function createGatewayHttpServer(opts: any): HttpServer {
  return createHttpServer(opts);
}

export function attachGatewayUpgradeHandler(opts: {
  httpServer: HttpServer;
  wss: WebSocketServer;
}) {
  const { httpServer, wss } = opts;
  httpServer.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });
}
