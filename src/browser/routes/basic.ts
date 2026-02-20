import type { Hono } from "hono";

import { resolveBrowserExecutableForPlatform } from "../chrome.executables.js";
import { createBrowserProfilesService } from "../profiles-service.js";
import type { BrowserRouteContext } from "../server-context.js";
import { getProfileContext, toStringOrEmpty } from "./utils.js";

export function registerBrowserBasicRoutes(app: Hono, ctx: BrowserRouteContext) {
  // List all profiles with their status
  app.get("/profiles", async (c) => {
    try {
      const service = createBrowserProfilesService(ctx);
      const profiles = await service.listProfiles();
      return c.json({ profiles });
    } catch (err) {
      return c.json({ error: String(err) }, 500);
    }
  });

  // Get status (profile-aware)
  app.get("/", async (c) => {
    let current: ReturnType<typeof ctx.state>;
    try {
      current = ctx.state();
    } catch {
      return c.json({ error: "browser server not started" }, 503);
    }

    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) {
      return c.json({ error: profileCtx.error }, profileCtx.status as any);
    }

    const [cdpHttp, cdpReady] = await Promise.all([
      profileCtx.isHttpReachable(300),
      profileCtx.isReachable(600),
    ]);

    const profileState = current.profiles.get(profileCtx.profile.name);
    let detectedBrowser: string | null = null;
    let detectedExecutablePath: string | null = null;
    let detectError: string | null = null;

    try {
      const detected = resolveBrowserExecutableForPlatform(current.resolved, process.platform);
      if (detected) {
        detectedBrowser = detected.kind;
        detectedExecutablePath = detected.path;
      }
    } catch (err) {
      detectError = String(err);
    }

    return c.json({
      enabled: current.resolved.enabled,
      controlUrl: current.resolved.controlUrl,
      profile: profileCtx.profile.name,
      running: cdpReady,
      cdpReady,
      cdpHttp,
      pid: profileState?.running?.pid ?? null,
      cdpPort: profileCtx.profile.cdpPort,
      cdpUrl: profileCtx.profile.cdpUrl,
      chosenBrowser: profileState?.running?.exe.kind ?? null,
      detectedBrowser,
      detectedExecutablePath,
      detectError,
      userDataDir: profileState?.running?.userDataDir ?? null,
      color: profileCtx.profile.color,
      headless: current.resolved.headless,
      noSandbox: current.resolved.noSandbox,
      executablePath: current.resolved.executablePath ?? null,
      attachOnly: current.resolved.attachOnly,
    });
  });

  // Start browser (profile-aware)
  app.post("/start", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) {
      return c.json({ error: profileCtx.error }, profileCtx.status as any);
    }

    try {
      await profileCtx.ensureBrowserAvailable();
      return c.json({ ok: true, profile: profileCtx.profile.name });
    } catch (err) {
      return c.json({ error: String(err) }, 500);
    }
  });

  // Stop browser (profile-aware)
  app.post("/stop", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) {
      return c.json({ error: profileCtx.error }, profileCtx.status as any);
    }

    try {
      const result = await profileCtx.stopRunningBrowser();
      return c.json({
        ok: true,
        stopped: result.stopped,
        profile: profileCtx.profile.name,
      });
    } catch (err) {
      return c.json({ error: String(err) }, 500);
    }
  });

  // Reset profile (profile-aware)
  app.post("/reset-profile", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) {
      return c.json({ error: profileCtx.error }, profileCtx.status as any);
    }

    try {
      const result = await profileCtx.resetProfile();
      return c.json({ ok: true, profile: profileCtx.profile.name, ...result });
    } catch (err) {
      return c.json({ error: String(err) }, 500);
    }
  });

  // Create a new profile
  app.post("/profiles/create", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const name = toStringOrEmpty(body.name);
    const color = toStringOrEmpty(body.color);
    const cdpUrl = toStringOrEmpty(body.cdpUrl);
    const driver = toStringOrEmpty(body.driver) as "zero" | "extension" | "";

    if (!name) return c.json({ error: "name is required" }, 400);

    try {
      const service = createBrowserProfilesService(ctx);
      const result = await service.createProfile({
        name,
        color: color || undefined,
        cdpUrl: cdpUrl || undefined,
        driver: driver === "extension" ? "extension" : undefined,
      });
      return c.json(result);
    } catch (err) {
      const msg = String(err);
      if (msg.includes("already exists")) return c.json({ error: msg }, 409);
      if (msg.includes("invalid profile name")) return c.json({ error: msg }, 400);
      if (msg.includes("no available CDP ports")) return c.json({ error: msg }, 507);
      if (msg.includes("cdpUrl")) return c.json({ error: msg }, 400);
      return c.json({ error: msg }, 500);
    }
  });

  // Delete a profile
  app.delete("/profiles/:name", async (c) => {
    const name = toStringOrEmpty(c.req.param("name"));
    if (!name) return c.json({ error: "profile name is required" }, 400);

    try {
      const service = createBrowserProfilesService(ctx);
      const result = await service.deleteProfile(name);
      return c.json(result);
    } catch (err) {
      const msg = String(err);
      if (msg.includes("invalid profile name")) return c.json({ error: msg }, 400);
      if (msg.includes("default profile")) return c.json({ error: msg }, 400);
      if (msg.includes("not found")) return c.json({ error: msg }, 404);
      return c.json({ error: msg }, 500);
    }
  });
}
