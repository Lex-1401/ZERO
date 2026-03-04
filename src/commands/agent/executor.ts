// @ts-nocheck
import {
    resolveAgentDir,
    resolveAgentModelFallbacksOverride,
} from "../../agents/agent-scope.js";
import { runCliAgent } from "../../agents/cli-runner.js";
import { getCliSessionId } from "../../agents/cli-session.js";
import { runWithModelFallback } from "../../agents/model-fallback.js";
import { runEmbeddedPiAgent } from "../../agents/pi-embedded.js";
import { isCliProvider } from "../../agents/model-selection.js";
import { emitAgentEvent } from "../../infra/agent-events.js";
import { resolveMessageChannel } from "../../utils/message-channel.js";
import { resolveAgentRunContext } from "./run-context.js";
import type { AgentCommandOpts } from "./types.js";
import type { ZEROConfig } from "../../config/types.zero.js";
import type { SessionEntry } from "../../config/sessions.js";

export async function runAgentExecution(params: {
    cfg: ZEROConfig;
    sessionAgentId: string;
    sessionId: string;
    sessionKey: string | undefined;
    sessionEntry: SessionEntry | undefined;
    workspaceDir: string;
    skillsSnapshot: any;
    body: string;
    resolvedThinkLevel: any;
    resolvedVerboseLevel: any;
    timeoutMs: number;
    runId: string;
    provider: string;
    model: string;
    opts: AgentCommandOpts;
    sessionFile?: string;
}) {
    const {
        cfg,
        sessionAgentId,
        sessionId,
        sessionKey,
        sessionEntry,
        workspaceDir,
        skillsSnapshot,
        body,
        resolvedThinkLevel,
        resolvedVerboseLevel,
        timeoutMs,
        runId,
        provider,
        model,
        opts,
        sessionFile,
    } = params;

    const agentDir = resolveAgentDir(cfg, sessionAgentId);
    const startedAt = Date.now();
    let lifecycleEnded = false;

    const runContext = resolveAgentRunContext(opts);
    const messageChannel = resolveMessageChannel(
        runContext.messageChannel,
        opts.replyChannel ?? opts.channel,
    );
    const spawnedBy = opts.spawnedBy ?? sessionEntry?.spawnedBy;

    try {
        const fallbackResult = await runWithModelFallback({
            cfg,
            provider,
            model,
            fallbacksOverride: resolveAgentModelFallbacksOverride(cfg, sessionAgentId),
            run: async (providerOverride, modelOverride) => {
                if (isCliProvider(providerOverride, cfg)) {
                    const cliSessionId = getCliSessionId(sessionEntry, providerOverride);
                    return await runCliAgent({
                        sessionId,
                        sessionKey,
                        sessionFile,
                        workspaceDir,
                        config: cfg,
                        prompt: body,
                        provider: providerOverride,
                        model: modelOverride,
                        thinkLevel: resolvedThinkLevel,
                        timeoutMs,
                        runId,
                        extraSystemPrompt: opts.extraSystemPrompt,
                        cliSessionId,
                        images: opts.images,
                        streamParams: opts.streamParams,
                    });
                }
                const authProfileId =
                    providerOverride === provider ? sessionEntry?.authProfileOverride : undefined;
                return await runEmbeddedPiAgent({
                    sessionId,
                    sessionKey,
                    messageChannel,
                    agentAccountId: runContext.accountId,
                    messageTo: opts.replyTo ?? opts.to,
                    messageThreadId: opts.threadId,
                    groupId: runContext.groupId,
                    groupChannel: runContext.groupChannel,
                    groupSpace: runContext.groupSpace,
                    spawnedBy,
                    currentChannelId: runContext.currentChannelId,
                    currentThreadTs: runContext.currentThreadTs,
                    replyToMode: runContext.replyToMode,
                    hasRepliedRef: runContext.hasRepliedRef,
                    sessionFile,
                    workspaceDir,
                    config: cfg,
                    skillsSnapshot,
                    prompt: body,
                    images: opts.images,
                    clientTools: opts.clientTools,
                    provider: providerOverride,
                    model: modelOverride,
                    authProfileId,
                    authProfileIdSource: authProfileId
                        ? sessionEntry?.authProfileOverrideSource
                        : undefined,
                    thinkLevel: resolvedThinkLevel,
                    verboseLevel: resolvedVerboseLevel,
                    timeoutMs,
                    runId,
                    lane: opts.lane,
                    abortSignal: opts.abortSignal,
                    extraSystemPrompt: opts.extraSystemPrompt,
                    streamParams: opts.streamParams,
                    agentDir,
                    onAgentEvent: (evt) => {
                        if (
                            evt.stream === "lifecycle" &&
                            typeof evt.data?.phase === "string" &&
                            (evt.data.phase === "end" || evt.data.phase === "error")
                        ) {
                            lifecycleEnded = true;
                        }
                    },
                });
            },
        });

        const result = fallbackResult.result;
        if (!lifecycleEnded) {
            emitAgentEvent({
                runId,
                stream: "lifecycle",
                data: {
                    phase: "end",
                    startedAt,
                    endedAt: Date.now(),
                    aborted: (result as any).meta?.aborted ?? false,
                },
            });
        }
        return {
            result,
            fallbackProvider: fallbackResult.provider,
            fallbackModel: fallbackResult.model,
        };
    } catch (err) {
        if (!lifecycleEnded) {
            emitAgentEvent({
                runId,
                stream: "lifecycle",
                data: {
                    phase: "error",
                    startedAt,
                    endedAt: Date.now(),
                    error: String(err),
                },
            });
        }
        throw err;
    }
}
