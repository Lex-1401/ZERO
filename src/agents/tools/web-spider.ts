import { Type } from "@sinclair/typebox";
import { assertPublicHostname } from "../../infra/net/ssrf.js";
import { type AnyAgentTool, jsonResult, readStringParam, readNumberParam } from "./common.js";
import { getImpersonatedHeaders, type ImpersonateMode } from "./web-headers.js";
import { htmlToMarkdown, truncateText } from "./web-fetch-utils.js";
import { withTimeout } from "./web-shared.js";

const WebSpiderSchema = Type.Object({
  url: Type.String({ description: "Initial URL to start crawling from." }),
  depth: Type.Optional(
    Type.Number({
      description: "Recursion depth (default 1, max 3).",
      minimum: 0,
      maximum: 3,
      default: 1,
    }),
  ),
  maxPages: Type.Optional(
    Type.Number({
      description: "Maximum number of pages to visit.",
      minimum: 1,
      maximum: 20,
      default: 5,
    }),
  ),
  keywords: Type.Optional(
    Type.Array(Type.String(), { description: "Filter links by these keywords." }),
  ),
  impersonate: Type.Optional(
    Type.String({ description: "Browser identity to mimic.", default: "chrome" }),
  ),
});

interface SpiderPage {
  url: string;
  title?: string;
  text: string;
  links: string[];
}

export function createWebSpiderTool(): AnyAgentTool {
  return {
    name: "web_spider",
    label: "Web Spider (Deep Research)",
    description:
      "Recursively crawl a domain to gather deep information. Follows internal links up to a specific depth and consolidates a knowledge dossier. Use for comprehensive research on a specific topic within a site.",
    parameters: WebSpiderSchema,
    execute: async (_id, args) => {
      const params = args as Record<string, unknown>;
      const startUrl = readStringParam(params, "url", { required: true });
      const depth = readNumberParam(params, "depth") ?? 1;
      const maxPages = readNumberParam(params, "maxPages") ?? 5;
      const keywords = params.keywords as string[] | undefined;
      const impersonate = (readStringParam(params, "impersonate") || "chrome") as ImpersonateMode;

      const visited = new Set<string>();
      const results: SpiderPage[] = [];
      const queue: { url: string; currentDepth: number }[] = [{ url: startUrl, currentDepth: 0 }];
      const domain = new URL(startUrl).hostname;

      while (queue.length > 0 && results.length < maxPages) {
        const { url, currentDepth } = queue.shift()!;
        if (visited.has(url)) continue;
        visited.add(url);

        try {
          const page = await spiderFetchPage(url, impersonate);
          results.push(page);

          if (currentDepth < depth) {
            const internalLinks = page.links.filter((link) => {
              try {
                const linkUrl = new URL(link, url);
                const isInternal = linkUrl.hostname === domain;
                const matchesKeywords =
                  !keywords ||
                  keywords.some(
                    (k) => linkUrl.pathname.includes(k) || linkUrl.toString().includes(k),
                  );
                return isInternal && matchesKeywords && !visited.has(linkUrl.toString());
              } catch {
                return false;
              }
            });

            for (const link of internalLinks) {
              const fullUrl = new URL(link, url).toString();
              if (!visited.has(fullUrl)) {
                queue.push({ url: fullUrl, currentDepth: currentDepth + 1 });
              }
            }
          }
        } catch (err) {
          // Skip failed pages
          console.error(`Spider failed to fetch ${url}:`, err);
        }
      }

      return jsonResult({
        startUrl,
        pagesVisited: results.length,
        data: results.map((p) => ({
          url: p.url,
          title: p.title,
          content: truncateText(p.text, 2000).text, // Truncate content in summary
        })),
        fullDossier: results
          .map((p) => `# ${p.title || p.url}\nURL: ${p.url}\n\n${p.text}\n---\n`)
          .join("\n"),
      });
    },
  };
}

async function spiderFetchPage(url: string, impersonate: ImpersonateMode): Promise<SpiderPage> {
  const parsedUrl = new URL(url);
  await assertPublicHostname(parsedUrl.hostname);

  const signal = withTimeout(undefined, 15000);
  const headers = getImpersonatedHeaders(impersonate, url);

  const res = await fetch(url, { headers, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const { text, title } = htmlToMarkdown(html);

  // Extract links for crawling
  const linkMatches = html.matchAll(/<a\s+[^>]*href=["']([^"']+)["']/gi);
  const links = Array.from(linkMatches)
    .map((m) => m[1])
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("javascript:"));

  return { url, title, text, links };
}
