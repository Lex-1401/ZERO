// @ts-nocheck

import { type AgentMessage } from "@mariozechner/pi-agent-core";
import { type AssistantMessage } from "@mariozechner/pi-ai";
import { subscribeEmbeddedPiSession } from "../../pi-embedded-subscribe.js";
import { setActiveEmbeddedRun, clearActiveEmbeddedRun } from "../runs.js";
import { isTimeoutError } from "../../failover-error.js";
import { sanitizeSessionHistory } from "../google.js";
import { getDmHistoryLimitFromSessionKey, limitHistoryTurns } from "../history.js";
import { log } from "../logger.js";
import { type EmbeddedRunAttemptParams } from "../types.js";

export async function executeEmbeddedRun(params: {
    params: EmbeddedRunAttemptParams;
    activeSession: any;
    sessionManager: any;
    transcriptPolicy: any;
    runAbortController: AbortController;
    effectivePrompt: string;
}) {
    const { params: p, activeSession, sessionManager, transcriptPolicy, runAbortController, effectivePrompt } = params;

    try {
        const prior = await sanitizeSessionHistory({
            messages: activeSession.messages,
            modelApi: p.model.api,
            modelId: p.modelId,
            provider: p.provider,
            sessionManager,
            sessionId: p.sessionId,
            policy: transcriptPolicy,
        });

        const limited = limitHistoryTurns(
            prior,
            getDmHistoryLimitFromSessionKey(p.sessionKey, p.config),
        );
        if (limited.length > 0) {
            activeSession.agent.replaceMessages(limited);
        }
    } catch (err) {
        sessionManager.flushPendingToolResults?.();
        activeSession.dispose();
        throw err;
    }

    let aborted = Boolean(p.abortSignal?.aborted);
    let timedOut = false;

    const abortRun = (isTimeout = false, reason?: unknown) => {
        aborted = true;
        if (isTimeout) timedOut = true;
        if (isTimeout) {
            runAbortController.abort(reason ?? new Error("request timed out"));
        } else {
            runAbortController.abort(reason);
        }
        void activeSession.abort();
    };

    const subscription = subscribeEmbeddedPiSession({
        session: activeSession,
        runId: p.runId,
        verboseLevel: p.verboseLevel,
        reasoningMode: p.reasoningLevel ?? "off",
        toolResultFormat: p.toolResultFormat,
        shouldEmitToolResult: p.shouldEmitToolResult,
        shouldEmitToolOutput: p.shouldEmitToolOutput,
        onToolResult: p.onToolResult,
        onReasoningStream: p.onReasoningStream,
        onBlockReply: p.onBlockReply,
        onBlockReplyFlush: p.onBlockReplyFlush,
        blockReplyBreak: p.blockReplyBreak,
        blockReplyChunking: p.blockReplyChunking,
        onPartialReply: p.onPartialReply,
        onAssistantMessageStart: p.onAssistantMessageStart,
        onAgentEvent: p.onAgentEvent,
        enforceFinalTag: p.enforceFinalTag,
    });

    setActiveEmbeddedRun(p.sessionId, {
        queueMessage: async (text: string) => { await activeSession.steer(text); },
        isStreaming: () => activeSession.isStreaming,
        isCompacting: () => subscription.isCompacting(),
        abort: abortRun,
    });

    const isProbeSession = p.sessionId?.startsWith("probe-") ?? false;
    const abortTimer = setTimeout(() => {
        if (!isProbeSession) {
            log.warn(`embedded run timeout: runId=${p.runId} sessionId=${p.sessionId} timeoutMs=${p.timeoutMs}`);
        }
        abortRun(true);
    }, Math.max(1, p.timeoutMs));

    const onAbort = () => {
        const reason = p.abortSignal ? (p.abortSignal as any).reason : undefined;
        const timeout = reason ? isTimeoutError(reason) : false;
        abortRun(timeout, reason);
    };
    if (p.abortSignal) {
        if (p.abortSignal.aborted) onAbort();
        else p.abortSignal.addEventListener("abort", onAbort, { once: true });
    }

    let messagesSnapshot: AgentMessage[] = [];
    let promptError: unknown = null;
    const promptStartedAt = Date.now();

    try {
        await activeSession.prompt(effectivePrompt, { signal: runAbortController.signal });
    } catch (err) {
        if (!p.abortSignal?.aborted && !timedOut) {
            promptError = err;
        }
    } finally {
        clearTimeout(abortTimer);
        if (p.abortSignal) p.abortSignal.removeEventListener("abort", onAbort);
        clearActiveEmbeddedRun(p.sessionId);
        messagesSnapshot = [...activeSession.messages];
    }

    const lastAssistant = messagesSnapshot.length > 0
        ? (messagesSnapshot[messagesSnapshot.length - 1] as any).role === "assistant"
            ? (messagesSnapshot[messagesSnapshot.length - 1] as unknown as AssistantMessage)
            : undefined
        : undefined;

    return {
        aborted,
        timedOut,
        promptError,
        messagesSnapshot,
        subscription,
        lastAssistant,
        promptDurationMs: Date.now() - promptStartedAt,
    };
}
