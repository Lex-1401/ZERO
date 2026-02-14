import type { AllowlistMatch } from "../channels/allowlist-match.js";

/**
 * Represents the normalized state of an allowlist entry for source identification.
 * Used to efficiently check if a sender (ID or Username) is permitted.
 */
export type NormalizedAllowFrom = {
  /** Original trimmed entries without prefixes */
  entries: string[];
  /** Lowercased entries for case-insensitive matching */
  entriesLower: string[];
  /** Whether the wildcard operator ('*') was present, granting open access */
  hasWildcard: boolean;
  /** Whether the list contains any valid entries */
  hasEntries: boolean;
};

/**
 * Result of an allowlist match attempt.
 * Includes metadata about which key and source triggered the match.
 */
export type AllowFromMatch = AllowlistMatch<"wildcard" | "id" | "username">;

/**
 * Normalizes a raw list of sender IDs or usernames.
 * Removes 'telegram:' or 'tg:' prefixes and extracts wildcards.
 *
 * @param list - Raw array of strings or numbers from configuration.
 * @returns A NormalizedAllowFrom object for fast lookup.
 */
export const normalizeAllowFrom = (list?: Array<string | number>): NormalizedAllowFrom => {
  const entries = (list ?? []).map((value) => String(value).trim()).filter(Boolean);
  const hasWildcard = entries.includes("*");
  const normalized = entries
    .filter((value) => value !== "*")
    .map((value) => value.replace(/^(telegram|tg):/i, ""));
  const normalizedLower = normalized.map((value) => value.toLowerCase());
  return {
    entries: normalized,
    entriesLower: normalizedLower,
    hasWildcard,
    hasEntries: entries.length > 0,
  };
};

/**
 * Normalizes a list combined from direct configuration and a persistent store.
 *
 * @param params - Object containing allowFrom (config) and storeAllowFrom (persisted).
 * @returns A NormalizedAllowFrom object.
 */
export const normalizeAllowFromWithStore = (params: {
  allowFrom?: Array<string | number>;
  storeAllowFrom?: string[];
}): NormalizedAllowFrom => {
  const combined = [...(params.allowFrom ?? []), ...(params.storeAllowFrom ?? [])]
    .map((value) => String(value).trim())
    .filter(Boolean);
  return normalizeAllowFrom(combined);
};

/**
 * Returns the first argument that is not undefined.
 *
 * @param values - List of candidate values.
 * @returns The first defined value or undefined.
 */
export const firstDefined = <T>(...values: Array<T | undefined>) => {
  for (const value of values) {
    if (typeof value !== "undefined") return value;
  }
  return undefined;
};

/**
 * Checks if a sender is allowed based on the normalized allowlist.
 *
 * @param params - Object containing allowlist, senderId, and senderUsername.
 * @returns Boolean representing authorization status.
 */
export const isSenderAllowed = (params: {
  allow: NormalizedAllowFrom;
  senderId?: string;
  senderUsername?: string;
}) => {
  const { allow, senderId, senderUsername } = params;
  if (!allow.hasEntries) return true;
  if (allow.hasWildcard) return true;
  if (senderId && allow.entries.includes(senderId)) return true;
  const username = senderUsername?.toLowerCase();
  if (!username) return false;
  return allow.entriesLower.some((entry) => entry === username || entry === `@${username}`);
};

/**
 * Resolves the specific match details for a sender against an allowlist.
 * Useful for logging and auditing match sources.
 *
 * @param params - Object containing allowlist, senderId, and senderUsername.
 * @returns An AllowFromMatch object with details.
 */
export const resolveSenderAllowMatch = (params: {
  allow: NormalizedAllowFrom;
  senderId?: string;
  senderUsername?: string;
}): AllowFromMatch => {
  const { allow, senderId, senderUsername } = params;
  if (allow.hasWildcard) {
    return { allowed: true, matchKey: "*", matchSource: "wildcard" };
  }
  if (!allow.hasEntries) return { allowed: false };
  if (senderId && allow.entries.includes(senderId)) {
    return { allowed: true, matchKey: senderId, matchSource: "id" };
  }
  const username = senderUsername?.toLowerCase();
  if (!username) return { allowed: false };
  const entry = allow.entriesLower.find(
    (candidate) => candidate === username || candidate === `@${username}`,
  );
  if (entry) {
    return { allowed: true, matchKey: entry, matchSource: "username" };
  }
  return { allowed: false };
};
