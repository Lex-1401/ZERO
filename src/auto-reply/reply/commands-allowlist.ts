
/**
 * Commands Allowlist
 *
 * Implements the logic for managing user and group allowlists via bot commands.
 * Delegated to src/auto-reply/reply/allowlist/ for maintainability and Atomic Modularity.
 */

import { handleAllowlistCommand as handle } from "./allowlist/actions.js";
import { type AllowlistCommand, type AllowlistScope, type AllowlistAction } from "./allowlist/types.js";
import { type CommandHandlerResult, type HandleCommandsParams } from "./commands-types.js";

export type { AllowlistCommand, AllowlistScope };

/**
 * Parses a raw command string into an AllowlistCommand object.
 * Format: /allowlist <action> [scope] [channel] [entry]
 * 
 * Heuristics for overlapping args:
 * - If 4 args: action scope channel entry
 * - If 3 args: action scope entry (use current channel) OR action scope channel (entry=null)
 * - If 2 args: action scope (list only)
 */
export function parseAllowlistCommand(raw: string): AllowlistCommand | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/allowlist")) return null;

  const parts = trimmed.split(/\s+/);
  const actionRaw = parts[1]?.toLowerCase();

  const action: AllowlistAction | "error" =
    actionRaw === "add" ? "add" :
      actionRaw === "remove" ? "remove" :
        actionRaw === "list" ? "list" : "error";

  if (action === "error" && parts.length > 1) {
    return { action: "error", scope: "dm", message: "Ação inválida. Use: add, remove ou list." };
  }

  const scope: AllowlistScope = (parts[2] as AllowlistScope) || "dm";

  let channel: string | undefined;
  let entry: string | undefined;

  if (action === "list") {
    channel = parts[3];
  } else {
    // For add/remove
    if (parts.length >= 5) {
      channel = parts[3];
      entry = parts[4];
    } else if (parts.length === 4) {
      // /allowlist add dm 789 -> scope=dm, entry=789
      entry = parts[3];
    }
  }

  return {
    action: action === "error" ? "list" : action,
    scope,
    channel,
    entry
  };
}

/**
 * Command handler entry point for allowlist management.
 */
export async function handleAllowlistCommand(
  params: HandleCommandsParams,
  _allowTextCommands: boolean
): Promise<CommandHandlerResult | null> {
  if (!params.command.commandBodyNormalized.startsWith("/allowlist")) return null;
  return handle(params);
}

/**
 * Normalizes a list of allowFrom entries.
 */
export function normalizeAllowFrom(values: any): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => String(v).trim().toLowerCase())
    .filter((v) => v.length > 0);
}
