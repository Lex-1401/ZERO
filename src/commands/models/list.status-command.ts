
/**
 * Models Status Command
 *
 * Implements the command for listing available AI models and their operational status.
 * Delegated to src/commands/models/status/ for maintainability and Atomic Modularity.
 */

import { modelsStatusCommand as status } from "./status/action.js";
import { formatStatus, statusColor } from "./status/formatter.js";

export async function modelsStatusCommand(opts: any, runtime: any) {
  return await status(opts, runtime);
}

export function getStatusColor(statusStr: string): string {
  return statusColor(statusStr);
}

export function formatStatusLabel(statusStr: string): string {
  return formatStatus(statusStr);
}
