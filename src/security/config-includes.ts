/**
 * Shared helpers for resolving config include paths.
 *
 * Extracted from fix.ts and audit-extra.ts to eliminate duplication (DUP-001).
 */
import path from "node:path";

import { INCLUDE_KEY } from "../config/includes.js";

/**
 * Lists all direct `$include` values found in a parsed config object.
 */
export function listDirectIncludes(parsed: unknown): string[] {
  const out: string[] = [];
  const visit = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value !== "object") return;
    const rec = value as Record<string, unknown>;
    const includeVal = rec[INCLUDE_KEY];
    if (typeof includeVal === "string") out.push(includeVal);
    else if (Array.isArray(includeVal)) {
      for (const item of includeVal) {
        if (typeof item === "string") out.push(item);
      }
    }
    for (const v of Object.values(rec)) visit(v);
  };
  visit(parsed);
  return out;
}

/**
 * Resolves a potentially relative include path against a base config file path.
 */
export function resolveIncludePath(baseConfigPath: string, includePath: string): string {
  return path.normalize(
    path.isAbsolute(includePath)
      ? includePath
      : path.resolve(path.dirname(baseConfigPath), includePath),
  );
}
