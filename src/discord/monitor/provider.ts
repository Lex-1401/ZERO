

/**
 * Discord Monitor Provider
 *
 * Implements the incoming message monitoring for Discord via Carbon Gateway.
 * Delegated to src/discord/monitor/provider/ for maintainability and Atomic Modularity.
 */

import { type MonitorDiscordOpts } from "./provider/types.js";
import { monitorDiscordProvider as monitor } from "./provider/monitor.js";
// Inline stubs
const deploy = async (_params: any) => { };
const clear = async (_params: any) => { };

export type { MonitorDiscordOpts };

export async function monitorDiscordProvider(opts: MonitorDiscordOpts = {}) {
  return monitor(opts);
}

export async function deployDiscordCommands(params: any) {
  return deploy(params);
}

export async function clearDiscordNativeCommands(params: any) {
  return clear(params);
}

export function formatDiscordDeployErrorDetails(_err: unknown): string {
  return "Discord deploy error."; // Simplified
}
