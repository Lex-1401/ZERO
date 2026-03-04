import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

import type { ResolvedBrowserConfig } from "./config.js";
import { registerBrowserRoutes } from "./routes/index.js";
import {
  type BrowserServerState,
  createBrowserRouteContext,
  type ProfileContext,
} from "./server-context.js";

export type BrowserBridge = {
  server: any;
  port: number;
  baseUrl: string;
  state: BrowserServerState;
};

export async function startBrowserBridgeServer(params: {
  resolved: ResolvedBrowserConfig;
  host?: string;
  port?: number;
  authToken?: string;
  onEnsureAttachTarget?: (profile: ProfileContext["profile"]) => Promise<void>;
}): Promise<BrowserBridge> {
  const host = params.host ?? "127.0.0.1";
  const port = params.port ?? 0;

  const app = new Hono();

  const authToken = params.authToken?.trim();
  if (authToken) {
    app.use("*", async (c, next) => {
      const auth = c.req.header("authorization")?.trim() ?? "";
      if (auth === `Bearer ${authToken}`) {
        return await next();
      }
      return c.text("Unauthorized", 401);
    });
  }

  const state: BrowserServerState = {
    server: null as unknown as Server,
    port,
    resolved: params.resolved,
    profiles: new Map(),
  };

  const ctx = createBrowserRouteContext({
    getState: () => state,
    onEnsureAttachTarget: params.onEnsureAttachTarget,
  });
  registerBrowserRoutes(app, ctx);

  const server = serve(
    {
      fetch: app.fetch,
      port,
      hostname: host,
    },
    (_info) => {
      // Server is listening
    },
  );

  // serve() returns an instance of Node.js Server
  state.server = server;

  // Wait for the server to be listening to get the port
  if (port === 0) {
    await new Promise<void>((resolve) => {
      if (server.listening) {
        resolve();
      } else {
        server.on("listening", resolve);
      }
    });
  }

  const address = server.address() as AddressInfo | null;
  const resolvedPort = address?.port ?? port;
  state.port = resolvedPort;
  state.resolved.controlHost = host;
  state.resolved.controlPort = resolvedPort;
  state.resolved.controlUrl = `http://${host}:${resolvedPort}`;

  const baseUrl = state.resolved.controlUrl;
  return { server, port: resolvedPort, baseUrl, state };
}

export async function stopBrowserBridgeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}
