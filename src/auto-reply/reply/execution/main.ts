
import fs from "node:fs";
import crypto from "node:crypto";
import { runEmbeddedPiAgent } from "../../../agents/pi-embedded.js";
import { runCliAgent } from "../../../agents/cli-runner.js";
import { isCliProvider } from "../../../agents/model-selection.js";
import { runWithModelFallback } from "../../../agents/model-fallback.js";
import {
    resolveEnforceFinalTag,
    buildThreadingToolContext,
    isBunFetchSocketError,
    formatBunFetchSocketError
} from "../agent-runner-utils.js";
import {
    resolveSessionTranscriptPath,
    updateSessionStore,
    resolveAgentIdFromSessionKey,
    resolveSessionFilePath
} from "../../../config/sessions.js";
import { emitAgentEvent, registerAgentRunContext } from "../../../infra/agent-events.js";
import { isSilentReplyText } from "../../tokens.js";
import { type AgentRunLoopResult } from "./types.js";

/**
 * Agent Runner Execution Core
 *
 * Implements the main run loop for agent turns, integrating with the embedded pi-agent
 * and CLI-based runners. Supports block streaming and fallback mechanisms.
 */
export async function runAgentTurnWithFallback(params: any): Promise<AgentRunLoopResult> {
    const {
        commandBody,
        followupRun,
        sessionCtx,
        opts,
        typingSignals,
        blockReplyPipeline,
        blockStreamingEnabled,
        shouldEmitToolResult,
        shouldEmitToolOutput,
        resetSessionAfterCompactionFailure,
        resetSessionAfterRoleOrderingConflict,
        sessionKey,
        getActiveSessionEntry,
        activeSessionStore,
        storePath,
        resolvedVerboseLevel,
    } = params;

    const runId = opts?.runId || crypto.randomUUID();
    registerAgentRunContext(runId, { sessionKey, verboseLevel: resolvedVerboseLevel });
    emitAgentEvent({ runId, stream: "lifecycle", data: { phase: "start" } });

    let autoCompactionCompleted = false;

    try {
        const fallbackResult = await runWithModelFallback({
            cfg: followupRun.run.config,
            provider: followupRun.run.provider,
            model: followupRun.run.model,
            run: async (provider, model) => {
                const isCli = isCliProvider(provider, followupRun.run.config);

                // Prepare threading tools if needed.
                const threadingTools = buildThreadingToolContext({
                    sessionCtx,
                    config: followupRun.run.config,
                    hasRepliedRef: opts?.hasRepliedRef,
                });

                // Prepare the run configuration.
                const runConfig = {
                    ...followupRun.run,
                    ...threadingTools,
                    runId, // Ensure runId is passed down
                    provider,
                    model,
                    prompt: commandBody || followupRun.prompt,
                    onAssistantMessageStart: async () => {
                        await typingSignals.signalMessageStart();
                    },
                    onPartialReply: async (payload: any) => {
                        const isSilent = isSilentReplyText(payload.text);
                        await typingSignals.signalTextDelta(payload.text);
                        if (!isSilent && opts?.onPartialReply) {
                            await opts.onPartialReply(payload);
                        }
                    },
                    onReasoningStream: async (payload: any) => {
                        const isSilent = isSilentReplyText(payload.text);
                        await typingSignals.signalReasoningDelta();
                        if (!isSilent && opts?.onReasoningStream) {
                            await opts.onReasoningStream(payload);
                        }
                    },
                    onToolResult: async (payload: any) => {
                        const isSilent = isSilentReplyText(payload.text);
                        await typingSignals.signalToolStart();
                        if (payload.text) {
                            await typingSignals.signalTextDelta(payload.text);
                        }
                        if (!isSilent && opts?.onToolResult) {
                            await opts.onToolResult(payload);
                        }
                    },
                    onBlockReply: !isCli && blockStreamingEnabled && blockReplyPipeline
                        ? async (payload: any) => {
                            const normalized = {
                                ...payload,
                                audioAsVoice: Boolean(payload.audioAsVoice),
                            };
                            await typingSignals.signalTextDelta(normalized.text);
                            blockReplyPipeline.enqueue(normalized);
                        }
                        : undefined,
                    onAgentEvent: (evt: any) => {
                        if (evt.stream === "compaction") {
                            const phase = typeof evt.data.phase === "string" ? evt.data.phase : "";
                            const willRetry = Boolean(evt.data.willRetry);
                            if (phase === "end" && !willRetry) {
                                autoCompactionCompleted = true;
                            }
                        }
                    },
                    enforceFinalTag: resolveEnforceFinalTag(followupRun.run, provider),
                    shouldEmitToolResult,
                    shouldEmitToolOutput,
                };

                // authProfileId fallback scoping: drop it if provider changes.
                if (provider !== followupRun.run.provider) {
                    delete (runConfig as any).authProfileId;
                    delete (runConfig as any).authProfileIdSource;
                }

                if (isCli) {
                    return await runCliAgent(runConfig as any);
                } else {
                    return await runEmbeddedPiAgent(runConfig as any);
                }
            },
        });

        const { result: runResult, provider: fallbackProvider, model: fallbackModel } = fallbackResult;

        // Check for specific error kinds returned in metadata.
        if (runResult.meta?.error) {
            const errorKind = runResult.meta.error.kind;
            const errorMsg = runResult.meta.error.message || "";

            if (errorKind === "context_overflow" || errorKind === "compaction_failure") {
                await resetSessionAfterCompactionFailure(errorMsg);
                emitAgentEvent({ runId, stream: "lifecycle", data: { phase: "end" } });
                return {
                    kind: "final",
                    payload: { text: `⚠️ Limite de contexto excedido durante a compactação (${sessionKey}). Reiniciei a sessão para liberar espaço.` }
                };
            }

            if (errorKind === "role_ordering") {
                await resetSessionAfterRoleOrderingConflict(errorMsg);
                emitAgentEvent({ runId, stream: "lifecycle", data: { phase: "end" } });
                return {
                    kind: "final",
                    payload: { text: `⚠️ Conflito de ordenação de mensagens detectado. Reiniciei a sessão.` }
                };
            }
        }

        // Check if the run payloads contain errors.
        for (const payload of (runResult.payloads ?? [])) {
            if (payload.isError && payload.text) {
                if (payload.text.includes("Context overflow") || payload.text.includes("prompt too large")) {
                    await resetSessionAfterCompactionFailure(payload.text);
                    emitAgentEvent({ runId, stream: "lifecycle", data: { phase: "end" } });
                    return {
                        kind: "final",
                        payload: { text: `⚠️ Limite de contexto excedido durante a compactação (${sessionKey}). Reiniciei a sessão para liberar espaço.` }
                    };
                }
                if (payload.text.includes("Message ordering conflict")) {
                    await resetSessionAfterRoleOrderingConflict(payload.text);
                    emitAgentEvent({ runId, stream: "lifecycle", data: { phase: "end" } });
                    return {
                        kind: "final",
                        payload: { text: `⚠️ Conflito de ordenação de mensagens detectado. Reiniciei a sessão.` }
                    };
                }
                if (isBunFetchSocketError(payload.text)) {
                    emitAgentEvent({ runId, stream: "lifecycle", data: { phase: "end" } });
                    return {
                        kind: "final",
                        payload: { text: formatBunFetchSocketError(payload.text), isError: true }
                    };
                }
            }
        }

        // Check if the run was aborted.
        if (runResult.meta?.aborted) {
            emitAgentEvent({ runId, stream: "lifecycle", data: { phase: "end" } });
            return {
                kind: "final",
                payload: { text: "Operação abortada.", isError: true }
            };
        }

        // Generic error fallback for metadata errors.
        if (runResult.meta?.error) {
            emitAgentEvent({ runId, stream: "lifecycle", data: { phase: "end" } });
            return {
                kind: "final",
                payload: { text: `⚠️ O agente falhou antes de responder. Erro: ${runResult.meta.error.message}`, isError: true }
            };
        }

        emitAgentEvent({ runId, stream: "lifecycle", data: { phase: "end" } });
        return {
            kind: "success",
            runResult,
            fallbackProvider,
            fallbackModel,
            autoCompactionCompleted,
            didLogHeartbeatStrip: false,
        } as any;
    } catch (err) {
        const errorMsg = String(err);

        // Gemini Corruption / Incorrect role information - special case for hard reset/deletion.
        if (errorMsg.includes("function call turn comes immediately after") || errorMsg.includes("Incorrect role information")) {
            const activeEntry = getActiveSessionEntry();
            const sessionId = activeEntry?.sessionId;
            const agentId = sessionKey ? resolveAgentIdFromSessionKey(sessionKey) : undefined;

            if (activeSessionStore && sessionKey) {
                delete activeSessionStore[sessionKey];
            }
            if (storePath && sessionKey) {
                await updateSessionStore(storePath, (store) => {
                    delete store[sessionKey];
                });
            }
            if (sessionId) {
                const transcriptPath = resolveSessionFilePath(sessionId, activeEntry, { agentId });
                if (transcriptPath) {
                    try { fs.unlinkSync(transcriptPath); } catch { }
                }
                const defaultTranscript = resolveSessionTranscriptPath(sessionId, agentId);
                if (defaultTranscript !== transcriptPath) {
                    try { fs.unlinkSync(defaultTranscript); } catch { }
                }
            }

            const friendlyMsg = errorMsg.includes("Incorrect role information")
                ? "⚠️ Conflito de ordenação de mensagens detectado. Reiniciei a sessão."
                : "⚠️ O histórico da sessão foi corrompido. Reiniciando do zero.";

            emitAgentEvent({ runId, stream: "lifecycle", data: { phase: "end" } });
            return {
                kind: "final",
                payload: { text: friendlyMsg }
            };
        }

        if (errorMsg.includes("Context overflow") || errorMsg.includes("prompt is too long")) {
            await resetSessionAfterCompactionFailure(errorMsg);
            emitAgentEvent({ runId, stream: "lifecycle", data: { phase: "end" } });
            return {
                kind: "final",
                payload: { text: `⚠️ Limite de contexto excedido durante a compactação (${sessionKey}). Reiniciei a sessão para liberar espaço.` }
            };
        }
        if (errorMsg.includes("role_ordering") || errorMsg.includes("roles must alternate")) {
            await resetSessionAfterRoleOrderingConflict(errorMsg);
            emitAgentEvent({ runId, stream: "lifecycle", data: { phase: "end" } });
            return {
                kind: "final",
                payload: { text: `⚠️ Conflito de ordenação de mensagens detectado. Reiniciei a sessão.` }
            };
        }

        emitAgentEvent({ runId, stream: "lifecycle", data: { phase: "end" } });
        return {
            kind: "final",
            payload: { text: `⚠️ O agente falhou antes de responder. Erro: ${errorMsg}`, isError: true }
        };
    }
}
