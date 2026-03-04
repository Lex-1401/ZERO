/**
 * Browser CDP HTTP Helpers
 *
 * Lightweight fetch wrappers for CDP JSON endpoints.
 * Extracted for Atomic Modularity (< 500 lines).
 *
 * @module browser/cdp-http
 */

import { getHeadersWithAuth, normalizeCdpWsUrl } from "./cdp.js";

/**
 * Normalize a CDP WebSocket URL to use the correct base URL.
 */
export function normalizeWsUrl(raw: string | undefined, cdpBaseUrl: string): string | undefined {
    if (!raw) return undefined;
    try {
        return normalizeCdpWsUrl(raw, cdpBaseUrl);
    } catch {
        return raw;
    }
}

export async function fetchJson<T>(url: string, timeoutMs = 1500, init?: RequestInit): Promise<T> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const headers = getHeadersWithAuth(url, (init?.headers as Record<string, string>) || {});
        const res = await fetch(url, { ...init, headers, signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as T;
    } finally {
        clearTimeout(t);
    }
}

export async function fetchOk(url: string, timeoutMs = 1500, init?: RequestInit): Promise<void> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const headers = getHeadersWithAuth(url, (init?.headers as Record<string, string>) || {});
        const res = await fetch(url, { ...init, headers, signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } finally {
        clearTimeout(t);
    }
}
