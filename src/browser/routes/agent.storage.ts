import type { Hono } from "hono";

import type { BrowserRouteContext } from "../server-context.js";
import { handleRouteError, requirePwAi } from "./agent.shared.js";
import { getProfileContext, toBoolean, toNumber, toStringOrEmpty } from "./utils.js";

export function registerBrowserAgentStorageRoutes(app: Hono, ctx: BrowserRouteContext) {
  app.get("/cookies", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const targetId = c.req.query("targetId")?.trim() || "";
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pwResult = await requirePwAi(c, "cookies");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      const result = await pw.cookiesGetViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
      });
      return c.json({ ok: true, targetId: tab.targetId, ...result });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/cookies/set", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const cookie =
      body.cookie && typeof body.cookie === "object" && !Array.isArray(body.cookie)
        ? (body.cookie as Record<string, unknown>)
        : null;
    if (!cookie) return c.json({ error: "cookie is required" }, 400);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "cookies set");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.cookiesSetViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        cookie: {
          name: toStringOrEmpty(cookie.name),
          value: toStringOrEmpty(cookie.value),
          url: toStringOrEmpty(cookie.url) || undefined,
          domain: toStringOrEmpty(cookie.domain) || undefined,
          path: toStringOrEmpty(cookie.path) || undefined,
          expires: toNumber(cookie.expires) ?? undefined,
          httpOnly: toBoolean(cookie.httpOnly) ?? undefined,
          secure: toBoolean(cookie.secure) ?? undefined,
          sameSite:
            cookie.sameSite === "Lax" || cookie.sameSite === "None" || cookie.sameSite === "Strict"
              ? (cookie.sameSite as "Lax" | "None" | "Strict")
              : undefined,
        },
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/cookies/clear", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "cookies clear");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.cookiesClearViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.get("/storage/:kind", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const kind = toStringOrEmpty(c.req.param("kind"));
    if (kind !== "local" && kind !== "session")
      return c.json({ error: "kind must be local|session" }, 400);
    const targetId = c.req.query("targetId")?.trim() || "";
    const key = c.req.query("key") || "";
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      const pwResult = await requirePwAi(c, "storage get");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      const result = await pw.storageGetViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        kind,
        key: key.trim() || undefined,
      });
      return c.json({ ok: true, targetId: tab.targetId, ...result });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/storage/:kind/set", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const kind = toStringOrEmpty(c.req.param("kind"));
    if (kind !== "local" && kind !== "session")
      return c.json({ error: "kind must be local|session" }, 400);
    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const key = toStringOrEmpty(body.key);
    if (!key) return c.json({ error: "key is required" }, 400);
    const value = typeof body.value === "string" ? body.value : "";
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "storage set");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.storageSetViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        kind,
        key,
        value,
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/storage/:kind/clear", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const kind = toStringOrEmpty(c.req.param("kind"));
    if (kind !== "local" && kind !== "session")
      return c.json({ error: "kind must be local|session" }, 400);
    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "storage clear");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.storageClearViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        kind,
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/set/offline", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const offline = toBoolean(body.offline);
    if (offline === undefined) return c.json({ error: "offline is required" }, 400);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "offline");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.setOfflineViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        offline,
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/set/headers", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const headers =
      body.headers && typeof body.headers === "object" && !Array.isArray(body.headers)
        ? (body.headers as Record<string, unknown>)
        : null;
    if (!headers) return c.json({ error: "headers is required" }, 400);
    const parsed: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === "string") parsed[k] = v;
    }
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "headers");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.setExtraHTTPHeadersViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        headers: parsed,
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/set/credentials", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const clear = toBoolean(body.clear) ?? false;
    const username = toStringOrEmpty(body.username) || undefined;
    const password = typeof body.password === "string" ? body.password : undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "http credentials");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.setHttpCredentialsViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        username,
        password,
        clear,
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/set/geolocation", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const clear = toBoolean(body.clear) ?? false;
    const latitude = toNumber(body.latitude);
    const longitude = toNumber(body.longitude);
    const accuracy = toNumber(body.accuracy) ?? undefined;
    const origin = toStringOrEmpty(body.origin) || undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "geolocation");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.setGeolocationViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        latitude,
        longitude,
        accuracy,
        origin,
        clear,
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/set/media", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const schemeRaw = toStringOrEmpty(body.colorScheme);
    const colorScheme =
      schemeRaw === "dark" || schemeRaw === "light" || schemeRaw === "no-preference"
        ? (schemeRaw as "dark" | "light" | "no-preference")
        : schemeRaw === "none"
          ? null
          : undefined;
    if (colorScheme === undefined)
      return c.json({ error: "colorScheme must be dark|light|no-preference|none" }, 400);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "media emulation");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.emulateMediaViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        colorScheme,
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/set/timezone", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const timezoneId = toStringOrEmpty(body.timezoneId);
    if (!timezoneId) return c.json({ error: "timezoneId is required" }, 400);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "timezone");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.setTimezoneViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        timezoneId,
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/set/locale", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const locale = toStringOrEmpty(body.locale);
    if (!locale) return c.json({ error: "locale is required" }, 400);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "locale");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.setLocaleViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        locale,
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/set/device", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const name = toStringOrEmpty(body.name);
    if (!name) return c.json({ error: "name is required" }, 400);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "device emulation");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.setDeviceViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        name,
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });
}
