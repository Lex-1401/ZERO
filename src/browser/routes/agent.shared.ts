import type { Context } from "hono";

import type { BrowserRouteContext, ProfileContext } from "../server-context.js";
import type { PwAiModule } from "../pw-ai-module.js";
import { getPwAiModule as getPwAiModuleBase } from "../pw-ai-module.js";
import { getProfileContext } from "./utils.js";

export const SELECTOR_UNSUPPORTED_MESSAGE = [
  "Error: 'selector' is not supported. Use 'ref' from snapshot instead.",
  "",
  "Example workflow:",
  "1. snapshot action to get page state with refs",
  '2. act with ref: "e123" to interact with element',
  "",
  "This is more reliable for modern SPAs.",
].join("\n");

export function handleRouteError(c: Context, ctx: BrowserRouteContext, err: unknown) {
  const mapped = ctx.mapTabError(err);
  if (mapped) return c.json({ error: mapped.message }, mapped.status as any);
  return c.json({ error: String(err) }, 500);
}

export async function resolveProfileContext(
  c: Context,
  ctx: BrowserRouteContext,
): Promise<ProfileContext | null> {
  const profileCtx = await getProfileContext(c, ctx);
  if ("error" in profileCtx) {
    // In Hono, we should return the response. Since we aren't returning from here,
    // the caller must handle the null and return the result of c.json.
    // However, to keep it simple for the POC, we'll let the caller do the response.
    return null;
  }
  return profileCtx;
}

export async function getPwAiModule(): Promise<PwAiModule | null> {
  return await getPwAiModuleBase({ mode: "soft" });
}

export type PwAiRequirementResult = { mod: PwAiModule } | { response: Response };

export async function requirePwAi(c: Context, feature: string): Promise<PwAiRequirementResult> {
  const mod = await getPwAiModule();
  if (mod) return { mod };

  const response = c.json(
    {
      error: [
        `Playwright is not available in this gateway build; '${feature}' is unsupported.`,
        "Install the full Playwright package (not playwright-core) and restart the gateway, or reinstall with browser support.",
        "Docs: /tools/browser#playwright-requirement",
      ].join("\n"),
    },
    501,
  );
  return { response };
}
