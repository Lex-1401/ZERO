
import type { Page, BrowserContext } from "playwright-core";
import type { PageState, ContextState, RoleRefsCacheEntry, ConnectedBrowser } from "./types.js";

export const pageStates = new WeakMap<Page, PageState>();
export const contextStates = new WeakMap<BrowserContext, ContextState>();
export const observedContexts = new WeakSet<BrowserContext>();
export const observedPages = new WeakSet<Page>();

export const roleRefsByTarget = new Map<string, RoleRefsCacheEntry>();
export const MAX_ROLE_REFS_CACHE = 50;

export const MAX_CONSOLE_MESSAGES = 500;
export const MAX_PAGE_ERRORS = 200;
export const MAX_NETWORK_REQUESTS = 500;

export let cached: ConnectedBrowser | null = null;
export let connecting: Promise<ConnectedBrowser> | null = null;

export function setCached(val: ConnectedBrowser | null) {
    // @ts-ignore
    cached = val;
}

export function setConnecting(val: Promise<ConnectedBrowser> | null) {
    // @ts-ignore
    connecting = val;
}
