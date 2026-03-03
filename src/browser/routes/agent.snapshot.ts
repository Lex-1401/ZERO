import path from "node:path";
import type { Hono } from "hono";

import { ensureMediaDir, saveMediaBuffer } from "../../media/store.js";
import { captureScreenshot, snapshotAria } from "../cdp.js";
import {
  DEFAULT_AI_SNAPSHOT_EFFICIENT_DEPTH,
  DEFAULT_AI_SNAPSHOT_EFFICIENT_MAX_CHARS,
  DEFAULT_AI_SNAPSHOT_MAX_CHARS,
} from "../constants.js";
import {
  DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES,
  DEFAULT_BROWSER_SCREENSHOT_MAX_SIDE,
  normalizeBrowserScreenshot,
} from "../screenshot.js";
import type { BrowserRouteContext } from "../server-context.js";
import { getPwAiModule, handleRouteError } from "./agent.shared.js";
import { requirePwAi } from "./agent.shared.js";
import { getProfileContext, toBoolean, toNumber, toStringOrEmpty } from "./utils.js";

export function registerBrowserAgentSnapshotRoutes(app: Hono, ctx: BrowserRouteContext) {
  app.post("/navigate", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const url = toStringOrEmpty(body.url);
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    if (!url) return c.json({ error: "url is required" }, 400);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "navigate");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      const result = await pw.navigateViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        url,
      });
      return c.json({ ok: true, targetId: tab.targetId, ...result });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/pdf", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "pdf");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      const pdf = await pw.pdfViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
      });
      await ensureMediaDir();
      const saved = await saveMediaBuffer(
        pdf.buffer,
        "application/pdf",
        "browser",
        pdf.buffer.byteLength,
      );
      return c.json({
        ok: true,
        path: path.resolve(saved.path),
        targetId: tab.targetId,
        url: tab.url,
      });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/screenshot", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const fullPage = toBoolean(body.fullPage) ?? false;
    const ref = toStringOrEmpty(body.ref) || undefined;
    const element = toStringOrEmpty(body.element) || undefined;
    const type = body.type === "jpeg" ? "jpeg" : "png";

    if (fullPage && (ref || element)) {
      return c.json({ error: "fullPage is not supported for element screenshots" }, 400);
    }

    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      let buffer: Buffer;
      const shouldUsePlaywright =
        profileCtx.profile.driver === "extension" || !tab.wsUrl || Boolean(ref) || Boolean(element);
      if (shouldUsePlaywright) {
        const pwResult = await requirePwAi(c, "screenshot");
        if ("response" in pwResult) return pwResult.response;
        const pw = pwResult.mod;

        const snap = await pw.takeScreenshotViaPlaywright({
          cdpUrl: profileCtx.profile.cdpUrl,
          targetId: tab.targetId,
          ref,
          element,
          fullPage,
          type,
        });
        buffer = snap.buffer;
      } else {
        buffer = await captureScreenshot({
          wsUrl: tab.wsUrl ?? "",
          fullPage,
          format: type,
          quality: type === "jpeg" ? 85 : undefined,
        });
      }

      const normalized = await normalizeBrowserScreenshot(buffer, {
        maxSide: DEFAULT_BROWSER_SCREENSHOT_MAX_SIDE,
        maxBytes: DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES,
      });
      await ensureMediaDir();
      const saved = await saveMediaBuffer(
        normalized.buffer,
        normalized.contentType ?? `image/${type}`,
        "browser",
        DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES,
      );
      return c.json({
        ok: true,
        path: path.resolve(saved.path),
        targetId: tab.targetId,
        url: tab.url,
      });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.get("/snapshot", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) return c.json({ error: profileCtx.error }, profileCtx.status as any);

    const targetId = c.req.query("targetId")?.trim() || "";
    const mode = c.req.query("mode") === "efficient" ? "efficient" : undefined;
    const labels = toBoolean(c.req.query("labels")) ?? undefined;
    const explicitFormat =
      c.req.query("format") === "aria" ? "aria" : c.req.query("format") === "ai" ? "ai" : undefined;
    const format = explicitFormat ?? (mode ? "ai" : (await getPwAiModule()) ? "ai" : "aria");
    const limitRaw = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
    const hasMaxChars = c.req.query("maxChars") !== undefined;
    const maxCharsRaw = c.req.query("maxChars") ? Number(c.req.query("maxChars")) : undefined;
    const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;
    const maxChars =
      typeof maxCharsRaw === "number" && Number.isFinite(maxCharsRaw) && maxCharsRaw > 0
        ? Math.floor(maxCharsRaw)
        : undefined;
    const resolvedMaxChars =
      format === "ai"
        ? hasMaxChars
          ? maxChars
          : mode === "efficient"
            ? DEFAULT_AI_SNAPSHOT_EFFICIENT_MAX_CHARS
            : DEFAULT_AI_SNAPSHOT_MAX_CHARS
        : undefined;
    const interactiveRaw = toBoolean(c.req.query("interactive"));
    const compactRaw = toBoolean(c.req.query("compact"));
    const depthRaw = toNumber(c.req.query("depth"));
    const refsModeRaw = toStringOrEmpty(c.req.query("refs")).trim();
    const refsMode = refsModeRaw === "aria" ? "aria" : refsModeRaw === "role" ? "role" : undefined;
    const interactive = interactiveRaw ?? (mode === "efficient" ? true : undefined);
    const compact = compactRaw ?? (mode === "efficient" ? true : undefined);
    const depth =
      depthRaw ?? (mode === "efficient" ? DEFAULT_AI_SNAPSHOT_EFFICIENT_DEPTH : undefined);
    const selector = toStringOrEmpty(c.req.query("selector"));
    const frameSelector = toStringOrEmpty(c.req.query("frame"));

    try {
      const tab = await profileCtx.ensureTabAvailable(targetId || undefined);
      if ((labels || mode === "efficient") && format === "aria") {
        return c.json({ error: "labels/mode=efficient require format=ai" }, 400);
      }
      if (format === "ai") {
        const pwResult = await requirePwAi(c, "ai snapshot");
        if ("response" in pwResult) return pwResult.response;
        const pw = pwResult.mod;

        const wantsRoleSnapshot =
          labels === true ||
          mode === "efficient" ||
          interactive === true ||
          compact === true ||
          depth !== undefined ||
          Boolean(selector.trim()) ||
          Boolean(frameSelector.trim());

        const snap = wantsRoleSnapshot
          ? await pw.snapshotRoleViaPlaywright({
              cdpUrl: profileCtx.profile.cdpUrl,
              targetId: tab.targetId,
              selector: selector.trim() || undefined,
              frameSelector: frameSelector.trim() || undefined,
              refsMode,
              options: {
                interactive: interactive ?? undefined,
                compact: compact ?? undefined,
                maxDepth: depth ?? undefined,
              },
            })
          : await pw
              .snapshotAiViaPlaywright({
                cdpUrl: profileCtx.profile.cdpUrl,
                targetId: tab.targetId,
                ...(typeof resolvedMaxChars === "number" ? { maxChars: resolvedMaxChars } : {}),
              })
              .catch(async (err) => {
                // Public-API fallback when Playwright's private _snapshotForAI is missing.
                if (String(err).toLowerCase().includes("_snapshotforai")) {
                  return await pw.snapshotRoleViaPlaywright({
                    cdpUrl: profileCtx.profile.cdpUrl,
                    targetId: tab.targetId,
                    selector: selector.trim() || undefined,
                    frameSelector: frameSelector.trim() || undefined,
                    refsMode,
                    options: {
                      interactive: interactive ?? undefined,
                      compact: compact ?? undefined,
                      maxDepth: depth ?? undefined,
                    },
                  });
                }
                throw err;
              });
        if (labels) {
          const labeled = await pw.screenshotWithLabelsViaPlaywright({
            cdpUrl: profileCtx.profile.cdpUrl,
            targetId: tab.targetId,
            refs: "refs" in snap ? snap.refs : {},
            type: "png",
          });
          const normalized = await normalizeBrowserScreenshot(labeled.buffer, {
            maxSide: DEFAULT_BROWSER_SCREENSHOT_MAX_SIDE,
            maxBytes: DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES,
          });
          await ensureMediaDir();
          const saved = await saveMediaBuffer(
            normalized.buffer,
            normalized.contentType ?? "image/png",
            "browser",
            DEFAULT_BROWSER_SCREENSHOT_MAX_BYTES,
          );
          const imageType = normalized.contentType?.includes("jpeg") ? "jpeg" : "png";
          return c.json({
            ok: true,
            format,
            targetId: tab.targetId,
            url: tab.url,
            labels: true,
            labelsCount: labeled.labels,
            labelsSkipped: labeled.skipped,
            imagePath: path.resolve(saved.path),
            imageType,
            ...snap,
          });
        }

        return c.json({
          ok: true,
          format,
          targetId: tab.targetId,
          url: tab.url,
          ...snap,
        });
      }

      let resolved: any;
      if (profileCtx.profile.driver === "extension" || !tab.wsUrl) {
        const pwResult = await requirePwAi(c, "aria snapshot");
        if ("response" in pwResult) return pwResult.response;
        resolved = await pwResult.mod.snapshotAriaViaPlaywright({
          cdpUrl: profileCtx.profile.cdpUrl,
          targetId: tab.targetId,
          limit,
        });
      } else {
        resolved = await snapshotAria({ wsUrl: tab.wsUrl ?? "", limit });
      }

      if (!resolved) return c.json({ error: "snapshot failed" }, 500);
      return c.json({
        ok: true,
        format,
        targetId: tab.targetId,
        url: tab.url,
        ...resolved,
      });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });
}
