
/**
 * Status Command
 *
 * Implements the system status report command for the platform.
 * Delegated to src/commands/status/ for maintainability and Atomic Modularity.
 */

import { statusCommand as status } from "./status/action.js";
import { severityLabel, fmtSummary } from "./status/formatter.js";

export async function statusCommand(opts: any, runtime: any) {
  return await status(opts, runtime);
}

export function getSeverityLabel(sev: "critical" | "warn" | "info"): string {
  return severityLabel(sev);
}

export function formatStatusSummary(value: any): string {
  return fmtSummary(value);
}
