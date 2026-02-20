import type { Hono } from "hono";

import type { BrowserRouteContext } from "../server-context.js";
import { getProfileContext, toNumber, toStringOrEmpty } from "./utils.js";

export function registerBrowserTabRoutes(app: Hono, ctx: BrowserRouteContext) {
  app.get("/tabs", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);
    try {
      const reachable = await profileCtx.isReachable(300);
      if (!reachable) return c.json({ running: false, tabs: [] as unknown[] });
      const tabs = await profileCtx.listTabs();
      return c.json({ running: true, tabs });
    } catch (err) {
      return c.json({ error: String(err) }, 500);
    }
  });

  app.post("/tabs/open", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);
    const body = await c.req.json().catch(() => ({}));
    const url = toStringOrEmpty(body.url);
    if (!url) return c.json({ error: "url is required" }, 400);
    try {
      await profileCtx.ensureBrowserAvailable();
      const tab = await profileCtx.openTab(url);
      return c.json(tab);
    } catch (err) {
      return c.json({ error: String(err) }, 500);
    }
  });

  app.post("/tabs/focus", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);
    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId);
    if (!targetId) return c.json({ error: "targetId is required" }, 400);
    try {
      if (!(await profileCtx.isReachable(300)))
        return c.json({ error: "browser not running" }, 409);
      await profileCtx.focusTab(targetId);
      return c.json({ ok: true });
    } catch (err) {
      const mapped = ctx.mapTabError(err);
      if (mapped) return c.json({ error: mapped.message }, mapped.status as any);
      return c.json({ error: String(err) }, 500);
    }
  });

  app.delete("/tabs/:targetId", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);
    const targetId = toStringOrEmpty(c.req.param("targetId"));
    if (!targetId) return c.json({ error: "targetId is required" }, 400);
    try {
      if (!(await profileCtx.isReachable(300)))
        return c.json({ error: "browser not running" }, 409);
      await profileCtx.closeTab(targetId);
      return c.json({ ok: true });
    } catch (err) {
      const mapped = ctx.mapTabError(err);
      if (mapped) return c.json({ error: mapped.message }, mapped.status as any);
      return c.json({ error: String(err) }, 500);
    }
  });

  app.post("/tabs/action", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);
    const body = await c.req.json().catch(() => ({}));
    const action = toStringOrEmpty(body.action);
    const index = toNumber(body.index);
    try {
      if (action === "list") {
        const reachable = await profileCtx.isReachable(300);
        if (!reachable) return c.json({ ok: true, tabs: [] as unknown[] });
        const tabs = await profileCtx.listTabs();
        return c.json({ ok: true, tabs });
      }

      if (action === "new") {
        await profileCtx.ensureBrowserAvailable();
        const tab = await profileCtx.openTab("about:blank");
        return c.json({ ok: true, tab });
      }

      if (action === "close") {
        const tabs = await profileCtx.listTabs();
        const target = typeof index === "number" ? tabs[index] : tabs.at(0);
        if (!target) return c.json({ error: "tab not found" }, 404);
        await profileCtx.closeTab(target.targetId);
        return c.json({ ok: true, targetId: target.targetId });
      }

      if (action === "select") {
        if (typeof index !== "number") return c.json({ error: "index is required" }, 400);
        const tabs = await profileCtx.listTabs();
        const target = tabs[index];
        if (!target) return c.json({ error: "tab not found" }, 404);
        await profileCtx.focusTab(target.targetId);
        return c.json({ ok: true, targetId: target.targetId });
      }

      return c.json({ error: "unknown tab action" }, 400);
    } catch (err) {
      const mapped = ctx.mapTabError(err);
      if (mapped) return c.json({ error: mapped.message }, mapped.status as any);
      return c.json({ error: String(err) }, 500);
    }
  });
}
