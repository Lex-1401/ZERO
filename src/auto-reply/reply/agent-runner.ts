
import { lookupContextTokens } from "../../agents/context.js";
import { DEFAULT_CONTEXT_TOKENS } from "../../agents/defaults.js";
import { resolveModelAuthMode } from "../../agents/model-auth.js";
import { isCliProvider } from "../../agents/model-selection.js";
import { queueEmbeddedPiMessage } from "../../agents/pi-embedded.js";
import { hasNonzeroUsage } from "../../agents/usage.js";
import {
  type SessionEntry,
  updateSessionStoreEntry,
} from "../../config/sessions.js";
import type { TypingMode } from "../../config/types.js";

import { estimateUsageCost, resolveModelCostConfig } from "../../utils/usage-format.js";
import type { OriginatingChannelType, TemplateContext } from "../templating.js";
import { resolveResponseUsageMode, type VerboseLevel } from "../thinking.js";
import type { GetReplyOptions, ReplyPayload } from "../types.js";
import { runAgentTurnWithFallback } from "./agent-runner-execution.js";
import {
  createShouldEmitToolOutput,
  createShouldEmitToolResult,
  finalizeWithFollowup,
  isAudioPayload,
  signalTypingIfNeeded,
} from "./agent-runner-helpers.js";
import { runMemoryFlushIfNeeded } from "./agent-runner-memory.js";
import { buildReplyPayloads } from "./agent-runner-payloads.js";
import { appendUsageLine, formatResponseUsageLine } from "./agent-runner-utils.js";
import { createAudioAsVoiceBuffer, createBlockReplyPipeline } from "./block-reply-pipeline.js";
import { resolveBlockStreamingCoalescing } from "./block-streaming.js";
import { createFollowupRunner } from "./followup-runner.js";
import { enqueueFollowupRun, type FollowupRun, type QueueSettings } from "./queue.js";
import { createReplyToModeFilterForChannel, resolveReplyToMode } from "./reply-threading.js";
import { persistSessionUsageUpdate } from "./session-usage.js";
import { incrementCompactionCount } from "./session-updates.js";
import type { TypingController } from "./typing.js";
import { createTypingSignaler } from "./typing-mode.js";
import { emitDiagnosticEvent, isDiagnosticsEnabled } from "../../infra/diagnostic-events.js";
import { resetSession, type SessionResetOptions } from "./agent-runner/session-reset.js";

const BLOCK_REPLY_SEND_TIMEOUT_MS = 15_000;

export async function runReplyAgent(params: {
  commandBody: string;
  followupRun: FollowupRun;
  queueKey: string;
  resolvedQueue: QueueSettings;
  shouldSteer: boolean;
  shouldFollowup: boolean;
  isActive: boolean;
  isStreaming: boolean;
  opts?: GetReplyOptions;
  typing: TypingController;
  sessionEntry?: SessionEntry;
  sessionStore?: Record<string, SessionEntry>;
  sessionKey?: string;
  storePath?: string;
  defaultModel: string;
  agentCfgContextTokens?: number;
  resolvedVerboseLevel: VerboseLevel;
  isNewSession: boolean;
  blockStreamingEnabled: boolean;
  blockReplyChunking?: {
    minChars: number;
    maxChars: number;
    breakPreference: "paragraph" | "newline" | "sentence";
  };
  resolvedBlockStreamingBreak: "text_end" | "message_end";
  sessionCtx: TemplateContext;
  shouldInjectGroupIntro: boolean;
  typingMode: TypingMode;
}): Promise<ReplyPayload | ReplyPayload[] | undefined> {
  const {
    commandBody, followupRun, queueKey, resolvedQueue, shouldSteer, shouldFollowup,
    isActive, isStreaming, opts, typing, sessionEntry, sessionStore, sessionKey,
    storePath, defaultModel, agentCfgContextTokens, resolvedVerboseLevel, isNewSession,
    blockStreamingEnabled, blockReplyChunking, resolvedBlockStreamingBreak,
    sessionCtx, shouldInjectGroupIntro, typingMode,
  } = params;

  let activeSessionEntry = sessionEntry;
  const activeSessionStore = sessionStore;
  let activeIsNewSession = isNewSession;

  const isHeartbeat = opts?.isHeartbeat === true;
  const typingSignals = createTypingSignaler({ typing, mode: typingMode, isHeartbeat });

  const shouldEmitToolResult = createShouldEmitToolResult({ sessionKey, storePath, resolvedVerboseLevel });
  const shouldEmitToolOutput = createShouldEmitToolOutput({ sessionKey, storePath, resolvedVerboseLevel });

  const pendingToolTasks = new Set<Promise<void>>();
  const blockReplyTimeoutMs = opts?.blockReplyTimeoutMs ?? BLOCK_REPLY_SEND_TIMEOUT_MS;

  const replyToChannel = sessionCtx.OriginatingChannel ?? ((sessionCtx.Surface ?? sessionCtx.Provider)?.toLowerCase() as OriginatingChannelType | undefined);
  const replyToMode = resolveReplyToMode(followupRun.run.config, replyToChannel, sessionCtx.AccountId, sessionCtx.ChatType);
  const applyReplyToMode = createReplyToModeFilterForChannel(replyToMode, replyToChannel);
  const cfg = followupRun.run.config;
  const blockReplyCoalescing = blockStreamingEnabled && opts?.onBlockReply
    ? resolveBlockStreamingCoalescing(cfg, sessionCtx.Provider, sessionCtx.AccountId, blockReplyChunking)
    : undefined;
  const blockReplyPipeline = blockStreamingEnabled && opts?.onBlockReply
    ? createBlockReplyPipeline({
      onBlockReply: opts.onBlockReply,
      timeoutMs: blockReplyTimeoutMs,
      coalescing: blockReplyCoalescing,
      buffer: createAudioAsVoiceBuffer({ isAudioPayload }),
    })
    : null;

  if (shouldSteer && isStreaming) {
    const steered = queueEmbeddedPiMessage(followupRun.run.sessionId, followupRun.prompt);
    if (steered && !shouldFollowup) {
      if (activeSessionEntry && activeSessionStore && sessionKey) {
        const updatedAt = Date.now();
        activeSessionEntry.updatedAt = updatedAt;
        activeSessionStore[sessionKey] = activeSessionEntry;
        if (storePath) {
          await updateSessionStoreEntry({ storePath, sessionKey, update: async () => ({ updatedAt }) });
        }
      }
      typing.cleanup();
      return undefined;
    }
  }

  if (isActive && (shouldFollowup || resolvedQueue.mode === "steer")) {
    enqueueFollowupRun(queueKey, followupRun, resolvedQueue);
    if (activeSessionEntry && activeSessionStore && sessionKey) {
      const updatedAt = Date.now();
      activeSessionEntry.updatedAt = updatedAt;
      activeSessionStore[sessionKey] = activeSessionEntry;
      if (storePath) {
        await updateSessionStoreEntry({ storePath, sessionKey, update: async () => ({ updatedAt }) });
      }
    }
    typing.cleanup();
    return undefined;
  }

  await typingSignals.signalRunStart();

  activeSessionEntry = await runMemoryFlushIfNeeded({
    cfg, followupRun, sessionCtx, opts, defaultModel, agentCfgContextTokens,
    resolvedVerboseLevel, sessionEntry: activeSessionEntry, sessionStore: activeSessionStore,
    sessionKey, storePath, isHeartbeat,
  });

  const runFollowupTurn = createFollowupRunner({
    opts, typing, typingMode, sessionEntry: activeSessionEntry, sessionStore: activeSessionStore,
    sessionKey, storePath, defaultModel, agentCfgContextTokens,
  });

  const resetSessionWrapper = async (options: SessionResetOptions): Promise<boolean> => {
    const res = await resetSession({
      sessionKey, activeSessionStore, activeSessionEntry, storePath, sessionCtx, followupRun, options
    });
    if (res) {
      activeSessionEntry = res.nextEntry;
      activeIsNewSession = true;
      return true;
    }
    return false;
  };

  const resetSessionAfterCompactionFailure = async (reason: string): Promise<boolean> =>
    resetSessionWrapper({
      failureLabel: "compaction failure",
      buildLogMessage: (nextSessionId) => `Auto-compaction failed (${reason}). Restarting session ${sessionKey} -> ${nextSessionId} and retrying.`,
    });
  const resetSessionAfterRoleOrderingConflict = async (reason: string): Promise<boolean> =>
    resetSessionWrapper({
      failureLabel: "role ordering conflict",
      buildLogMessage: (nextSessionId) => `Role ordering conflict (${reason}). Restarting session ${sessionKey} -> ${nextSessionId}.`,
      cleanupTranscripts: true,
    });

  try {
    const runStartedAt = Date.now();
    const runOutcome = await runAgentTurnWithFallback({
      commandBody, followupRun, sessionCtx, opts, typingSignals, blockReplyPipeline,
      blockStreamingEnabled, blockReplyChunking, resolvedBlockStreamingBreak, applyReplyToMode,
      shouldEmitToolResult, shouldEmitToolOutput, pendingToolTasks,
      resetSessionAfterCompactionFailure, resetSessionAfterRoleOrderingConflict,
      isHeartbeat, sessionKey, getActiveSessionEntry: () => activeSessionEntry,
      activeSessionStore, storePath, resolvedVerboseLevel,
    });

    if (runOutcome.kind === "final") return finalizeWithFollowup(runOutcome.payload, queueKey, runFollowupTurn);

    const { runResult, fallbackProvider, fallbackModel, directlySentBlockKeys } = runOutcome as any;
    let { didLogHeartbeatStrip, autoCompactionCompleted } = runOutcome as any;

    if (shouldInjectGroupIntro && activeSessionEntry && activeSessionStore && sessionKey && activeSessionEntry.groupActivationNeedsSystemIntro) {
      const updatedAt = Date.now();
      activeSessionEntry.groupActivationNeedsSystemIntro = false;
      activeSessionEntry.updatedAt = updatedAt;
      activeSessionStore[sessionKey] = activeSessionEntry;
      if (storePath) {
        await updateSessionStoreEntry({ storePath, sessionKey, update: async () => ({ groupActivationNeedsSystemIntro: false, updatedAt }) });
      }
    }

    if (blockReplyPipeline) {
      await blockReplyPipeline.flush({ force: true });
      blockReplyPipeline.stop();
    }
    if (pendingToolTasks.size > 0) await Promise.allSettled(pendingToolTasks);

    const usage = runResult.meta.agentMeta?.usage;
    const modelUsed = runResult.meta.agentMeta?.model ?? fallbackModel ?? defaultModel;
    const providerUsed = runResult.meta.agentMeta?.provider ?? fallbackProvider ?? followupRun.run.provider;
    const cliSessionId = isCliProvider(providerUsed, cfg) ? runResult.meta.agentMeta?.sessionId?.trim() : undefined;
    const contextTokensUsed = agentCfgContextTokens ?? lookupContextTokens(modelUsed) ?? activeSessionEntry?.contextTokens ?? DEFAULT_CONTEXT_TOKENS;

    await persistSessionUsageUpdate({
      storePath, sessionKey, usage, modelUsed, providerUsed, contextTokensUsed,
      systemPromptReport: runResult.meta.systemPromptReport, cliSessionId,
    });

    if ((runResult.payloads ?? []).length === 0) return finalizeWithFollowup(undefined, queueKey, runFollowupTurn);

    const payloadResult = buildReplyPayloads({
      payloads: runResult.payloads ?? [], isHeartbeat, didLogHeartbeatStrip, blockStreamingEnabled,
      blockReplyPipeline, directlySentBlockKeys, replyToMode, replyToChannel,
      currentMessageId: sessionCtx.MessageSidFull ?? sessionCtx.MessageSid,
      messageProvider: followupRun.run.messageProvider,
      messagingToolSentTexts: runResult.messagingToolSentTexts,
      messagingToolSentTargets: runResult.messagingToolSentTargets,
      originatingTo: sessionCtx.OriginatingTo ?? sessionCtx.To,
      accountId: sessionCtx.AccountId,
    });
    const { replyPayloads } = payloadResult;
    didLogHeartbeatStrip = payloadResult.didLogHeartbeatStrip;

    if (replyPayloads.length === 0) return finalizeWithFollowup(undefined, queueKey, runFollowupTurn);

    await signalTypingIfNeeded(replyPayloads, typingSignals);

    if (isDiagnosticsEnabled(cfg) && hasNonzeroUsage(usage)) {
      const costUsd = estimateUsageCost({ usage, cost: resolveModelCostConfig({ provider: providerUsed, model: modelUsed, config: cfg }) });
      emitDiagnosticEvent({
        type: "model.usage", sessionKey, sessionId: followupRun.run.sessionId, channel: replyToChannel,
        provider: providerUsed, model: modelUsed, usage,
        context: { limit: contextTokensUsed, used: usage?.total ?? 0 },
        costUsd, durationMs: Date.now() - runStartedAt,
      } as any);
    }

    let responseUsageLine: string | undefined;
    const responseUsageMode = resolveResponseUsageMode(activeSessionEntry?.responseUsage ?? (sessionKey ? activeSessionStore?.[sessionKey]?.responseUsage : undefined));
    if (responseUsageMode !== "off" && hasNonzeroUsage(usage)) {
      const authMode = resolveModelAuthMode(providerUsed, cfg);
      const showCost = authMode === "api-key";
      let formatted = formatResponseUsageLine({ usage, showCost, costConfig: showCost ? resolveModelCostConfig({ provider: providerUsed, model: modelUsed, config: cfg }) : undefined });
      if (formatted && responseUsageMode === "full" && sessionKey) formatted = `${formatted} · sessão ${sessionKey}`;
      if (formatted) responseUsageLine = formatted;
    }

    let finalPayloads = replyPayloads;
    const verboseEnabled = resolvedVerboseLevel !== "off";
    if (autoCompactionCompleted) {
      const count = await incrementCompactionCount({ sessionEntry: activeSessionEntry, sessionStore: activeSessionStore, sessionKey, storePath });
      if (verboseEnabled) finalPayloads = [{ text: `🧹 Auto-compaction complete${typeof count === "number" ? ` (count ${count})` : ""}.` }, ...finalPayloads];
    }
    if (verboseEnabled && activeIsNewSession) finalPayloads = [{ text: `🧭 New session: ${followupRun.run.sessionId}` }, ...finalPayloads];
    if (responseUsageLine) finalPayloads = appendUsageLine(finalPayloads, responseUsageLine);

    return finalizeWithFollowup(finalPayloads.length === 1 ? finalPayloads[0] : finalPayloads, queueKey, runFollowupTurn);
  } finally {
    blockReplyPipeline?.stop();
    typing.markRunComplete();
  }
}
