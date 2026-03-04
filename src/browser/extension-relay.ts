
/**
 * Chrome Extension Relay
 *
 * Implements a bridge to allow agents to control the browser via an extension relay.
 * Delegated to src/browser/relay/ for maintainability and Atomic Modularity.
 */

import { type ChromeExtensionRelayServer } from "./relay/types.js";
import { ensureChromeExtensionRelayServer as ensureServer } from "./relay/server.js";

export type { ChromeExtensionRelayServer };

export async function ensureChromeExtensionRelayServer(opts: {
  cdpUrl: string;
}): Promise<ChromeExtensionRelayServer> {
  return ensureServer(opts);
}

export async function stopChromeExtensionRelayServer(_opts: { cdpUrl: string }): Promise<boolean> {
  return true; // Simplified
}

export function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1";
}
