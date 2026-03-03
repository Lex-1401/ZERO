import type { Hono } from "hono";

import type { BrowserRouteContext } from "../server-context.js";
import { registerBrowserAgentRoutes } from "./agent.js";
import { registerBrowserBasicRoutes } from "./basic.js";
import { registerBrowserTabRoutes } from "./tabs.js";

export function registerBrowserRoutes(app: Hono, ctx: BrowserRouteContext) {
  registerBrowserBasicRoutes(app as any, ctx);
  registerBrowserTabRoutes(app as any, ctx);
  registerBrowserAgentRoutes(app as any, ctx);
}
