import type { Context } from "hono";

import type { BrowserRouteContext, ProfileContext } from "../server-context.js";
import { parseBooleanValue } from "../../utils/boolean.js";

/**
 * Extract profile name from query string or body and get profile context.
 */
export async function getProfileContext(
  c: Context,
  ctx: BrowserRouteContext,
): Promise<ProfileContext | { error: string; status: number }> {
  let profileName: string | undefined = c.req.query("profile")?.trim();

  if (!profileName) {
    try {
      if (c.req.header("content-type")?.includes("application/json")) {
        const body = await c.req.json();
        if (body && typeof body.profile === "string") {
          profileName = body.profile.trim() || undefined;
        }
      }
    } catch {
      // ignore
    }
  }

  try {
    return ctx.forProfile(profileName);
  } catch (err) {
    return { error: String(err), status: 404 };
  }
}

export function toStringOrEmpty(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
}

export function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function toBoolean(value: unknown) {
  return parseBooleanValue(value, {
    truthy: ["true", "1", "yes"],
    falsy: ["false", "0", "no"],
  });
}

export function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.map((v) => toStringOrEmpty(v)).filter(Boolean);
  return strings.length ? strings : undefined;
}
