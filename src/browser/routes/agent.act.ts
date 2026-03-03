import type { Hono } from "hono";

import type { BrowserFormField } from "../client-actions-core.js";
import type { BrowserRouteContext } from "../server-context.js";
import {
  type ActKind,
  isActKind,
  parseClickButton,
  parseClickModifiers,
} from "./agent.act.shared.js";
import { handleRouteError, requirePwAi, SELECTOR_UNSUPPORTED_MESSAGE } from "./agent.shared.js";
import { getProfileContext, toBoolean, toNumber, toStringArray, toStringOrEmpty } from "./utils.js";

export function registerBrowserAgentActRoutes(app: Hono, ctx: BrowserRouteContext) {
  app.post("/act", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) {
      return c.json({ error: profileCtx.error }, profileCtx.status as any);
    }

    const body = await c.req.json().catch(() => ({}));
    const kindRaw = toStringOrEmpty(body.kind);
    if (!isActKind(kindRaw)) {
      return c.json({ error: "kind is required" }, 400);
    }
    const kind: ActKind = kindRaw;
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    if (Object.hasOwn(body, "selector") && kind !== "wait") {
      return c.json({ error: SELECTOR_UNSUPPORTED_MESSAGE }, 400);
    }

    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const cdpUrl = profileCtx.profile.cdpUrl;
      const pwResult = await requirePwAi(c, `act:${kind}`);
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      switch (kind) {
        case "click": {
          const ref = toStringOrEmpty(body.ref);
          if (!ref) return c.json({ error: "ref is required" }, 400);
          const doubleClick = toBoolean(body.doubleClick) ?? false;
          const timeoutMs = toNumber(body.timeoutMs);
          const buttonRaw = toStringOrEmpty(body.button) || "";
          const button = buttonRaw ? parseClickButton(buttonRaw) : undefined;
          if (buttonRaw && !button)
            return c.json({ error: "button must be left|right|middle" }, 400);

          const modifiersRaw = toStringArray(body.modifiers) ?? [];
          const parsedModifiers = parseClickModifiers(modifiersRaw);
          if (parsedModifiers.error) {
            return c.json({ error: parsedModifiers.error }, 400);
          }
          const modifiers = parsedModifiers.modifiers;
          const clickRequest: Parameters<typeof pw.clickViaPlaywright>[0] = {
            cdpUrl,
            targetId: tab.targetId,
            ref,
            doubleClick,
          };
          if (button) clickRequest.button = button;
          if (modifiers) clickRequest.modifiers = modifiers;
          if (timeoutMs) clickRequest.timeoutMs = timeoutMs;
          await pw.clickViaPlaywright(clickRequest);
          return c.json({ ok: true, targetId: tab.targetId, url: tab.url });
        }
        case "type": {
          const ref = toStringOrEmpty(body.ref);
          if (!ref) return c.json({ error: "ref is required" }, 400);
          if (typeof body.text !== "string") return c.json({ error: "text is required" }, 400);
          const text = body.text;
          const submit = toBoolean(body.submit) ?? false;
          const slowly = toBoolean(body.slowly) ?? false;
          const timeoutMs = toNumber(body.timeoutMs);
          const typeRequest: Parameters<typeof pw.typeViaPlaywright>[0] = {
            cdpUrl,
            targetId: tab.targetId,
            ref,
            text,
            submit,
            slowly,
          };
          if (timeoutMs) typeRequest.timeoutMs = timeoutMs;
          await pw.typeViaPlaywright(typeRequest);
          return c.json({ ok: true, targetId: tab.targetId });
        }
        case "press": {
          const key = toStringOrEmpty(body.key);
          if (!key) return c.json({ error: "key is required" }, 400);
          const delayMs = toNumber(body.delayMs);
          await pw.pressKeyViaPlaywright({
            cdpUrl,
            targetId: tab.targetId,
            key,
            delayMs: delayMs ?? undefined,
          });
          return c.json({ ok: true, targetId: tab.targetId });
        }
        case "hover": {
          const ref = toStringOrEmpty(body.ref);
          if (!ref) return c.json({ error: "ref is required" }, 400);
          const timeoutMs = toNumber(body.timeoutMs);
          await pw.hoverViaPlaywright({
            cdpUrl,
            targetId: tab.targetId,
            ref,
            timeoutMs: timeoutMs ?? undefined,
          });
          return c.json({ ok: true, targetId: tab.targetId });
        }
        case "scrollIntoView": {
          const ref = toStringOrEmpty(body.ref);
          if (!ref) return c.json({ error: "ref is required" }, 400);
          const timeoutMs = toNumber(body.timeoutMs);
          const scrollRequest: Parameters<typeof pw.scrollIntoViewViaPlaywright>[0] = {
            cdpUrl,
            targetId: tab.targetId,
            ref,
          };
          if (timeoutMs) scrollRequest.timeoutMs = timeoutMs;
          await pw.scrollIntoViewViaPlaywright(scrollRequest);
          return c.json({ ok: true, targetId: tab.targetId });
        }
        case "drag": {
          const startRef = toStringOrEmpty(body.startRef);
          const endRef = toStringOrEmpty(body.endRef);
          if (!startRef || !endRef)
            return c.json({ error: "startRef and endRef are required" }, 400);
          const timeoutMs = toNumber(body.timeoutMs);
          await pw.dragViaPlaywright({
            cdpUrl,
            targetId: tab.targetId,
            startRef,
            endRef,
            timeoutMs: timeoutMs ?? undefined,
          });
          return c.json({ ok: true, targetId: tab.targetId });
        }
        case "select": {
          const ref = toStringOrEmpty(body.ref);
          const values = toStringArray(body.values);
          if (!ref || !values?.length) return c.json({ error: "ref and values are required" }, 400);
          const timeoutMs = toNumber(body.timeoutMs);
          await pw.selectOptionViaPlaywright({
            cdpUrl,
            targetId: tab.targetId,
            ref,
            values,
            timeoutMs: timeoutMs ?? undefined,
          });
          return c.json({ ok: true, targetId: tab.targetId });
        }
        case "fill": {
          const rawFields = Array.isArray(body.fields) ? body.fields : [];
          const fields = rawFields
            .map((field: unknown) => {
              if (!field || typeof field !== "object") return null;
              const rec = field as Record<string, unknown>;
              const ref = toStringOrEmpty(rec.ref);
              const type = toStringOrEmpty(rec.type);
              if (!ref || !type) return null;
              const value =
                typeof rec.value === "string" ||
                typeof rec.value === "number" ||
                typeof rec.value === "boolean"
                  ? rec.value
                  : undefined;
              const parsed: BrowserFormField =
                value === undefined ? { ref, type } : { ref, type, value };
              return parsed;
            })
            .filter((field: BrowserFormField | null): field is BrowserFormField => field !== null);
          if (!fields.length) return c.json({ error: "fields are required" }, 400);
          const timeoutMs = toNumber(body.timeoutMs);
          await pw.fillFormViaPlaywright({
            cdpUrl,
            targetId: tab.targetId,
            fields,
            timeoutMs: timeoutMs ?? undefined,
          });
          return c.json({ ok: true, targetId: tab.targetId });
        }
        case "resize": {
          const width = toNumber(body.width);
          const height = toNumber(body.height);
          if (!width || !height) return c.json({ error: "width and height are required" }, 400);
          await pw.resizeViewportViaPlaywright({
            cdpUrl,
            targetId: tab.targetId,
            width,
            height,
          });
          return c.json({ ok: true, targetId: tab.targetId, url: tab.url });
        }
        case "wait": {
          const timeMs = toNumber(body.timeMs);
          const text = toStringOrEmpty(body.text) || undefined;
          const textGone = toStringOrEmpty(body.textGone) || undefined;
          const selector = toStringOrEmpty(body.selector) || undefined;
          const url = toStringOrEmpty(body.url) || undefined;
          const loadStateRaw = toStringOrEmpty(body.loadState);
          const loadState =
            loadStateRaw === "load" ||
            loadStateRaw === "domcontentloaded" ||
            loadStateRaw === "networkidle"
              ? (loadStateRaw as "load" | "domcontentloaded" | "networkidle")
              : undefined;
          const fn = toStringOrEmpty(body.fn) || undefined;
          const timeoutMs = toNumber(body.timeoutMs) ?? undefined;
          if (
            timeMs === undefined &&
            !text &&
            !textGone &&
            !selector &&
            !url &&
            !loadState &&
            !fn
          ) {
            return c.json(
              {
                error:
                  "wait requires at least one of: timeMs, text, textGone, selector, url, loadState, fn",
              },
              400,
            );
          }
          await pw.waitForViaPlaywright({
            cdpUrl,
            targetId: tab.targetId,
            timeMs,
            text,
            textGone,
            selector,
            url,
            loadState,
            fn,
            timeoutMs,
          });
          return c.json({ ok: true, targetId: tab.targetId });
        }
        case "evaluate": {
          const fn = toStringOrEmpty(body.fn);
          if (!fn) return c.json({ error: "fn is required" }, 400);
          const ref = toStringOrEmpty(body.ref) || undefined;
          const result = await pw.evaluateViaPlaywright({
            cdpUrl,
            targetId: tab.targetId,
            fn,
            ref,
          });
          return c.json({
            ok: true,
            targetId: tab.targetId,
            url: tab.url,
            result,
          });
        }
        case "close": {
          await pw.closePageViaPlaywright({ cdpUrl, targetId: tab.targetId });
          return c.json({ ok: true, targetId: tab.targetId });
        }
        default: {
          return c.json({ error: "unsupported kind" }, 400);
        }
      }
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/hooks/file-chooser", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) {
      return c.json({ error: profileCtx.error }, profileCtx.status as any);
    }
    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const ref = toStringOrEmpty(body.ref) || undefined;
    const inputRef = toStringOrEmpty(body.inputRef) || undefined;
    const element = toStringOrEmpty(body.element) || undefined;
    const paths = toStringArray(body.paths) ?? [];
    const timeoutMs = toNumber(body.timeoutMs);
    if (!paths.length) return c.json({ error: "paths are required" }, 400);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "file chooser hook");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      if (inputRef || element) {
        if (ref) {
          return c.json({ error: "ref cannot be combined with inputRef/element" }, 400);
        }
        await pw.setInputFilesViaPlaywright({
          cdpUrl: profileCtx.profile.cdpUrl,
          targetId: tab.targetId,
          inputRef,
          element,
          paths,
        });
      } else {
        await pw.armFileUploadViaPlaywright({
          cdpUrl: profileCtx.profile.cdpUrl,
          targetId: tab.targetId,
          paths,
          timeoutMs: timeoutMs ?? undefined,
        });
        if (ref) {
          await pw.clickViaPlaywright({
            cdpUrl: profileCtx.profile.cdpUrl,
            targetId: tab.targetId,
            ref,
          });
        }
      }
      return c.json({ ok: true });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/hooks/dialog", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) {
      return c.json({ error: profileCtx.error }, profileCtx.status as any);
    }
    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const accept = toBoolean(body.accept);
    const promptText = toStringOrEmpty(body.promptText) || undefined;
    const timeoutMs = toNumber(body.timeoutMs);
    if (accept === undefined) return c.json({ error: "accept is required" }, 400);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "dialog hook");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.armDialogViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        accept,
        promptText,
        timeoutMs: timeoutMs ?? undefined,
      });
      return c.json({ ok: true });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/wait/download", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) {
      return c.json({ error: profileCtx.error }, profileCtx.status as any);
    }
    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const out = toStringOrEmpty(body.path) || undefined;
    const timeoutMs = toNumber(body.timeoutMs);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "wait for download");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      const result = await pw.waitForDownloadViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        path: out,
        timeoutMs: timeoutMs ?? undefined,
      });
      return c.json({ ok: true, targetId: tab.targetId, download: result });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/download", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) {
      return c.json({ error: profileCtx.error }, profileCtx.status as any);
    }
    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const ref = toStringOrEmpty(body.ref);
    const out = toStringOrEmpty(body.path);
    const timeoutMs = toNumber(body.timeoutMs);
    if (!ref) return c.json({ error: "ref is required" }, 400);
    if (!out) return c.json({ error: "path is required" }, 400);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "download");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      const result = await pw.downloadViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        ref,
        path: out,
        timeoutMs: timeoutMs ?? undefined,
      });
      return c.json({ ok: true, targetId: tab.targetId, download: result });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/response/body", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) {
      return c.json({ error: profileCtx.error }, profileCtx.status as any);
    }
    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const url = toStringOrEmpty(body.url);
    const timeoutMs = toNumber(body.timeoutMs);
    const maxChars = toNumber(body.maxChars);
    if (!url) return c.json({ error: "url is required" }, 400);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "response body");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      const result = await pw.responseBodyViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        url,
        timeoutMs: timeoutMs ?? undefined,
        maxChars: maxChars ?? undefined,
      });
      return c.json({ ok: true, targetId: tab.targetId, response: result });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });

  app.post("/highlight", async (c) => {
    const profileCtx = await getProfileContext(c, ctx);
    if ("error" in profileCtx) {
      return c.json({ error: profileCtx.error }, profileCtx.status as any);
    }
    const body = await c.req.json().catch(() => ({}));
    const targetId = toStringOrEmpty(body.targetId) || undefined;
    const ref = toStringOrEmpty(body.ref);
    if (!ref) return c.json({ error: "ref is required" }, 400);
    try {
      const tab = await profileCtx.ensureTabAvailable(targetId);
      const pwResult = await requirePwAi(c, "highlight");
      if ("response" in pwResult) return pwResult.response;
      const pw = pwResult.mod;

      await pw.highlightViaPlaywright({
        cdpUrl: profileCtx.profile.cdpUrl,
        targetId: tab.targetId,
        ref,
      });
      return c.json({ ok: true, targetId: tab.targetId });
    } catch (err) {
      return handleRouteError(c, ctx, err);
    }
  });
}
