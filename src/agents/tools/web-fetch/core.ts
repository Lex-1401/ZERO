// @ts-ignore
import type { Response } from "node-fetch"; // Assuming fetch and Response are available globally in the target environment or polyfilled
import type { ZEROConfig } from "../../../config/config.js";
import { assertPublicHostname, SsrFBlockedError } from "../../../infra/net/ssrf.js";
import { SentinelAgent } from "../../sentinel.js";
import { getImpersonatedHeaders, type ImpersonateMode } from "../web-headers.js";
import {
  readCache,
  writeCache,
  normalizeCacheKey,
  cleanupCache,
  withTimeout,
  readResponseText,
  type CacheEntry,
} from "../web-shared.js";
import { extractReadableContent, truncateText, type ExtractMode } from "../web-fetch-utils.js";
import { isRedirectStatus, formatWebFetchErrorDetail, sanitizeWebContent } from "./helpers.js";
import { fetchFirecrawlContent, tryFirecrawlFallback } from "./firecrawl.js";
import { DEFAULT_ERROR_MAX_CHARS } from "./types.js";

export const FETCH_CACHE = new Map<string, CacheEntry<Record<string, unknown>>>();

// PERF-001: Eviction periódica de entradas expiradas (a cada 5 min)
const _fetchCacheCleanupTimer = setInterval(() => cleanupCache(FETCH_CACHE), 5 * 60_000);
if (typeof _fetchCacheCleanupTimer === "object" && "unref" in _fetchCacheCleanupTimer) {
  _fetchCacheCleanupTimer.unref();
}

async function fetchWithRedirects(params: {
  url: string;
  maxRedirects: number;
  timeoutSeconds: number;
  userAgent: string;
  impersonateMode?: ImpersonateMode;
}): Promise<{ response: Response; finalUrl: string }> {
  const signal = withTimeout(undefined, params.timeoutSeconds * 1000);
  const visited = new Set<string>();
  let currentUrl = params.url;
  let redirectCount = 0;

  while (true) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(currentUrl);
    } catch {
      throw new Error("Invalid URL: must be http or https");
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid URL: must be http or https");
    }

    await assertPublicHostname(parsedUrl.hostname);

    const headers = params.impersonateMode
      ? getImpersonatedHeaders(params.impersonateMode, parsedUrl.toString())
      : {
        Accept: "*/*",
        "User-Agent": params.userAgent,
        "Accept-Language": "en-US,en;q=0.9",
      };

    const res = await (fetch as any)(parsedUrl.toString(), {
      method: "GET",
      headers,
      signal,
      redirect: "manual",
    });

    if (isRedirectStatus(res.status)) {
      const location = res.headers.get("location");
      if (!location) {
        throw new Error(`Redirect missing location header (${res.status})`);
      }
      redirectCount += 1;
      if (redirectCount > params.maxRedirects) {
        throw new Error(`Too many redirects (limit: ${params.maxRedirects})`);
      }
      const nextUrl = new URL(location, parsedUrl).toString();
      if (visited.has(nextUrl)) {
        throw new Error("Redirect loop detected");
      }
      visited.add(nextUrl);
      void res.body?.cancel();
      currentUrl = nextUrl;
      continue;
    }

    return { response: res, finalUrl: currentUrl };
  }
}

export async function runWebFetch(params: {
  url: string;
  extractMode: ExtractMode;
  maxChars: number;
  maxRedirects: number;
  timeoutSeconds: number;
  cacheTtlMs: number;
  userAgent: string;
  readabilityEnabled: boolean;
  firecrawlEnabled: boolean;
  firecrawlApiKey?: string;
  firecrawlBaseUrl: string;
  firecrawlOnlyMainContent: boolean;
  firecrawlMaxAgeMs: number;
  firecrawlProxy: "auto" | "basic" | "stealth";
  firecrawlStoreInCache: boolean;
  firecrawlTimeoutSeconds: number;
  impersonateMode?: ImpersonateMode;
  config?: ZEROConfig;
}): Promise<Record<string, unknown>> {
  const cacheKey = normalizeCacheKey(
    `fetch:${params.url}:${params.extractMode}:${params.maxChars}`,
  );
  const cached = readCache(FETCH_CACHE, cacheKey);
  if (cached) return { ...cached.value, cached: true };

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(params.url);
  } catch {
    throw new Error("Invalid URL: must be http or https");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Invalid URL: must be http or https");
  }

  const start = Date.now();
  let res: any;
  let finalUrl = params.url;
  try {
    const result = await fetchWithRedirects({
      url: params.url,
      maxRedirects: params.maxRedirects,
      timeoutSeconds: params.timeoutSeconds,
      userAgent: params.userAgent,
      impersonateMode: params.impersonateMode,
    });
    res = result.response;
    finalUrl = result.finalUrl;
  } catch (error: any) {
    if (error instanceof SsrFBlockedError) {
      throw error;
    }
    if (params.firecrawlEnabled && params.firecrawlApiKey) {
      const firecrawl = await fetchFirecrawlContent({
        url: finalUrl,
        extractMode: params.extractMode,
        apiKey: params.firecrawlApiKey,
        baseUrl: params.firecrawlBaseUrl,
        onlyMainContent: params.firecrawlOnlyMainContent,
        maxAgeMs: params.firecrawlMaxAgeMs,
        proxy: params.firecrawlProxy,
        storeInCache: params.firecrawlStoreInCache,
        timeoutSeconds: params.firecrawlTimeoutSeconds,
      });
      const truncated = truncateText(firecrawl.text, params.maxChars);
      const payload = {
        url: params.url,
        finalUrl: firecrawl.finalUrl || finalUrl,
        status: firecrawl.status ?? 200,
        contentType: "text/markdown",
        title: firecrawl.title,
        extractMode: params.extractMode,
        extractor: "firecrawl",
        truncated: truncated.truncated,
        length: truncated.text.length,
        fetchedAt: new Date().toISOString(),
        tookMs: Date.now() - start,
        text: truncated.text,
        warning: firecrawl.warning,
      };
      writeCache(FETCH_CACHE, cacheKey, payload, params.cacheTtlMs);
      return payload;
    }
    throw error;
  }

  if (!res.ok) {
    if (params.firecrawlEnabled && params.firecrawlApiKey) {
      const firecrawl = await fetchFirecrawlContent({
        url: params.url,
        extractMode: params.extractMode,
        apiKey: params.firecrawlApiKey,
        baseUrl: params.firecrawlBaseUrl,
        onlyMainContent: params.firecrawlOnlyMainContent,
        maxAgeMs: params.firecrawlMaxAgeMs,
        proxy: params.firecrawlProxy,
        storeInCache: params.firecrawlStoreInCache,
        timeoutSeconds: params.firecrawlTimeoutSeconds,
      });
      const truncated = truncateText(firecrawl.text, params.maxChars);
      const payload = {
        url: params.url,
        finalUrl: firecrawl.finalUrl || finalUrl,
        status: firecrawl.status ?? res.status,
        contentType: "text/markdown",
        title: firecrawl.title,
        extractMode: params.extractMode,
        extractor: "firecrawl",
        truncated: truncated.truncated,
        length: truncated.text.length,
        fetchedAt: new Date().toISOString(),
        tookMs: Date.now() - start,
        text: truncated.text,
        warning: firecrawl.warning,
      };
      writeCache(FETCH_CACHE, cacheKey, payload, params.cacheTtlMs);
      return payload;
    }
    const rawDetail = await readResponseText(res);
    const detail = formatWebFetchErrorDetail({
      detail: rawDetail,
      contentType: res.headers.get("content-type"),
      maxChars: DEFAULT_ERROR_MAX_CHARS,
    });
    throw new Error(`Web fetch failed (${res.status}): ${detail || res.statusText}`);
  }

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const body = await readResponseText(res);

  let title: string | undefined;
  let extractor = "raw";
  let text = body;
  if (contentType.includes("text/html")) {
    if (params.readabilityEnabled) {
      const readable = await extractReadableContent({
        html: body,
        url: finalUrl,
        extractMode: params.extractMode,
      });
      if (readable?.text) {
        text = readable.text;
        title = readable.title;
        extractor = "readability";
      } else {
        const firecrawl = await tryFirecrawlFallback({ ...params, url: finalUrl });
        if (firecrawl) {
          text = firecrawl.text;
          title = firecrawl.title;
          extractor = "firecrawl";
        } else {
          throw new Error(
            "Web fetch extraction failed: Readability and Firecrawl returned no content.",
          );
        }
      }
    } else {
      throw new Error(
        "Web fetch extraction failed: Readability disabled and Firecrawl unavailable.",
      );
    }
  } else if (contentType.includes("application/json")) {
    try {
      text = JSON.stringify(JSON.parse(body), null, 2);
      extractor = "json";
    } catch {
      text = body;
      extractor = "raw";
    }
  }

  const sanitizedText = sanitizeWebContent(text);
  let finalResultText = sanitizedText;

  if (params.config) {
    const sentinel = new SentinelAgent({ config: params.config });
    finalResultText = await sentinel.summarize(sanitizedText, `URL: ${params.url}`);
  }

  const truncated = truncateText(finalResultText, params.maxChars);
  const payload = {
    url: params.url,
    finalUrl,
    status: res.status,
    contentType,
    title,
    extractMode: params.extractMode,
    extractor,
    truncated: truncated.truncated,
    length: truncated.text.length,
    fetchedAt: new Date().toISOString(),
    tookMs: Date.now() - start,
    text: truncated.text,
    sentinel: !!params.config,
  };
  writeCache(FETCH_CACHE, cacheKey, payload, params.cacheTtlMs);
  return payload;
}
