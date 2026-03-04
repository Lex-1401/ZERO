
export function normalizeWsUrl(raw: string | undefined, cdpBaseUrl: string): string | undefined {
    if (!raw) return undefined;
    if (raw.startsWith("ws://") || raw.startsWith("wss://")) return raw;
    return `ws://${cdpBaseUrl}${raw}`;
}

export async function fetchJson<T>(url: string, timeoutMs = 1500, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    return await res.json();
}
