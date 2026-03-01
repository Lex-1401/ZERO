import { jsonResult, type AnyAgentTool } from "./common.js";
import {
  cleanupCache,
  normalizeCacheKey,
  readCache,
  writeCache,
  resolveCacheTtlMs,
  resolveTimeoutSeconds,
  DEFAULT_CACHE_TTL_MINUTES,
  DEFAULT_TIMEOUT_SECONDS,
  type CacheEntry,
} from "./web-shared.js";
import { SentinelAgent } from "../sentinel.js";
import type { ZEROConfig } from "../../config/config.js";
import {
  WebSearchSchema,
  DEFAULT_SEARCH_COUNT,
} from "./web-search/types.js";
import {
  resolveSearchConfig,
  resolveSearchEnabled,
  resolveSearchProvider,
  resolvePerplexityConfig,
  resolvePerplexityApiKey,
  resolveSearchApiKey,
  resolveSearchCount,
  normalizeFreshness,
  resolvePerplexityBaseUrl,
  resolvePerplexityModel,
  missingSearchKeyPayload,
} from "./web-search/helpers.js";
import { runPerplexitySearch, runBraveSearch } from "./web-search/providers.js";

const SEARCH_CACHE = new Map<string, CacheEntry<Record<string, unknown>>>();
const _cleanup = setInterval(() => cleanupCache(SEARCH_CACHE), 5 * 60_000);
if (typeof _cleanup === "object" && "unref" in _cleanup) _cleanup.unref();

async function executeSearch(params: any): Promise<Record<string, unknown>> {
  const cacheKey = normalizeCacheKey(
    `${params.provider}:${params.query}:${params.count}:${params.country || "all"}:${params.search_lang || "en"}:${params.freshness || "none"}`,
  );
  const cached = readCache(SEARCH_CACHE, cacheKey);
  if (cached) return { ...cached.value, cached: true };

  const start = Date.now();
  let payload: any;

  if (params.provider === "perplexity") {
    const { content, citations } = await runPerplexitySearch({
      ...params,
      baseUrl: params.perplexityBaseUrl,
      model: params.perplexityModel,
    });
    payload = {
      query: params.query,
      provider: params.provider,
      model: params.perplexityModel,
      tookMs: Date.now() - start,
      content,
      citations,
    };
  } else {
    const mapped = await runBraveSearch(params);
    payload = {
      query: params.query,
      provider: params.provider,
      count: mapped.length,
      tookMs: Date.now() - start,
      results: mapped,
    };
  }

  if (params.config) {
    const sentinel = new SentinelAgent({ config: params.config });
    const context =
      params.provider === "perplexity"
        ? payload.content
        : payload.results.map((r: any) => `[${r.title}](${r.url}): ${r.description}`).join("\n\n");
    const summary = await sentinel.summarize(context, `${params.provider} Search: ${params.query}`);
    if (params.provider === "perplexity") payload.content = summary;
    else {
      payload.summary = summary;
      payload.results = payload.results.map((r: any) => ({
        ...r,
        description: "[Resumido pelo Sentinel]",
      }));
    }
    payload.sentinel = true;
  }

  writeCache(SEARCH_CACHE, cacheKey, payload, params.cacheTtlMs);
  return payload;
}

export function createWebSearchTool(options?: {
  config?: ZEROConfig;
  sandboxed?: boolean;
}): AnyAgentTool | null {
  const search = resolveSearchConfig(options?.config);
  if (!resolveSearchEnabled({ search, sandboxed: options?.sandboxed })) return null;

  const provider = resolveSearchProvider(search);
  const description =
    provider === "perplexity"
      ? "Search web with Perplexity Sonar. Returns AI-synthesized answers with citations."
      : "Search web with Brave Search API. Fast research with titles, URLs and snippets.";

  return {
    label: "Web Search",
    name: "web_search",
    description,
    parameters: WebSearchSchema,
    execute: async (_, args) => {
      const perplexityConfig = resolvePerplexityConfig(search);
      const perpAuth =
        provider === "perplexity" ? resolvePerplexityApiKey(perplexityConfig) : undefined;
      const apiKey = provider === "perplexity" ? perpAuth?.apiKey : resolveSearchApiKey(search);
      if (!apiKey) return jsonResult(missingSearchKeyPayload(provider));

      const params = args as any;
      if (params.freshness && provider === "perplexity") {
        return jsonResult({
          error: "unsupported_freshness",
          message: "Perplexity provider does not support the freshness filter",
        });
      }

      const freshness =
        provider === "brave" && params.freshness ? normalizeFreshness(params.freshness) : undefined;
      if (params.freshness && !freshness && provider === "brave")
        return jsonResult({
          error: "invalid_freshness",
          message: "pd, pw, pm, py or range YYYY-MM-DDtoYYYY-MM-DD",
        });

      const result = await executeSearch({
        ...params,
        apiKey,
        provider,
        freshness,
        config: options?.config,
        count: resolveSearchCount(params.count ?? search?.maxResults, DEFAULT_SEARCH_COUNT),
        timeoutSeconds: resolveTimeoutSeconds(search?.timeoutSeconds, DEFAULT_TIMEOUT_SECONDS),
        cacheTtlMs: resolveCacheTtlMs(search?.cacheTtlMinutes, DEFAULT_CACHE_TTL_MINUTES),
        perplexityBaseUrl: resolvePerplexityBaseUrl(
          perplexityConfig,
          perpAuth?.source,
          perpAuth?.apiKey,
        ),
        perplexityModel: resolvePerplexityModel(perplexityConfig),
      });
      return jsonResult(result);
    },
  };
}
