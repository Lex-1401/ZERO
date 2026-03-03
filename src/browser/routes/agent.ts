import type { Hono } from "hono";

import type { BrowserRouteContext } from "../server-context.js";
import { registerBrowserAgentActRoutes } from "./agent.act.js";
import { registerBrowserAgentDebugRoutes } from "./agent.debug.js";
import { registerBrowserAgentSnapshotRoutes } from "./agent.snapshot.js";
import { registerBrowserAgentStorageRoutes } from "./agent.storage.js";

export function registerBrowserAgentRoutes(app: Hono, ctx: BrowserRouteContext) {
  registerBrowserAgentSnapshotRoutes(app as any, ctx);
  registerBrowserAgentActRoutes(app as any, ctx);
  registerBrowserAgentDebugRoutes(app as any, ctx);
  registerBrowserAgentStorageRoutes(app as any, ctx);
}
