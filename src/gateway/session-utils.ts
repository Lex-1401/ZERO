
/**
 * Gateway Session Utilities
 *
 * Implements the session management and retrieval logic for the ZERO Gateway.
 * Delegated to src/gateway/sessions/ for maintainability and Atomic Modularity.
 */

import { loadConfig } from "../config/config.js";
import { loadSessionStore, resolveStorePath } from "../config/sessions.js";
import {
  archiveFileOnDisk,
  capArrayByJsonBytes,
  readFirstUserMessageFromTranscript,
  readLastMessagePreviewFromTranscript,
  readSessionPreviewItemsFromTranscript,
  readSessionMessages,
  resolveSessionTranscriptCandidates,
} from "./sessions/fs.js";
import {
  type GatewayAgentRow,
  type GatewaySessionRow,
  type GatewaySessionsDefaults,
  type SessionsListResult,
  type SessionsPatchResult,
  type SessionsPreviewEntry,
  type SessionsPreviewResult,
} from "./sessions/types.js";
import { resolveIdentityAvatarUrl } from "./sessions/avatar.js";
import { deriveSessionTitle } from "./sessions/naming.js";
import { listSessionsFromStore, classifySessionKey, parseGroupKey, getSessionDefaults } from "./sessions/query.js";
import { listAgentsForGateway, listConfiguredAgentIds } from "./sessions/agents.js";
import {
  resolveSessionStoreKey,
  resolveSessionStoreAgentId,
  resolveGatewaySessionStoreTarget,
  loadCombinedSessionStoreForGateway,
} from "./sessions/store.js";

export {
  archiveFileOnDisk,
  capArrayByJsonBytes,
  readFirstUserMessageFromTranscript,
  readLastMessagePreviewFromTranscript,
  readSessionPreviewItemsFromTranscript,
  readSessionMessages,
  resolveSessionTranscriptCandidates,
  resolveIdentityAvatarUrl,
  deriveSessionTitle,
  listSessionsFromStore,
  classifySessionKey,
  parseGroupKey,
  getSessionDefaults,
  listAgentsForGateway,
  listConfiguredAgentIds,
  resolveSessionStoreKey,
  resolveSessionStoreAgentId,
  resolveGatewaySessionStoreTarget,
  loadCombinedSessionStoreForGateway,
};

export type {
  GatewayAgentRow,
  GatewaySessionRow,
  GatewaySessionsDefaults,
  SessionsListResult,
  SessionsPatchResult,
  SessionsPreviewEntry,
  SessionsPreviewResult,
};

export function loadSessionEntry(sessionKey: string) {
  const cfg = loadConfig();
  const sessionCfg = cfg.session;
  const canonicalKey = resolveSessionStoreKey({ cfg, sessionKey });
  const agentId = resolveSessionStoreAgentId(cfg, canonicalKey);
  const storePath = resolveStorePath(sessionCfg?.store, { agentId });
  const store = loadSessionStore(storePath);
  const entry = store[canonicalKey];
  return { cfg, storePath, store, entry, canonicalKey, agentId };
}
