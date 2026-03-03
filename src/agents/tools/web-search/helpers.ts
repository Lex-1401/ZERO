import type { ZEROConfig } from "../../../config/config.js";
import { formatCliCommand } from "../../../cli/command-format.js";
import {
  SEARCH_PROVIDERS,
  MAX_SEARCH_COUNT,
  PERPLEXITY_DIRECT_BASE_URL,
  DEFAULT_PERPLEXITY_BASE_URL,
  DEFAULT_PERPLEXITY_MODEL,
  PERPLEXITY_KEY_PREFIXES,
  OPENROUTER_KEY_PREFIXES,
  type WebSearchConfig,
  type PerplexityConfig,
  type PerplexityApiKeySource,
  type PerplexityBaseUrlHint,
} from "./types.js";

export function resolveSearchConfig(cfg?: ZEROConfig): WebSearchConfig {
  const search = cfg?.tools?.web?.search;
  if (!search || typeof search !== "object") return undefined;
  return search as WebSearchConfig;
}

export function resolveSearchEnabled(params: {
  search?: WebSearchConfig;
  sandboxed?: boolean;
}): boolean {
  if (typeof params.search?.enabled === "boolean") return params.search.enabled;
  return true;
}

export function resolveSearchApiKey(search?: WebSearchConfig): string | undefined {
  const fromConfig =
    search && "apiKey" in search && typeof search.apiKey === "string" ? search.apiKey.trim() : "";
  const fromEnv = (process.env.BRAVE_API_KEY ?? "").trim();
  return fromConfig || fromEnv || undefined;
}

export function missingSearchKeyPayload(provider: (typeof SEARCH_PROVIDERS)[number]) {
  if (provider === "perplexity") {
    return {
      error: "missing_perplexity_api_key",
      message:
        "web_search (perplexity) needs an API key. Set PERPLEXITY_API_KEY or OPENROUTER_API_KEY in the Gateway environment, or configure tools.web.search.perplexity.apiKey.",
      docs: "https://github.com/Lex-1401/ZERO/tree/main/docs/tools/web",
    };
  }
  return {
    error: "missing_brave_api_key",
    message: `web_search needs a Brave Search API key. Run \`${formatCliCommand("zero configure --section web")}\` to store it, or set BRAVE_API_KEY in the Gateway environment.`,
    docs: "https://github.com/Lex-1401/ZERO/tree/main/docs/tools/web",
  };
}

export function resolveSearchProvider(search?: WebSearchConfig): (typeof SEARCH_PROVIDERS)[number] {
  const raw =
    search && "provider" in search && typeof search.provider === "string"
      ? search.provider.trim().toLowerCase()
      : "";
  if (raw === "perplexity") return "perplexity";
  return "brave";
}

export function resolvePerplexityConfig(search?: WebSearchConfig): PerplexityConfig {
  if (!search || typeof search !== "object") return {};
  const perplexity = "perplexity" in search ? search.perplexity : undefined;
  if (!perplexity || typeof perplexity !== "object") return {};
  return perplexity as PerplexityConfig;
}

export function resolvePerplexityApiKey(perplexity?: PerplexityConfig): {
  apiKey?: string;
  source: PerplexityApiKeySource;
} {
  const normalize = (key: unknown) => (typeof key === "string" ? key.trim() : "");
  const fromConfig = normalize(perplexity?.apiKey);
  if (fromConfig) return { apiKey: fromConfig, source: "config" };
  const fromEnvPerplexity = normalize(process.env.PERPLEXITY_API_KEY);
  if (fromEnvPerplexity) return { apiKey: fromEnvPerplexity, source: "perplexity_env" };
  const fromEnvOpenRouter = normalize(process.env.OPENROUTER_API_KEY);
  if (fromEnvOpenRouter) return { apiKey: fromEnvOpenRouter, source: "openrouter_env" };
  return { apiKey: undefined, source: "none" };
}

export function inferPerplexityBaseUrlFromApiKey(
  apiKey?: string,
): PerplexityBaseUrlHint | undefined {
  if (!apiKey) return undefined;
  const normalized = apiKey.toLowerCase();
  if (PERPLEXITY_KEY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "direct";
  if (OPENROUTER_KEY_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return "openrouter";
  return undefined;
}

export function resolvePerplexityBaseUrl(
  perplexity?: PerplexityConfig,
  apiKeySource: PerplexityApiKeySource = "none",
  apiKey?: string,
): string {
  const fromConfig =
    perplexity && "baseUrl" in perplexity && typeof perplexity.baseUrl === "string"
      ? perplexity.baseUrl.trim()
      : "";
  if (fromConfig) return fromConfig;
  if (apiKeySource === "perplexity_env") return PERPLEXITY_DIRECT_BASE_URL;
  if (apiKeySource === "openrouter_env") return DEFAULT_PERPLEXITY_BASE_URL;
  if (apiKeySource === "config") {
    const inferred = inferPerplexityBaseUrlFromApiKey(apiKey);
    if (inferred === "direct") return PERPLEXITY_DIRECT_BASE_URL;
  }
  return DEFAULT_PERPLEXITY_BASE_URL;
}

export function resolvePerplexityModel(perplexity?: PerplexityConfig): string {
  const fromConfig =
    perplexity && "model" in perplexity && typeof perplexity.model === "string"
      ? perplexity.model.trim()
      : "";
  return fromConfig || DEFAULT_PERPLEXITY_MODEL;
}

export function resolveSearchCount(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(1, Math.min(MAX_SEARCH_COUNT, Math.floor(parsed)));
}

export function normalizeFreshness(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  if (["pd", "pw", "pm", "py"].includes(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}to\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [start, end] = trimmed.split("to");
    const dStart = new Date(start);
    const dEnd = new Date(end);
    if (!Number.isNaN(dStart.valueOf()) && !Number.isNaN(dEnd.valueOf())) {
      if (
        dStart.toISOString().startsWith(start) &&
        dEnd.toISOString().startsWith(end) &&
        dStart.valueOf() <= dEnd.valueOf()
      ) {
        return trimmed;
      }
    }
  }
  return undefined;
}

export function resolveSiteName(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}
