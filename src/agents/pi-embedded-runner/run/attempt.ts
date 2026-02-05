import fs from "node:fs/promises";
import os from "node:os";

import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { AssistantMessage, ImageContent } from "@mariozechner/pi-ai";
import { streamSimple } from "@mariozechner/pi-ai";
import {
  createAgentSession,
  SessionManager,
  SettingsManager,
} from "@mariozechner/pi-coding-agent";

import { resolveHeartbeatPrompt } from "../../../auto-reply/heartbeat.js";
import {
  listChannelSupportedActions,
  resolveChannelMessageToolHints,
} from "../../channel-tools.js";
import { resolveChannelCapabilities } from "../../../config/channel-capabilities.js";
import { resolveGatewayAuth } from "../../../gateway/auth.js";
import { getMachineDisplayName } from "../../../infra/machine-name.js";
import { AuditCrypt } from "../../../security/crypt.js";
import { resolveTelegramInlineButtonsScope } from "../../../telegram/inline-buttons.js";
import { resolveTelegramReactionLevel } from "../../../telegram/reaction-level.js";
import { resolveSignalReactionLevel } from "../../../signal/reaction-level.js";
import { normalizeMessageChannel } from "../../../utils/message-channel.js";
import { isReasoningTagProvider } from "../../../utils/provider-utils.js";
import { isSubagentSessionKey } from "../../../routing/session-key.js";
import { resolveUserPath } from "../../../utils.js";
import { createCacheTrace } from "../../cache-trace.js";
import { createAnthropicPayloadLogger } from "../../anthropic-payload-log.js";
import { resolveZEROAgentDir } from "../../agent-paths.js";
import { resolveSessionAgentIds } from "../../agent-scope.js";
import { makeBootstrapWarn, resolveBootstrapContextForRun } from "../../bootstrap-files.js";
import { resolveZERODocsPath } from "../../docs-path.js";
import { resolveModelAuthMode } from "../../model-auth.js";
import {
  isCloudCodeAssistFormatError,
  resolveBootstrapMaxChars,
  validateAnthropicTurns,
  validateGeminiTurns,
} from "../../pi-embedded-helpers.js";
import { subscribeEmbeddedPiSession } from "../../pi-embedded-subscribe.js";
import {
  ensurePiCompactionReserveTokens,
  resolveCompactionReserveTokensFloor,
} from "../../pi-settings.js";
import { createZEROCodingTools } from "../../pi-tools.js";
import { resolveSandboxContext } from "../../sandbox.js";
import { guardSessionManager } from "../../session-tool-result-guard-wrapper.js";
import { resolveTranscriptPolicy } from "../../transcript-policy.js";
import { acquireSessionWriteLock } from "../../session-write-lock.js";
import {
  applySkillEnvOverrides,
  applySkillEnvOverridesFromSnapshot,
  loadWorkspaceSkillEntries,
  resolveSkillsPromptForRun,
} from "../../skills.js";
import { DEFAULT_BOOTSTRAP_FILENAME } from "../../workspace.js";
import { buildSystemPromptReport } from "../../system-prompt-report.js";
import { resolveDefaultModelForAgent } from "../../model-selection.js";

import { isAbortError } from "../abort.js";
import { buildEmbeddedExtensionPaths } from "../extensions.js";
import { applyExtraParamsToAgent } from "../extra-params.js";
import { appendCacheTtlTimestamp, isCacheTtlEligibleProvider } from "../cache-ttl.js";
import {
  logToolSchemasForGoogle,
  sanitizeSessionHistory,
  sanitizeToolsForGoogle,
} from "../google.js";
import { getDmHistoryLimitFromSessionKey, limitHistoryTurns } from "../history.js";
import { log } from "../logger.js";
import { buildModelAliasLines } from "../model.js";
import {
  clearActiveEmbeddedRun,
  type EmbeddedPiQueueHandle,
  setActiveEmbeddedRun,
} from "../runs.js";
import { buildEmbeddedSandboxInfo } from "../sandbox-info.js";
import { prewarmSessionFile, trackSessionManagerAccess } from "../session-manager-cache.js";
import { prepareSessionManagerForRun } from "../session-manager-init.js";
import { buildEmbeddedSystemPrompt, createSystemPromptOverride } from "../system-prompt.js";
import { splitSdkTools } from "../tool-split.js";
import { toClientToolDefinitions } from "../../pi-tool-definition-adapter.js";
import { buildSystemPromptParams } from "../../system-prompt-params.js";
import { describeUnknownError, mapThinkingLevel } from "../utils.js";
import { resolveSandboxRuntimeStatus } from "../../sandbox/runtime-status.js";
import { buildTtsSystemPromptHint } from "../../../tts/tts.js";
import { isTimeoutError } from "../../failover-error.js";
import { getGlobalHookRunner } from "../../../plugins/hook-runner-global.js";
import { MAX_IMAGE_BYTES } from "../../../media/constants.js";
import type { EmbeddedRunAttemptParams, EmbeddedRunAttemptResult } from "./types.js";
import { detectAndLoadPromptImages } from "./images.js";
import { SecurityGuard } from "../../../security/guard.js";
import { MemoryIndexManager } from "../../../memory/manager.js";

export function injectHistoryImagesIntoMessages(
  messages: AgentMessage[],
  historyImagesByIndex: Map<number, ImageContent[]>,
): boolean {
  if (historyImagesByIndex.size === 0) return false;
  let didMutate = false;

  for (const [msgIndex, images] of historyImagesByIndex) {
    // Bounds check: ensure index is valid before accessing
    if (msgIndex < 0 || msgIndex >= messages.length) continue;
    const msg = messages[msgIndex];
    if (msg && msg.role === "user") {
      // Convert string content to array format if needed
      if (typeof msg.content === "string") {
        msg.content = [{ type: "text", text: msg.content }];
        didMutate = true;
      }
      if (Array.isArray(msg.content)) {
        // Check for existing image content to avoid duplicates across turns
        const existingImageData = new Set(
          msg.content
            .filter(
              (c): c is ImageContent =>
                c != null &&
                typeof c === "object" &&
                c.type === "image" &&
                typeof c.data === "string",
            )
            .map((c) => c.data),
        );
        for (const img of images) {
          // Only add if this image isn't already in the message
          if (!existingImageData.has(img.data)) {
            msg.content.push(img);
            didMutate = true;
          }
        }
      }
    }
  }

  return didMutate;
}

export async function runEmbeddedAttempt(
  params: EmbeddedRunAttemptParams,
): Promise<EmbeddedRunAttemptResult> {
  const resolvedWorkspace = resolveUserPath(params.workspaceDir);
  const prevCwd = process.cwd();
  const runAbortController = new AbortController();

  // LLM01: Prompt Injection Guard
  const injection = SecurityGuard.detectPromptInjection(params.prompt);
  if (injection) {
    log.warn(`Blocked prompt injection attempt: ${injection.details}`);
    throw new Error(`Security Violation: ${injection.details}`);
  }

  // LLM06: PII Redaction Middleware (Input)
  // Obfuscate prompt before it touches any downstream logic (logging, hooks, or model).
  const obfuscatedPrompt = SecurityGuard.obfuscatePrompt(params.prompt);
  if (obfuscatedPrompt !== params.prompt) {
    log.info(`SecurityGuard: Obfuscated PII in user prompt`);
    params.prompt = obfuscatedPrompt;
  }

  log.debug(
    `embedded run start: runId=${params.runId} sessionId=${params.sessionId} provider=${params.provider} model=${params.modelId} thinking=${params.thinkLevel} messageChannel=${params.messageChannel ?? params.messageProvider ?? "unknown"}`,
  );

  await fs.mkdir(resolvedWorkspace, { recursive: true });

  const sandboxSessionKey = params.sessionKey?.trim() || params.sessionId;
  const sandbox = await resolveSandboxContext({
    config: params.config,
    sessionKey: sandboxSessionKey,
    workspaceDir: resolvedWorkspace,
  });
  const effectiveWorkspace = sandbox?.enabled
    ? sandbox.workspaceAccess === "rw"
      ? resolvedWorkspace
      : sandbox.workspaceDir
    : resolvedWorkspace;
  await fs.mkdir(effectiveWorkspace, { recursive: true });

  let restoreSkillEnv: (() => void) | undefined;
  process.chdir(effectiveWorkspace);
  try {
    const shouldLoadSkillEntries = !params.skillsSnapshot || !params.skillsSnapshot.resolvedSkills;
    const skillEntries = shouldLoadSkillEntries
      ? loadWorkspaceSkillEntries(effectiveWorkspace)
      : [];
    restoreSkillEnv = params.skillsSnapshot
      ? applySkillEnvOverridesFromSnapshot({
        snapshot: params.skillsSnapshot,
        config: params.config,
      })
      : applySkillEnvOverrides({
        skills: skillEntries ?? [],
        config: params.config,
      });

    const skillsPrompt = resolveSkillsPromptForRun({
      skillsSnapshot: params.skillsSnapshot,
      entries: shouldLoadSkillEntries ? skillEntries : undefined,
      config: params.config,
      workspaceDir: effectiveWorkspace,
    });

    const sessionLabel = params.sessionKey ?? params.sessionId;
    const { bootstrapFiles: hookAdjustedBootstrapFiles, contextFiles } =
      await resolveBootstrapContextForRun({
        workspaceDir: effectiveWorkspace,
        config: params.config,
        sessionKey: params.sessionKey,
        sessionId: params.sessionId,
        warn: makeBootstrapWarn({ sessionLabel, warn: (message) => log.warn(message) }),
      });
    const workspaceNotes = hookAdjustedBootstrapFiles.some(
      (file) => file.name === DEFAULT_BOOTSTRAP_FILENAME && !file.missing,
    )
      ? ["Reminder: commit your changes in this workspace after edits."]
      : undefined;

    const agentDir = params.agentDir ?? resolveZEROAgentDir();

    // Check if the model supports native image input
    const modelHasVision = params.model.input?.includes("image") ?? false;
    const toolsRaw = params.disableTools
      ? []
      : createZEROCodingTools({
        exec: {
          ...params.execOverrides,
          elevated: params.bashElevated,
        },
        sandbox,
        messageProvider: params.messageChannel ?? params.messageProvider,
        agentAccountId: params.agentAccountId,
        messageTo: params.messageTo,
        messageThreadId: params.messageThreadId,
        groupId: params.groupId,
        groupChannel: params.groupChannel,
        groupSpace: params.groupSpace,
        spawnedBy: params.spawnedBy,
        sessionKey: params.sessionKey ?? params.sessionId,
        agentDir,
        workspaceDir: effectiveWorkspace,
        config: params.config,
        abortSignal: runAbortController.signal,
        modelProvider: params.model.provider,
        modelId: params.modelId,
        modelAuthMode: resolveModelAuthMode(params.model.provider, params.config),
        currentChannelId: params.currentChannelId,
        currentThreadTs: params.currentThreadTs,
        replyToMode: params.replyToMode,
        hasRepliedRef: params.hasRepliedRef,
        modelHasVision,
      });
    const tools = sanitizeToolsForGoogle({ tools: toolsRaw, provider: params.provider });
    logToolSchemasForGoogle({ tools, provider: params.provider });

    const machineName = await getMachineDisplayName();
    const runtimeChannel = normalizeMessageChannel(params.messageChannel ?? params.messageProvider);
    let runtimeCapabilities = runtimeChannel
      ? (resolveChannelCapabilities({
        cfg: params.config,
        channel: runtimeChannel,
        accountId: params.agentAccountId,
      }) ?? [])
      : undefined;
    if (runtimeChannel === "telegram" && params.config) {
      const inlineButtonsScope = resolveTelegramInlineButtonsScope({
        cfg: params.config,
        accountId: params.agentAccountId ?? undefined,
      });
      if (inlineButtonsScope !== "off") {
        if (!runtimeCapabilities) runtimeCapabilities = [];
        if (
          !runtimeCapabilities.some((cap) => String(cap).trim().toLowerCase() === "inlinebuttons")
        ) {
          runtimeCapabilities.push("inlineButtons");
        }
      }
    }
    const reactionGuidance =
      runtimeChannel && params.config
        ? (() => {
          if (runtimeChannel === "telegram") {
            const resolved = resolveTelegramReactionLevel({
              cfg: params.config,
              accountId: params.agentAccountId ?? undefined,
            });
            const level = resolved.agentReactionGuidance;
            return level ? { level, channel: "Telegram" } : undefined;
          }
          if (runtimeChannel === "signal") {
            const resolved = resolveSignalReactionLevel({
              cfg: params.config,
              accountId: params.agentAccountId ?? undefined,
            });
            const level = resolved.agentReactionGuidance;
            return level ? { level, channel: "Signal" } : undefined;
          }
          return undefined;
        })()
        : undefined;
    const { defaultAgentId, sessionAgentId } = resolveSessionAgentIds({
      sessionKey: params.sessionKey,
      config: params.config,
    });
    const sandboxInfo = buildEmbeddedSandboxInfo(sandbox, params.bashElevated);
    const reasoningTagHint = isReasoningTagProvider(params.provider);
    // Resolve channel-specific message actions for system prompt
    const channelActions = runtimeChannel
      ? listChannelSupportedActions({
        cfg: params.config,
        channel: runtimeChannel,
      })
      : undefined;
    const messageToolHints = runtimeChannel
      ? resolveChannelMessageToolHints({
        cfg: params.config,
        channel: runtimeChannel,
        accountId: params.agentAccountId,
      })
      : undefined;

    const defaultModelRef = resolveDefaultModelForAgent({
      cfg: params.config ?? {},
      agentId: sessionAgentId,
    });
    const defaultModelLabel = `${defaultModelRef.provider}/${defaultModelRef.model}`;
    const { runtimeInfo, userTimezone, userTime, userTimeFormat } = buildSystemPromptParams({
      config: params.config,
      agentId: sessionAgentId,
      workspaceDir: effectiveWorkspace,
      cwd: process.cwd(),
      runtime: {
        host: machineName,
        os: `${os.type()} ${os.release()}`,
        arch: os.arch(),
        node: process.version,
        model: `${params.provider}/${params.modelId}`,
        defaultModel: defaultModelLabel,
        channel: runtimeChannel,
        capabilities: runtimeCapabilities,
        channelActions,
      },
    });
    const isDefaultAgent = sessionAgentId === defaultAgentId;
    const promptMode = isSubagentSessionKey(params.sessionKey) ? "minimal" : "full";
    const docsPath = await resolveZERODocsPath({
      workspaceDir: effectiveWorkspace,
      argv1: process.argv[1],
      cwd: process.cwd(),
      moduleUrl: import.meta.url,
    });
    const ttsHint = params.config ? buildTtsSystemPromptHint(params.config) : undefined;

    // Auto-Recall: Inject relevant memories into system prompt
    let memoryContextString = "";
    if (params.prompt && params.prompt.length > 5 && !isSubagentSessionKey(params.sessionKey)) {
      try {
        const memoryManager = await MemoryIndexManager.get({
          cfg: params.config ?? {},
          agentId: sessionAgentId,
        });

        // Check if auto-recall is effectively enabled (defaulting to true for now if manager exists)
        if (memoryManager) {
          // We use a safe default search
          const memories = await memoryManager.search(params.prompt, {
            maxResults: 5,
            minScore: 0.6,
            sessionKey: params.sessionKey,
          });

          if (memories.length > 0) {
            memoryContextString = [
              "",
              "## Memórias Relevantes (Auto-Recall)",
              "Informações recuperadas da memória de longo prazo que podem ser relevantes:",
              ...memories.map((m) => `- ${m.snippet} (Confidence: ${m.score.toFixed(2)})`),
              "",
            ].join("\n");
            log.debug(
              `Auto-recalled ${memories.length} memories for prompt: "${params.prompt.substring(0, 50)}..."`,
            );
          }
        }
      } catch (err) {
        log.warn(`Auto-recall failed: ${String(err)}`);
      }
    }

    const appendPrompt = buildEmbeddedSystemPrompt({
      workspaceDir: effectiveWorkspace,
      defaultThinkLevel: params.thinkLevel,
      reasoningLevel: params.reasoningLevel ?? "off",
      extraSystemPrompt: params.extraSystemPrompt
        ? `${params.extraSystemPrompt}\n${memoryContextString}`
        : memoryContextString,
      ownerNumbers: params.ownerNumbers,

      reasoningTagHint,
      heartbeatPrompt: isDefaultAgent
        ? resolveHeartbeatPrompt(params.config?.agents?.defaults?.heartbeat?.prompt)
        : undefined,
      skillsPrompt,
      docsPath: docsPath ?? undefined,
      ttsHint,
      workspaceNotes,
      reactionGuidance,
      promptMode,
      runtimeInfo,
      messageToolHints,
      sandboxInfo,
      tools,
      modelAliasLines: buildModelAliasLines(params.config),
      userTimezone,
      userTime,
      userTimeFormat,
      contextFiles,
    });
    const systemPromptReport = buildSystemPromptReport({
      source: "run",
      generatedAt: Date.now(),
      sessionId: params.sessionId,
      sessionKey: params.sessionKey,
      provider: params.provider,
      model: params.modelId,
      workspaceDir: effectiveWorkspace,
      bootstrapMaxChars: resolveBootstrapMaxChars(params.config),
      sandbox: (() => {
        const runtime = resolveSandboxRuntimeStatus({
          cfg: params.config,
          sessionKey: params.sessionKey ?? params.sessionId,
        });
        return { mode: runtime.mode, sandboxed: runtime.sandboxed };
      })(),
      systemPrompt: appendPrompt,
      bootstrapFiles: hookAdjustedBootstrapFiles,
      injectedFiles: contextFiles,
      skillsPrompt,
      tools,
    });
    const systemPrompt = createSystemPromptOverride(appendPrompt);

    const sessionLock = await acquireSessionWriteLock({
      sessionFile: params.sessionFile,
    });

    const config = params.config ?? {};
    const isEncryptedConfig = config.session?.encrypt === true;
    const auth = resolveGatewayAuth({ authConfig: config.gateway?.auth });
    const encryptionToken = auth.token;

    let activeSessionFile = params.sessionFile;
    let _isTempSession = false;

    if (encryptionToken) {
      const prepared = await AuditCrypt.prepareSessionFile(params.sessionFile, encryptionToken);
      activeSessionFile = prepared.path;
      _isTempSession = prepared.isTemp;
    }

    let sessionManager: ReturnType<typeof guardSessionManager> | undefined;
    let session: Awaited<ReturnType<typeof createAgentSession>>["session"] | undefined;
    try {
      const hadSessionFile = await fs
        .stat(params.sessionFile)
        .then(() => true)
        .catch(() => false);

      const transcriptPolicy = resolveTranscriptPolicy({
        modelApi: params.model?.api,
        provider: params.provider,
        modelId: params.modelId,
      });

      await prewarmSessionFile(activeSessionFile);
      sessionManager = guardSessionManager(SessionManager.open(activeSessionFile), {
        agentId: sessionAgentId,
        sessionKey: params.sessionKey,
        allowSyntheticToolResults: transcriptPolicy.allowSyntheticToolResults,
      });
      trackSessionManagerAccess(activeSessionFile);

      await prepareSessionManagerForRun({
        sessionManager,
        sessionFile: activeSessionFile,
        hadSessionFile,
        sessionId: params.sessionId,
        cwd: effectiveWorkspace,
      });

      const settingsManager = SettingsManager.create(effectiveWorkspace, agentDir);
      ensurePiCompactionReserveTokens({
        settingsManager,
        minReserveTokens: resolveCompactionReserveTokensFloor(params.config),
      });

      const additionalExtensionPaths = buildEmbeddedExtensionPaths({
        cfg: params.config,
        sessionManager,
        provider: params.provider,
        modelId: params.modelId,
        model: params.model,
      });

      const { builtInTools, customTools } = splitSdkTools({
        tools,
        sandboxEnabled: !!sandbox?.enabled,
      });

      // Add client tools (OpenResponses hosted tools) to customTools
      let clientToolCallDetected: { name: string; params: Record<string, unknown> } | null = null;
      const clientToolDefs = params.clientTools
        ? toClientToolDefinitions(params.clientTools, (toolName, toolParams) => {
          clientToolCallDetected = { name: toolName, params: toolParams };
        })
        : [];

      const allCustomTools = [...customTools, ...clientToolDefs];

      ({ session } = await createAgentSession({
        cwd: resolvedWorkspace,
        agentDir,
        authStorage: params.authStorage,
        modelRegistry: params.modelRegistry,
        model: params.model,
        thinkingLevel: mapThinkingLevel(params.thinkLevel),
        systemPrompt,
        tools: builtInTools,
        customTools: allCustomTools,
        sessionManager,
        settingsManager,
        skills: [],
        contextFiles: [],
        additionalExtensionPaths,
      }));
      if (!session) {
        throw new Error("Embedded agent session missing");
      }
      const activeSession = session;
      const cacheTrace = createCacheTrace({
        cfg: params.config,
        env: process.env,
        runId: params.runId,
        sessionId: activeSession.sessionId,
        sessionKey: params.sessionKey,
        provider: params.provider,
        modelId: params.modelId,
        modelApi: params.model.api,
        workspaceDir: params.workspaceDir,
      });
      const anthropicPayloadLogger = createAnthropicPayloadLogger({
        env: process.env,
        runId: params.runId,
        sessionId: activeSession.sessionId,
        sessionKey: params.sessionKey,
        provider: params.provider,
        modelId: params.modelId,
        modelApi: params.model.api,
        workspaceDir: params.workspaceDir,
      });

      // Force a stable streamFn reference so vitest can reliably mock @mariozechner/pi-ai.
      activeSession.agent.streamFn = streamSimple;

      applyExtraParamsToAgent(
        activeSession.agent,
        config,
        params.provider,
        params.modelId,
        params.streamParams,
      );

      if (cacheTrace) {
        cacheTrace.recordStage("session:loaded", {
          messages: activeSession.messages,
          system: systemPrompt,
          note: "after session create",
        });
        activeSession.agent.streamFn = cacheTrace.wrapStreamFn(activeSession.agent.streamFn);
      }
      if (anthropicPayloadLogger) {
        activeSession.agent.streamFn = anthropicPayloadLogger.wrapStreamFn(
          activeSession.agent.streamFn,
        );
      }

      try {
        const prior = await sanitizeSessionHistory({
          messages: activeSession.messages,
          modelApi: params.model.api,
          modelId: params.modelId,
          provider: params.provider,
          sessionManager,
          sessionId: params.sessionId,
          policy: transcriptPolicy,
        });
        cacheTrace?.recordStage("session:sanitized", { messages: prior });
        const validatedGemini = transcriptPolicy.validateGeminiTurns
          ? validateGeminiTurns(prior)
          : prior;
        const validated = transcriptPolicy.validateAnthropicTurns
          ? validateAnthropicTurns(validatedGemini)
          : validatedGemini;
        const limited = limitHistoryTurns(
          validated,
          getDmHistoryLimitFromSessionKey(params.sessionKey, config),
        );
        cacheTrace?.recordStage("session:limited", { messages: limited });
        if (limited.length > 0) {
          activeSession.agent.replaceMessages(limited);
        }
      } catch (err) {
        sessionManager.flushPendingToolResults?.();
        activeSession.dispose();
        throw err;
      }

      let aborted = Boolean(params.abortSignal?.aborted);
      let timedOut = false;
      const getAbortReason = (signal: AbortSignal): unknown =>
        "reason" in signal ? (signal as { reason?: unknown }).reason : undefined;
      const makeTimeoutAbortReason = (): Error => {
        const err = new Error("request timed out");
        err.name = "TimeoutError";
        return err;
      };
      const makeAbortError = (signal: AbortSignal): Error => {
        const reason = getAbortReason(signal);
        const err = reason ? new Error("aborted", { cause: reason }) : new Error("aborted");
        err.name = "AbortError";
        return err;
      };
      const abortRun = (isTimeout = false, reason?: unknown) => {
        aborted = true;
        if (isTimeout) timedOut = true;
        if (isTimeout) {
          runAbortController.abort(reason ?? makeTimeoutAbortReason());
        } else {
          runAbortController.abort(reason);
        }
        void activeSession.abort();
      };
      const abortable = <T>(promise: Promise<T>): Promise<T> => {
        const signal = runAbortController.signal;
        if (signal.aborted) {
          return Promise.reject(makeAbortError(signal));
        }
        return new Promise<T>((resolve, reject) => {
          const onAbort = () => {
            signal.removeEventListener("abort", onAbort);
            reject(makeAbortError(signal));
          };
          signal.addEventListener("abort", onAbort, { once: true });
          promise.then(
            (value) => {
              signal.removeEventListener("abort", onAbort);
              resolve(value);
            },
            (err) => {
              signal.removeEventListener("abort", onAbort);
              reject(err);
            },
          );
        });
      };

      const subscription = subscribeEmbeddedPiSession({
        session: activeSession,
        runId: params.runId,
        verboseLevel: params.verboseLevel,
        reasoningMode: params.reasoningLevel ?? "off",
        toolResultFormat: params.toolResultFormat,
        shouldEmitToolResult: params.shouldEmitToolResult,
        shouldEmitToolOutput: params.shouldEmitToolOutput,
        onToolResult: params.onToolResult,
        onReasoningStream: params.onReasoningStream,
        onBlockReply: params.onBlockReply,
        onBlockReplyFlush: params.onBlockReplyFlush,
        blockReplyBreak: params.blockReplyBreak,
        blockReplyChunking: params.blockReplyChunking,
        onPartialReply: params.onPartialReply,
        onAssistantMessageStart: params.onAssistantMessageStart,
        onAgentEvent: params.onAgentEvent,
        enforceFinalTag: params.enforceFinalTag,
      });

      const {
        assistantTexts,
        toolMetas,
        unsubscribe,
        waitForCompactionRetry,
        getMessagingToolSentTexts,
        getMessagingToolSentTargets,
        didSendViaMessagingTool,
        getLastToolError,
      } = subscription;

      const queueHandle: EmbeddedPiQueueHandle = {
        queueMessage: async (text: string) => {
          await activeSession.steer(text);
        },
        isStreaming: () => activeSession.isStreaming,
        isCompacting: () => subscription.isCompacting(),
        abort: abortRun,
      };
      setActiveEmbeddedRun(params.sessionId, queueHandle);

      let abortWarnTimer: NodeJS.Timeout | undefined;
      const isProbeSession = params.sessionId?.startsWith("probe-") ?? false;
      const abortTimer = setTimeout(
        () => {
          if (!isProbeSession) {
            log.warn(
              `embedded run timeout: runId=${params.runId} sessionId=${params.sessionId} timeoutMs=${params.timeoutMs}`,
            );
          }
          abortRun(true);
          if (!abortWarnTimer) {
            abortWarnTimer = setTimeout(() => {
              if (!activeSession.isStreaming) return;
              if (!isProbeSession) {
                log.warn(
                  `embedded run abort still streaming: runId=${params.runId} sessionId=${params.sessionId}`,
                );
              }
            }, 10_000);
          }
        },
        Math.max(1, params.timeoutMs),
      );

      let messagesSnapshot: AgentMessage[] = [];
      let sessionIdUsed = activeSession.sessionId;
      const onAbort = () => {
        const reason = params.abortSignal ? getAbortReason(params.abortSignal) : undefined;
        const timeout = reason ? isTimeoutError(reason) : false;
        abortRun(timeout, reason);
      };
      if (params.abortSignal) {
        if (params.abortSignal.aborted) {
          onAbort();
        } else {
          params.abortSignal.addEventListener("abort", onAbort, {
            once: true,
          });
        }
      }

      // Get hook runner once for both before_agent_start and agent_end hooks
      const hookRunner = getGlobalHookRunner();

      let promptError: unknown = null;
      try {
        const promptStartedAt = Date.now();

        // Run before_agent_start hooks to allow plugins to inject context
        let effectivePrompt = params.prompt;
        if (hookRunner?.hasHooks("before_agent_start")) {
          try {
            const hookResult = await hookRunner.runBeforeAgentStart(
              {
                prompt: params.prompt,
                messages: activeSession.messages,
              },
              {
                agentId: params.sessionKey?.split(":")[0] ?? "main",
                sessionKey: params.sessionKey,
                workspaceDir: params.workspaceDir,
                messageProvider: params.messageProvider ?? undefined,
              },
            );
            if (hookResult?.prependContext) {
              effectivePrompt = `${hookResult.prependContext}\n\n${params.prompt}`;
              log.debug(
                `hooks: prepended context to prompt (${hookResult.prependContext.length} chars)`,
              );
            }
          } catch (hookErr) {
            log.warn(`before_agent_start hook failed: ${String(hookErr)}`);
          }
        }

        log.debug(`embedded run prompt start: runId=${params.runId} sessionId=${params.sessionId}`);
        cacheTrace?.recordStage("prompt:before", {
          prompt: effectivePrompt,
          messages: activeSession.messages,
        });

        // Repair orphaned trailing user messages so new prompts don't violate role ordering.
        const leafEntry = sessionManager.getLeafEntry();
        if (leafEntry?.type === "message" && leafEntry.message.role === "user") {
          if (leafEntry.parentId) {
            sessionManager.branch(leafEntry.parentId);
          } else {
            sessionManager.resetLeaf();
          }
          const sessionContext = sessionManager.buildSessionContext();
          activeSession.agent.replaceMessages(sessionContext.messages);
          log.warn(
            `Removed orphaned user message to prevent consecutive user turns. ` +
            `runId=${params.runId} sessionId=${params.sessionId}`,
          );
        }

        // Self-Correction Loop for LLM02 (CoT)
        // We allow 1 retry if the model fails to follow the CoT protocol.
        let cotRetryCount = 0; // Initialize loop variable
        const MAX_COT_RETRIES = 1;
        let promptSuccess = false;

        while (!promptSuccess) {
          try {
            // Detect and load images referenced in the prompt for vision-capable models.
            // This eliminates the need for an explicit "view" tool call by injecting
            // images directly into the prompt when the model supports it.
            // Also scans conversation history to enable follow-up questions about earlier images.
            // Note: On retries, we use the potentially modified 'effectivePrompt'.
            const imageResult = await detectAndLoadPromptImages({
              prompt: effectivePrompt,
              workspaceDir: effectiveWorkspace,
              model: params.model,
              existingImages: params.images,
              historyMessages: activeSession.messages,
              maxBytes: MAX_IMAGE_BYTES,
              // Enforce sandbox path restrictions when sandbox is enabled
              sandboxRoot: sandbox?.enabled ? sandbox.workspaceDir : undefined,
            });

            // Inject history images into their original message positions.
            // This ensures the model sees images in context (e.g., "compare to the first image").
            const didMutate = injectHistoryImagesIntoMessages(
              activeSession.messages,
              imageResult.historyImagesByIndex,
            );
            if (didMutate) {
              // Persist message mutations.
              activeSession.agent.replaceMessages(activeSession.messages);
            }

            if (cotRetryCount === 0) {
              cacheTrace?.recordStage("prompt:images", {
                prompt: effectivePrompt,
                messages: activeSession.messages,
                note: `images: prompt=${imageResult.images.length} history=${imageResult.historyImagesByIndex.size}`,
              });

              const shouldTrackCacheTtl =
                params.config?.agents?.defaults?.contextPruning?.mode === "cache-ttl" &&
                isCacheTtlEligibleProvider(params.provider, params.modelId);
              if (shouldTrackCacheTtl) {
                appendCacheTtlTimestamp(sessionManager, {
                  timestamp: Date.now(),
                  provider: params.provider,
                  modelId: params.modelId,
                });
              }
            }

            // Only pass images option if there are actually images to pass
            if (imageResult.images.length > 0) {
              await abortable(
                activeSession.prompt(effectivePrompt, { images: imageResult.images }),
              );
            } else {
              await abortable(activeSession.prompt(effectivePrompt));
            }
          } catch (err) {
            promptError = err;
          } finally {
            log.debug(
              `embedded run prompt end: runId=${params.runId} sessionId=${params.sessionId} durationMs=${Date.now() - promptStartedAt}`,
            );
          }

          try {
            await waitForCompactionRetry();
          } catch (err) {
            if (isAbortError(err)) {
              if (!promptError) promptError = err;
            } else {
              throw err;
            }
          }

          // LLM06 & LLM02: Output Security Guards
          if (!promptError) {
            const fullResponse = assistantTexts.join(" ");

            // LLM06: PII Firewall (Sensitive Disclosure)
            const pii = SecurityGuard.scanForPII(fullResponse);
            if (pii) {
              log.warn(`Security Firewall: PII detected in output. Redacting.`);
              // Aggressively clear content to prevent leakage
              assistantTexts.length = 0;
              assistantTexts.push(`[BLOCKED] Security Policy Violation: ${pii.details}`);
            }

            // LLM02: Hallucination / CoT Check
            // Enforce CoT if reasoning is enabled (on/stream)
            const checkCoT = params.reasoningLevel === "on" || params.reasoningLevel === "stream";
            const cot = SecurityGuard.validateCoT(fullResponse, checkCoT);

            if (cot) {
              // Logic for Self-Correction (Retry)
              const hasSideEffects = toolMetas.length > 0 || didSendViaMessagingTool();

              if (cotRetryCount < MAX_COT_RETRIES && !hasSideEffects) {
                log.warn(
                  `LLM02: CoT Violation detected. Initiating Self-Correction (Attempt ${cotRetryCount + 1}/${MAX_COT_RETRIES})...`,
                );

                // Rollback Session Message History
                // Remove the last 2 messages: The User Prompt we just added + The Assistant Response
                if (activeSession.messages.length >= 2) {
                  const rolledBackMessages = activeSession.messages.slice(0, -2);
                  activeSession.agent.replaceMessages(rolledBackMessages); // Reset/Rollback History

                  // Clear captured outputs for the next attempt
                  assistantTexts.length = 0;
                  // toolMetas is already checked to be empty

                  // Inject Instruction for the retry
                  effectivePrompt = `${params.prompt}\n\n[SYSTEM SECURITY NOTICE]: Your previous response was rejected because it lacked the required Chain of Thought. You MUST start your response with a <think>...</think> block, followed by your actual response in <final>...</final>. This is mandatory.`;

                  cotRetryCount++;
                  promptError = null; // Clear error state to allow retry
                  continue; // RESTART LOOP
                } else {
                  log.warn(
                    "LLM02: Unable to rollback session for retry. Message history too short.",
                  );
                }
              }

              // If we are here, we either maxed out retries or couldn't retry.
              // Log the violation (Audit Mode for final failure)
              log.warn(`CoT Policy Violation: ${cot.details}`);
            }

            // LLM09: Citation Check (Overreliance)
            const citations = SecurityGuard.validateCitations(
              fullResponse,
              contextFiles.length > 0,
            );
            if (citations) {
              log.warn(`Citation Policy Violation: ${citations.details}`);
            }
          }

          promptSuccess = true; // Loop exit
        }

        messagesSnapshot = activeSession.messages.slice();
        sessionIdUsed = activeSession.sessionId;
        cacheTrace?.recordStage("session:after", {
          messages: messagesSnapshot,
          note: promptError ? "prompt error" : undefined,
        });
        anthropicPayloadLogger?.recordUsage(messagesSnapshot, promptError);

        // Run agent_end hooks to allow plugins to analyze the conversation
        // This is fire-and-forget, so we don't await
        if (hookRunner?.hasHooks("agent_end")) {
          hookRunner
            .runAgentEnd(
              {
                messages: messagesSnapshot,
                success: !aborted && !promptError,
                error: promptError ? describeUnknownError(promptError) : undefined,
                durationMs: Date.now() - promptStartedAt,
              },
              {
                agentId: params.sessionKey?.split(":")[0] ?? "main",
                sessionKey: params.sessionKey,
                workspaceDir: params.workspaceDir,
                messageProvider: params.messageProvider ?? undefined,
              },
            )
            .catch((err) => {
              log.warn(`agent_end hook failed: ${err}`);
            });
        }
      } finally {
        clearTimeout(abortTimer);
        if (abortWarnTimer) clearTimeout(abortWarnTimer);
        unsubscribe();
        clearActiveEmbeddedRun(params.sessionId, queueHandle);
        params.abortSignal?.removeEventListener?.("abort", onAbort);
      }

      const lastAssistant = messagesSnapshot
        .slice()
        .reverse()
        .find((m) => (m as AgentMessage)?.role === "assistant") as AssistantMessage | undefined;

      const toolMetasNormalized = toolMetas
        .filter(
          (entry): entry is { toolName: string; meta?: string } =>
            typeof entry.toolName === "string" && entry.toolName.trim().length > 0,
        )
        .map((entry) => ({ toolName: entry.toolName, meta: entry.meta }));

      return {
        aborted,
        timedOut,
        promptError,
        sessionIdUsed,
        systemPromptReport,
        messagesSnapshot,
        assistantTexts,
        toolMetas: toolMetasNormalized,
        lastAssistant,
        lastToolError: getLastToolError?.(),
        didSendViaMessagingTool: didSendViaMessagingTool(),
        messagingToolSentTexts: getMessagingToolSentTexts(),
        messagingToolSentTargets: getMessagingToolSentTargets(),
        cloudCodeAssistFormatError: Boolean(
          lastAssistant?.errorMessage && isCloudCodeAssistFormatError(lastAssistant.errorMessage),
        ),
        // Client tool call detected (OpenResponses hosted tools)
        clientToolCall: clientToolCallDetected ?? undefined,
      };
    } finally {
      // Always tear down the session (and release the lock) before we leave this attempt.
      sessionManager?.flushPendingToolResults?.();
      session?.dispose();

      if (activeSessionFile !== params.sessionFile || isEncryptedConfig) {
        if (encryptionToken) {
          await AuditCrypt.finalizeSessionFile(
            activeSessionFile,
            params.sessionFile,
            encryptionToken,
            isEncryptedConfig,
          );
        }
      }

      await sessionLock.release();
    }
  } finally {
    restoreSkillEnv?.();
    process.chdir(prevCwd);
  }
}
