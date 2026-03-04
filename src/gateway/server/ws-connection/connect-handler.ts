
/**
 * WebSocket Connection Handler
 *
 * Implements the handshake and protocol negotiation for new WebSocket clients.
 * Delegated to src/gateway/server/ws-connection/handler/ for maintainability and Atomic Modularity.
 */

import { handleConnectFrame as handle } from "./handler/main.js";
import { verifyDeviceSignature as verify } from "./handler/verification.js";

export async function handleConnectFrame(params: any): Promise<void> {
  return await handle(params);
}

export function verifyDeviceSignature(params: any): boolean {
  return verify(params);
}

export function deriveDeviceIdFromPublicKey(publicKey: string): string {
  return publicKey; // Simplified
}
