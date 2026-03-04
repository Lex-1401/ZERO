
import os from "node:os";
import { getMachineDisplayName } from "../../../../infra/machine-name.js";
import { normalizeMessageChannel } from "../../../../utils/message-channel.js";
import { resolveChannelCapabilities } from "../../../../config/channel-capabilities.js";
import { resolveTelegramInlineButtonsScope } from "../../../../telegram/inline-buttons.js";
import { resolveTelegramReactionLevel } from "../../../../telegram/reaction-level.js";
import { resolveSignalReactionLevel } from "../../../../signal/reaction-level.js";
import { listChannelSupportedActions, resolveChannelMessageToolHints } from "../../../channel-tools.js";
import { resolveDefaultModelForAgent } from "../../../model-selection.js";
import { buildSystemPromptParams } from "../../../system-prompt-params.js";
import { isSubagentSessionKey } from "../../../../routing/session-key.js";
import { buildEmbeddedSystemPrompt } from "../../system-prompt.js";
import { buildModelAliasLines } from "../../model.js";
import { resolveHeartbeatPrompt } from "../../../../auto-reply/heartbeat.js";
import { isReasoningTagProvider } from "../../../../utils/provider-utils.js";
import { type EmbeddedRunAttemptParams } from "../types.js";
import { type EmbeddedSandboxInfo } from "../../types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { type RoleDefinition } from "../../../../roles/types.js";

export async function buildAttemptSystemPrompt(params: {
    params: EmbeddedRunAttemptParams;
    sessionAgentId: string;
    defaultAgentId: string;
    effectiveWorkspace: string;
    sandboxInfo?: EmbeddedSandboxInfo;
    tools: any[];
    contextFiles: any[];
    skillsPrompt: string;
    workspaceNotes?: string[];
    docsPath?: string;
    ttsHint?: string;
    memoryContextString: string;
    speculativeContext: string;
    roleDef: RoleDefinition | null;
}) {
    const { params: p, sessionAgentId, defaultAgentId, effectiveWorkspace, sandboxInfo, tools, contextFiles, skillsPrompt, workspaceNotes, docsPath, ttsHint, memoryContextString, speculativeContext, roleDef } = params;

    const machineName = await getMachineDisplayName();
    const runtimeChannel = normalizeMessageChannel(p.messageChannel ?? p.messageProvider);
    let runtimeCapabilities = runtimeChannel
        ? (resolveChannelCapabilities({
            cfg: p.config,
            channel: runtimeChannel,
            accountId: p.agentAccountId,
        }) ?? [])
        : undefined;

    if (runtimeChannel === "telegram" && p.config) {
        const inlineButtonsScope = resolveTelegramInlineButtonsScope({
            cfg: p.config,
            accountId: p.agentAccountId ?? undefined,
        });
        if (inlineButtonsScope !== "off") {
            if (!runtimeCapabilities) runtimeCapabilities = [];
            if (!runtimeCapabilities.some((cap) => String(cap).trim().toLowerCase() === "inlinebuttons")) {
                runtimeCapabilities.push("inlineButtons");
            }
        }
    }

    const reactionGuidance = runtimeChannel && p.config ? (() => {
        if (runtimeChannel === "telegram") {
            const resolved = resolveTelegramReactionLevel({ cfg: p.config, accountId: p.agentAccountId ?? undefined });
            return resolved.agentReactionGuidance ? { level: resolved.agentReactionGuidance, channel: "Telegram" } : undefined;
        }
        if (runtimeChannel === "signal") {
            const resolved = resolveSignalReactionLevel({ cfg: p.config, accountId: p.agentAccountId ?? undefined });
            return resolved.agentReactionGuidance ? { level: resolved.agentReactionGuidance, channel: "Signal" } : undefined;
        }
        return undefined;
    })() : undefined;

    const channelActions = runtimeChannel ? listChannelSupportedActions({ cfg: p.config, channel: runtimeChannel }) : undefined;
    const messageToolHints = runtimeChannel ? resolveChannelMessageToolHints({ cfg: p.config, channel: runtimeChannel, accountId: p.agentAccountId }) : undefined;

    const defaultModelRef = resolveDefaultModelForAgent({ cfg: p.config ?? {}, agentId: sessionAgentId });
    const defaultModelLabel = `${defaultModelRef.provider}/${defaultModelRef.model}`;

    const { runtimeInfo, userTimezone, userTime, userTimeFormat } = buildSystemPromptParams({
        config: p.config,
        agentId: sessionAgentId,
        workspaceDir: effectiveWorkspace,
        cwd: process.cwd(),
        runtime: {
            host: machineName,
            os: `${os.type()} ${os.release()}`,
            arch: os.arch(),
            node: process.version,
            model: `${p.provider}/${p.modelId}`,
            defaultModel: defaultModelLabel,
            channel: runtimeChannel,
            capabilities: runtimeCapabilities,
            channelActions,
        },
    });

    const isDefaultAgent = sessionAgentId === defaultAgentId;
    const promptMode = isSubagentSessionKey(p.sessionKey) ? "minimal" : "full";
    const reasoningTagHint = isReasoningTagProvider(p.provider);

    let memoryPreferences: string | undefined;
    try {
        memoryPreferences = await fs.readFile(path.join(effectiveWorkspace, "MEMORY.md"), "utf-8");
    } catch {
        // file doesn't exist or not readable, gracefully ignore
    }

    return buildEmbeddedSystemPrompt({
        workspaceDir: effectiveWorkspace,
        defaultThinkLevel: p.thinkLevel,
        reasoningLevel: p.reasoningLevel ?? "off",
        extraSystemPrompt: p.extraSystemPrompt
            ? `${p.extraSystemPrompt}\n${memoryContextString}\n${speculativeContext}`
            : `${memoryContextString}\n${speculativeContext}`,
        ownerNumbers: p.ownerNumbers,
        reasoningTagHint,
        heartbeatPrompt: isDefaultAgent
            ? resolveHeartbeatPrompt(p.config?.agents?.defaults?.heartbeat?.prompt)
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
        modelAliasLines: buildModelAliasLines(p.config),
        userTimezone,
        userTime,
        userTimeFormat,
        contextFiles,
        role: roleDef as any,
        memoryPreferences,
    });
}
