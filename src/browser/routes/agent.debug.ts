import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Hono } from "hono";

import type { BrowserRouteContext } from "../server-context.js";
import { handleRouteError, requirePwAi } from "./agent.shared.js";
import { getProfileContext, toBoolean, toStringOrEmpty } from "./utils.js";

export function registerBrowserAgentDebugRoutes(app: Hono, ctx: BrowserRouteContext) {
  app.get("/console", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const targetId = c.req.query("targetId")?.trim() || "";
    const level = c.req.query("level") || "";

    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pwResult = await requirePwAi(c, "console messages");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      const messages = await pw.getConsoleMessagesViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        level: level.trim() || undefined,
      });
      return c.json({ ok: true, messages, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.get("/errors", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const targetId = c.req.query("targetId")?.trim() || "";
    const clear = toBoolean(c.req.query("clear")) ?? false;

    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pwResult = await requirePwAi(c, "page errors");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      const result = await pw.getPageErrorsViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        clear,
      });
      return c.json({ ok: true, targetId: tab.targetId, ...result });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.get("/requests", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const targetId = c.req.query("targetId")?.trim() || "";
    const filter = c.req.query("filter") || "";
    const clear = toBoolean(c.req.query("clear")) ?? false;

    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pwResult = await requirePwAi(c, "network requests");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      const result = await pw.getNetworkRequestsViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        filter: filter.trim() || undefined,
        clear,
      });
      return c.json({ ok: true, targetId: tab.targetId, ...result });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/trace/start", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const screenshots = toBoolean(body.screenshots) ?? undefined;
    const snapshots = toBoolean(body.snapshots) ?? undefined;
    const sources = toBoolean(body.sources) ?? undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "trace start");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.traceStartViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        screenshots,
        snapshots,
        sources,
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/trace/stop", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const out = toStringOrEmpty(body.path) || "";
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "trace stop");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      const id = crypto.randomUUID();
      const dir = "/tmp/zero";
      await fs.mkdir(dir, { recursive: true });
      const tracePath = out.trim() || path.join(dir, `browser-trace-${id}.zip`);
      await pw.traceStopViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        path: tracePath,
      });
      return c.json({
        ok: true,
        targetId: tab.targetId,
        path: path.resolve(tracePath),
      });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });
}
