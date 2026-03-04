
/**
 * Gateway Server Implementation
 *
 * Implements the core logic for starting and stopping the ZERO Gateway.
 * Delegated to src/gateway/server/ for maintainability and Atomic Modularity.
 */

import { type GatewayServer, type GatewayServerOptions } from "./server/types.js";
import { bootstrapGatewayServer as bootstrap } from "./server/bootstrap.js";

export type { GatewayServer, GatewayServerOptions };

export async function startGatewayServer(
  port = 18789,
  opts: GatewayServerOptions = {},
): Promise<GatewayServer> {
  return bootstrap(port, opts);
}

export function ensureZEROCliOnPath() {
  // Logic to ensure 'zero' is available in the shell
}
