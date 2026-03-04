
import fs from "node:fs/promises";
import { SessionManager, SettingsManager, createAgentSession } from "@mariozechner/pi-coding-agent";
import { guardSessionManager } from "../../../session-tool-result-guard-wrapper.js";
import { resolveTranscriptPolicy } from "../../../transcript-policy.js";
import { prewarmSessionFile, trackSessionManagerAccess } from "../../session-manager-cache.js";
import { prepareSessionManagerForRun } from "../../session-manager-init.js";
import { ensurePiCompactionReserveTokens, resolveCompactionReserveTokensFloor } from "../../../pi-settings.js";
import { buildEmbeddedExtensionPaths } from "../../extensions.js";
import { splitSdkTools } from "../../tool-split.js";
import { toClientToolDefinitions } from "../../../pi-tool-definition-adapter.js";
import { mapThinkingLevel } from "../../utils.js";
import { applyExtraParamsToAgent } from "../../extra-params.js";
import { type EmbeddedRunAttemptParams } from "../types.js";

export async function prepareAndCreateSession(params: {
    params: EmbeddedRunAttemptParams;
    activeSessionFile: string;
    sessionAgentId: string;
    effectiveWorkspace: string;
    agentDir: string;
    systemPrompt: string;
    tools: any[];
}) {
    const { params: p, activeSessionFile, sessionAgentId, effectiveWorkspace, agentDir, systemPrompt, tools } = params;

    const hadSessionFile = await fs.stat(p.sessionFile).then(() => true).catch(() => false);
    const transcriptPolicy = resolveTranscriptPolicy({
        modelApi: p.model?.api,
        provider: p.provider,
        modelId: p.modelId,
    });

    await prewarmSessionFile(activeSessionFile);

    const sessionManager = guardSessionManager(SessionManager.open(activeSessionFile), {
        agentId: sessionAgentId,
        sessionKey: p.sessionKey,
        allowSyntheticToolResults: transcriptPolicy.allowSyntheticToolResults,
    });
    trackSessionManagerAccess(activeSessionFile);

    await prepareSessionManagerForRun({
        sessionManager,
        sessionFile: activeSessionFile,
        hadSessionFile,
        sessionId: p.sessionId,
        cwd: effectiveWorkspace,
    });

    const settingsManager = SettingsManager.create(effectiveWorkspace, agentDir);
    ensurePiCompactionReserveTokens({
        settingsManager,
        minReserveTokens: resolveCompactionReserveTokensFloor(p.config),
    });

    const additionalExtensionPaths = buildEmbeddedExtensionPaths({
        cfg: p.config,
        sessionManager,
        provider: p.provider,
        modelId: p.modelId,
        model: p.model,
    });

    const { builtInTools, customTools } = splitSdkTools({
        tools,
        sandboxEnabled: !!p.config, // Assuming config implies potential sandbox context
    });

    let clientToolCallDetected: { name: string; params: Record<string, unknown> } | null = null;
    const clientToolDefs = p.clientTools
        ? toClientToolDefinitions(p.clientTools, (toolName, toolParams) => {
            clientToolCallDetected = { name: toolName, params: toolParams };
        })
        : [];

    const allCustomTools = [...customTools, ...clientToolDefs];

    const { session } = await createAgentSession({
        cwd: effectiveWorkspace,
        agentDir,
        authStorage: p.authStorage,
        modelRegistry: p.modelRegistry,
        model: p.model,
        thinkingLevel: mapThinkingLevel(p.thinkLevel),
        systemPrompt,
        tools: builtInTools,
        customTools: allCustomTools,
        sessionManager,
        settingsManager,
        skills: [],
        contextFiles: [],
        additionalExtensionPaths,
    });

    if (!session) {
        throw new Error("Embedded agent session missing");
    }

    applyExtraParamsToAgent(
        session.agent,
        p.config ?? {},
        p.provider,
        p.modelId,
        p.streamParams,
    );

    return { session, sessionManager, transcriptPolicy, clientToolCallDetected };
}
