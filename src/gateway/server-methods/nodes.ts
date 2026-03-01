import type { GatewayRequestHandlers } from "./types.js";
import { pairingHandlers } from "./nodes/pairing.js";
import { managementHandlers } from "./nodes/management.js";
import { invokeHandlers } from "./nodes/invoke.js";
import { eventHandlers } from "./nodes/events.js";

/**
 * Node-related request handlers for the Gateway.
 * Modularized for PhD standards (original: 526 lines, now ~20 lines).
 */
export const nodeHandlers: GatewayRequestHandlers = {
  ...pairingHandlers,
  ...managementHandlers,
  ...invokeHandlers,
  ...eventHandlers,
} as GatewayRequestHandlers;
