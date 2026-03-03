import { readResponseText, withTimeout } from "../web-shared.js";
import { BRAVE_SEARCH_ENDPOINT } from "./types.js";
import { resolveSiteName } from "./helpers.js";

type PerplexitySearchResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  citations?: string[];
};

export async function runPerplexitySearch(params: {
  query: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutSeconds: number;
}): Promise<{ content: string; citations: string[] }> {
  const endpoint = `${params.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
      "HTTP-Referer": "https://zero.com",
      "X-Title": "ZERO Web Search",
    },
    body: JSON.stringify({
      model: params.model,
      messages: [{ role: "user", content: params.query }],
    }),
    signal: withTimeout(undefined, params.timeoutSeconds * 1000),
  });

  if (!res.ok) {
    const detail = await readResponseText(res);
    throw new Error(`Perplexity API error (${res.status}): ${detail || res.statusText}`);
  }

  const data = (await res.json()) as PerplexitySearchResponse;
  return {
    content: data.choices?.[0]?.message?.content ?? "No response",
    citations: data.citations ?? [],
  };
}

export async function runBraveSearch(params: {
  query: string;
  count: number;
  apiKey: string;
  timeoutSeconds: number;
  country?: string;
  search_lang?: string;
  ui_lang?: string;
  freshness?: string;
}): Promise<any[]> {
  const url = new URL(BRAVE_SEARCH_ENDPOINT);
  url.searchParams.set("q", params.query);
  url.searchParams.set("count", String(params.count));
  if (params.country) url.searchParams.set("country", params.country);
  if (params.search_lang) url.searchParams.set("search_lang", params.search_lang);
  if (params.ui_lang) url.searchParams.set("ui_lang", params.ui_lang);
  if (params.freshness) url.searchParams.set("freshness", params.freshness);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json", "X-Subscription-Token": params.apiKey },
    signal: withTimeout(undefined, params.timeoutSeconds * 1000),
  });

  if (!res.ok) {
    const detail = await readResponseText(res);
    throw new Error(`Brave Search API error (${res.status}): ${detail || res.statusText}`);
  }

  const data = (await res.json()) as any;
  const results = Array.isArray(data.web?.results) ? data.web.results : [];
  return results.map((entry: any) => ({
    title: entry.title ?? "",
    url: entry.url ?? "",
    description: entry.description ?? "",
    published: entry.age ?? undefined,
    siteName: resolveSiteName(entry.url ?? ""),
  }));
}
