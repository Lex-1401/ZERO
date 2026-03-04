
/**
 * Chat RPC Methods
 *
 * Implements the chat-related gateway RPC methods.
 * Delegated to src/gateway/server-methods/chat/ for maintainability and Atomic Modularity.
 */

import { chatHandlers } from "./chat/handlers.js";
import { resolveTranscriptPath, ensureTranscriptFile } from "./chat/transcript.js";

export { chatHandlers, resolveTranscriptPath, ensureTranscriptFile };

export function nextChatSeq(context: { agentRunSeq: Map<string, number> }, runId: string) {
  const current = context.agentRunSeq.get(runId) || 0;
  context.agentRunSeq.set(runId, current + 1);
  return current + 1;
}

export function broadcastChatFinal(_params: any) {
  // Logic to broadcast final chat message
}

export function broadcastChatError(_params: any) {
  // Logic to broadcast chat error
}
