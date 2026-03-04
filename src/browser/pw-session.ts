import type {
  Browser,
  BrowserContext,
  ConsoleMessage,
  Page,
  Request,
  Response,
} from "playwright-core";
import { chromium } from "playwright-core";
import { formatErrorMessage } from "../infra/errors.js";
import { getHeadersWithAuth } from "./cdp.helpers.js";
import { getChromeWebSocketUrl } from "./chrome.js";

import {
  type BrowserConsoleMessage,
  type BrowserPageError,
  type BrowserNetworkRequest,
  type PageState,
  type ContextState,
  type RoleRefs,
  type ConnectedBrowser,
} from "./pw-session/types.js";

import {
  pageStates,
  contextStates,
  observedContexts,
  observedPages,
  MAX_CONSOLE_MESSAGES,
  MAX_PAGE_ERRORS,
  MAX_NETWORK_REQUESTS,
  roleRefsByTarget,
} from "./pw-session/state.js";

import {
  normalizeCdpUrl,
  roleRefsKey,
  rememberRoleRefsForTarget,
  pageTargetId,
  findPageByTargetId,
  getAllPages,
} from "./pw-session/utils.js";

export {
  type BrowserConsoleMessage,
  type BrowserPageError,
  type BrowserNetworkRequest
} from "./pw-session/types.js";

let cached: ConnectedBrowser | null = null;
let connecting: Promise<ConnectedBrowser> | null = null;

export function storeRoleRefsForTarget(opts: {
  page: Page;
  cdpUrl: string;
  targetId?: string;
  refs: RoleRefs;
  frameSelector?: string;
  mode: NonNullable<PageState["roleRefsMode"]>;
}): void {
  const state = ensurePageState(opts.page);
  state.roleRefs = opts.refs;
  state.roleRefsFrameSelector = opts.frameSelector;
  state.roleRefsMode = opts.mode;
  if (!opts.targetId?.trim()) return;
  rememberRoleRefsForTarget({
    cdpUrl: opts.cdpUrl,
    targetId: opts.targetId,
    refs: opts.refs,
    frameSelector: opts.frameSelector,
    mode: opts.mode,
  });
}

export function restoreRoleRefsForTarget(opts: {
  cdpUrl: string;
  targetId?: string;
  page: Page;
}): void {
  const targetId = opts.targetId?.trim() || "";
  if (!targetId) return;
  // @ts-ignore
  const cachedRefs = roleRefsByTarget.get(roleRefsKey(opts.cdpUrl, targetId));
  if (!cachedRefs) return;
  const state = ensurePageState(opts.page);
  if (state.roleRefs) return;
  state.roleRefs = cachedRefs.refs;
  state.roleRefsFrameSelector = cachedRefs.frameSelector;
  state.roleRefsMode = cachedRefs.mode;
}

export function ensurePageState(page: Page): PageState {
  const existing = pageStates.get(page);
  if (existing) return existing;

  const state: PageState = {
    console: [],
    errors: [],
    requests: [],
    requestIds: new WeakMap(),
    nextRequestId: 0,
    armIdUpload: 0,
    armIdDialog: 0,
    armIdDownload: 0,
  };
  pageStates.set(page, state);

  if (!observedPages.has(page)) {
    observedPages.add(page);
    page.on("console", (msg: ConsoleMessage) => {
      const entry: BrowserConsoleMessage = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString(),
        location: msg.location(),
      };
      state.console.push(entry);
      if (state.console.length > MAX_CONSOLE_MESSAGES) state.console.shift();
    });
    page.on("pageerror", (err: Error) => {
      state.errors.push({
        message: err?.message ? String(err.message) : String(err),
        name: err?.name ? String(err.name) : undefined,
        stack: err?.stack ? String(err.stack) : undefined,
        timestamp: new Date().toISOString(),
      });
      if (state.errors.length > MAX_PAGE_ERRORS) state.errors.shift();
    });
    page.on("request", (req: Request) => {
      state.nextRequestId += 1;
      const id = `r${state.nextRequestId}`;
      state.requestIds.set(req, id);
      state.requests.push({
        id,
        timestamp: new Date().toISOString(),
        method: req.method(),
        url: req.url(),
        resourceType: req.resourceType(),
      });
      if (state.requests.length > MAX_NETWORK_REQUESTS) state.requests.shift();
    });
    page.on("response", (resp: Response) => {
      const req = resp.request();
      const id = state.requestIds.get(req);
      if (!id) return;
      let rec: BrowserNetworkRequest | undefined;
      for (let i = state.requests.length - 1; i >= 0; i -= 1) {
        const candidate = state.requests[i];
        if (candidate && candidate.id === id) {
          rec = candidate;
          break;
        }
      }
      if (!rec) return;
      rec.status = resp.status();
      rec.ok = resp.ok();
    });
    page.on("requestfailed", (req: Request) => {
      const id = state.requestIds.get(req);
      if (!id) return;
      let rec: BrowserNetworkRequest | undefined;
      for (let i = state.requests.length - 1; i >= 0; i -= 1) {
        const candidate = state.requests[i];
        if (candidate && candidate.id === id) {
          rec = candidate;
          break;
        }
      }
      if (!rec) return;
      rec.failureText = req.failure()?.errorText;
      rec.ok = false;
    });
    page.on("close", () => {
      pageStates.delete(page);
      observedPages.delete(page);
    });
  }

  return state;
}

function observeContext(context: BrowserContext) {
  if (observedContexts.has(context)) return;
  observedContexts.add(context);
  ensureContextState(context);

  for (const page of context.pages()) ensurePageState(page);
  context.on("page", (page) => ensurePageState(page));
}

export function ensureContextState(context: BrowserContext): ContextState {
  const existing = contextStates.get(context);
  if (existing) return existing;
  const state: ContextState = { traceActive: false };
  contextStates.set(context, state);
  return state;
}

function observeBrowser(browser: Browser) {
  for (const context of browser.contexts()) observeContext(context);
}

export async function connectBrowser(cdpUrl: string): Promise<ConnectedBrowser> {
  const normalized = normalizeCdpUrl(cdpUrl);
  if (cached?.cdpUrl === normalized) return cached;
  if (connecting) return await connecting;

  const connectWithRetry = async (): Promise<ConnectedBrowser> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const timeout = 5000 + attempt * 2000;
        const wsUrl = await getChromeWebSocketUrl(normalized, timeout).catch(() => null);
        const endpoint = wsUrl ?? normalized;
        const headers = getHeadersWithAuth(endpoint);
        const browser = await chromium.connectOverCDP(endpoint, { timeout, headers });
        const connected: ConnectedBrowser = { browser, cdpUrl: normalized };
        cached = connected;
        observeBrowser(browser);
        browser.on("disconnected", () => {
          if (cached?.browser === browser) cached = null;
        });
        return connected;
      } catch (err) {
        lastErr = err;
        const delay = 250 + attempt * 250;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    const message = lastErr instanceof Error ? lastErr.message : (lastErr ? formatErrorMessage(lastErr) : "CDP connect failed");
    throw new Error(message);
  };

  connecting = connectWithRetry().finally(() => {
    connecting = null;
  });

  return await connecting;
}

export async function getPageForTargetId(opts: {
  cdpUrl: string;
  targetId?: string;
}): Promise<Page> {
  const { browser } = await connectBrowser(opts.cdpUrl);
  const pages = await getAllPages(browser);
  if (!pages.length) throw new Error("No pages available in the connected browser.");
  const first = pages[0];
  if (!opts.targetId) return first;
  const found = await findPageByTargetId(browser, opts.targetId);
  if (!found) {
    if (pages.length === 1) return first;
    throw new Error("tab not found");
  }
  return found;
}

export function refLocator(page: Page, ref: string) {
  const normalized = ref.startsWith("@")
    ? ref.slice(1)
    : ref.startsWith("ref=")
      ? ref.slice(4)
      : ref;

  if (/^e\d+$/.test(normalized)) {
    const state = pageStates.get(page);
    if (state?.roleRefsMode === "aria") {
      const scope = state.roleRefsFrameSelector
        ? page.frameLocator(state.roleRefsFrameSelector)
        : page;
      return scope.locator(`aria-ref=${normalized}`);
    }
    const info = state?.roleRefs?.[normalized];
    if (!info) {
      throw new Error(`Unknown ref "${normalized}". Run a new snapshot.`);
    }
    const scope = state?.roleRefsFrameSelector
      ? page.frameLocator(state.roleRefsFrameSelector)
      : page;
    const locator = info.name
      ? (scope as any).getByRole(info.role as any, { name: info.name, exact: true })
      : (scope as any).getByRole(info.role as any);
    return info.nth !== undefined ? locator.nth(info.nth) : locator;
  }

  return page.locator(`aria-ref=${normalized}`);
}

export async function closePlaywrightBrowserConnection(): Promise<void> {
  const cur = cached;
  cached = null;
  if (!cur) return;
  await cur.browser.close().catch(() => { });
}

export async function listPagesViaPlaywright(opts: { cdpUrl: string }) {
  const { browser } = await connectBrowser(opts.cdpUrl);
  const pages = await getAllPages(browser);
  const results = [];
  for (const page of pages) {
    const tid = await pageTargetId(page).catch(() => null);
    if (tid) {
      results.push({
        targetId: tid,
        title: await page.title().catch(() => ""),
        url: page.url(),
        type: "page",
      });
    }
  }
  return results;
}

export async function createPageViaPlaywright(opts: { cdpUrl: string; url: string }) {
  const { browser } = await connectBrowser(opts.cdpUrl);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  ensureContextState(context);
  const page = await context.newPage();
  ensurePageState(page);
  const targetUrl = opts.url.trim() || "about:blank";
  if (targetUrl !== "about:blank") await page.goto(targetUrl, { timeout: 30_000 }).catch(() => { });
  const tid = await pageTargetId(page).catch(() => null);
  if (!tid) throw new Error("Failed to get targetId for new page");
  return { targetId: tid, title: await page.title().catch(() => ""), url: page.url(), type: "page" };
}

export async function closePageByTargetIdViaPlaywright(opts: { cdpUrl: string; targetId: string }) {
  const { browser } = await connectBrowser(opts.cdpUrl);
  const page = await findPageByTargetId(browser, opts.targetId);
  if (!page) throw new Error("tab not found");
  await page.close();
}

export async function focusPageByTargetIdViaPlaywright(opts: { cdpUrl: string; targetId: string }) {
  const { browser } = await connectBrowser(opts.cdpUrl);
  const page = await findPageByTargetId(browser, opts.targetId);
  if (!page) throw new Error("tab not found");
  try {
    await page.bringToFront();
  } catch {
    const session = await page.context().newCDPSession(page);
    try {
      await session.send("Page.bringToFront");
    } finally {
      await session.detach().catch(() => { });
    }
  }
}

