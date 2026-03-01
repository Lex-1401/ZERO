import { Type } from "@sinclair/typebox";
import type { ZEROConfig } from "../../../config/config.js";

export const SEARCH_PROVIDERS = ["brave", "perplexity"] as const;
export const DEFAULT_SEARCH_COUNT = 5;
export const MAX_SEARCH_COUNT = 10;
export const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
export const DEFAULT_PERPLEXITY_BASE_URL = "https://openrouter.ai/api/v1";
export const PERPLEXITY_DIRECT_BASE_URL = "https://api.perplexity.ai";
export const DEFAULT_PERPLEXITY_MODEL = "perplexity/sonar-pro";
export const PERPLEXITY_KEY_PREFIXES = ["pplx-"];
export const OPENROUTER_KEY_PREFIXES = ["sk-or-"];

export const WebSearchSchema = Type.Object({
  query: Type.String({ description: "Search query string." }),
  count: Type.Optional(
    Type.Number({
      description: "Number of results to return (1-10).",
      minimum: 1,
      maximum: MAX_SEARCH_COUNT,
    }),
  ),
  country: Type.Optional(
    Type.String({
      description:
        "2-letter country code for region-specific results (e.g., 'DE', 'US', 'ALL'). Default: 'US'.",
    }),
  ),
  search_lang: Type.Optional(
    Type.String({ description: "ISO language code for search results (e.g., 'de', 'en', 'fr')." }),
  ),
  ui_lang: Type.Optional(Type.String({ description: "ISO language code for UI elements." })),
  freshness: Type.Optional(
    Type.String({
      description:
        "Filter results by discovery time (Brave only). Values: 'pd' (past 24h), 'pw' (past week), 'pm' (past month), 'py' (past year), or date range 'YYYY-MM-DDtoYYYY-MM-DD'.",
    }),
  ),
});

export type WebSearchConfig = NonNullable<ZEROConfig["tools"]>["web"] extends infer Web
  ? Web extends { search?: infer Search }
    ? Search
    : undefined
  : undefined;
export type PerplexityConfig = { apiKey?: string; baseUrl?: string; model?: string };
export type PerplexityApiKeySource = "config" | "perplexity_env" | "openrouter_env" | "none";
export type PerplexityBaseUrlHint = "direct" | "openrouter";
