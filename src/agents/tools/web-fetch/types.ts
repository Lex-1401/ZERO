import { Type } from "@sinclair/typebox";
import { stringEnum } from "../../schema/typebox.js";
import type { ZEROConfig } from "../../../config/config.js";

export const EXTRACT_MODES = ["markdown", "text"] as const;
export const IMPERSONATE_MODES = ["chrome", "firefox", "safari", "edge"] as const;

export const DEFAULT_FETCH_MAX_CHARS = 50_000;
export const DEFAULT_FETCH_MAX_REDIRECTS = 3;
export const DEFAULT_ERROR_MAX_CHARS = 4_000;
export const DEFAULT_FIRECRAWL_BASE_URL = "https://api.firecrawl.dev";
export const DEFAULT_FIRECRAWL_MAX_AGE_MS = 172_800_000;
export const DEFAULT_FETCH_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const WebFetchSchema = Type.Object({
  url: Type.String({ description: "HTTP or HTTPS URL to fetch." }),
  extractMode: Type.Optional(
    stringEnum(EXTRACT_MODES, {
      description: 'Extraction mode ("markdown" or "text").',
      default: "markdown",
    }),
  ),
  maxChars: Type.Optional(
    Type.Number({
      description: "Maximum characters to return (truncates when exceeded).",
      minimum: 100,
    }),
  ),
  impersonate: Type.Optional(
    stringEnum(IMPERSONATE_MODES, {
      description: "Browser identity to mimic for stealth fetching.",
      default: "chrome",
    }),
  ),
});

export type WebFetchConfig = NonNullable<ZEROConfig["tools"]>["web"] extends infer Web
  ? Web extends { fetch?: infer Fetch }
    ? Fetch
    : undefined
  : undefined;

export type FirecrawlFetchConfig =
  | {
      enabled?: boolean;
      apiKey?: string;
      baseUrl?: string;
      onlyMainContent?: boolean;
      maxAgeMs?: number;
      timeoutSeconds?: number;
    }
  | undefined;
