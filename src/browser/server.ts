import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { loadConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { resolveBrowserConfig, resolveProfile, shouldStartLocalBrowserServer } from "./config.js";
import { ensureChromeExtensionRelayServer } from "./extension-relay.js";
import { registerBrowserRoutes } from "./routes/index.js";
import { type BrowserServerState, createBrowserRouteContext } from "./server-context.js";

let state: BrowserServerState | null = null;
const log = createSubsystemLogger("browser");
const logServer = log.child("server");
let serverInstance: ReturnType<typeof serve> | null = null;

export async function startBrowserControlServerFromConfig(): Promise<BrowserServerState | null> {
  if (state) return state;

  const cfg = loadConfig();
  const resolved = resolveBrowserConfig(cfg.browser);
  if (!resolved.enabled) return null;

  if (!shouldStartLocalBrowserServer(resolved)) {
    logServer.info(
      `browser control URL is non-loopback (${resolved.controlUrl}); skipping local server start`,
    );
    return null;
  }

  const app = new Hono();

  const ctx = createBrowserRouteContext({
    getState: () => state,
  });

  // Hono uses a different mounting pattern, we'll adapt registerBrowserRoutes
  registerBrowserRoutes(app as any, ctx);

  const port = resolved.controlPort;

  try {
    serverInstance = serve({
      fetch: app.fetch,
      port,
      hostname: "127.0.0.1",
    });
  } catch (err) {
    logServer.error(`zero browser server failed to bind 127.0.0.1:${port}: ${String(err)}`);
    return null;
  }

  state = {
    server: serverInstance as any, // Cast for compatibility with existing types if needed
    port,
    resolved,
    profiles: new Map(),
  };

  for (const name of Object.keys(resolved.profiles)) {
    const profile = resolveProfile(resolved, name);
    if (!profile || profile.driver !== "extension") continue;
    await ensureChromeExtensionRelayServer({ cdpUrl: profile.cdpUrl }).catch((err) => {
      logServer.warn(`Chrome extension relay init failed for profile "${name}": ${String(err)}`);
    });
  }

  logServer.info(`Browser control listening on http://127.0.0.1:${port}/`);
  return state;
}

export async function stopBrowserControlServer(): Promise<void> {
  const current = state;
  if (!current) return;

  const ctx = createBrowserRouteContext({
    getState: () => state,
  });

  try {
    if (state) {
      for (const name of Object.keys(state.resolved.profiles)) {
        try {
          await ctx.forProfile(name).stopRunningBrowser();
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    logServer.warn(`zero browser stop failed: ${String(err)}`);
  }

  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
  }
  state = null;

  try {
    const mod = await import("./pw-ai.js");
    await mod.closePlaywrightBrowserConnection();
  } catch {
    // ignore
  }
}
