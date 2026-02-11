import {
  readNumberParam,
  readStringArrayParam,
  readStringParam,
} from "../../agents/tools/common.js";
import { resolveSessionAgentId } from "../../agents/agent-scope.js";
import { parseReplyDirectives } from "../../auto-reply/reply/reply-directives.js";
import { dispatchChannelMessageAction } from "../../channels/plugins/message-actions.js";
import type { ChannelId, ChannelMessageActionName } from "../../channels/plugins/types.js";
import {
  isDeliverableMessageChannel,
  normalizeMessageChannel,
} from "../../utils/message-channel.js";
import { listConfiguredMessageChannels } from "./channel-selection.js";
import { applyTargetToParams } from "./channel-target.js";
import { ensureOutboundSessionEntry, resolveOutboundSessionRoute } from "./outbound-session.js";
import { enforceCrossContextPolicy } from "./outbound-policy.js";
import { executePollAction, executeSendAction } from "./outbound-send-service.js";
import { actionHasTarget, actionRequiresTarget } from "./message-action-spec.js";
import { resolveChannelTarget } from "./target-resolver.js";
import {
  extractToolPayload,
  hydrateSendAttachmentParams,
  hydrateSetGroupIconParams,
  maybeApplyCrossContextMarker,
  normalizeSandboxMediaList,
  parseButtonsParam,
  parseCardParam,
  readBooleanParam,
  resolveActionTarget,
  resolveChannel,
  resolveGateway,
  resolveSlackAutoThreadId,
  throwIfAborted,
} from "./message-action-runner.helpers.js";
import type {
  MessageActionRunResult,
  ResolvedActionContext,
  RunMessageActionParams,
} from "./message-action-runner.types.js";
import type { AgentToolResult } from "@mariozechner/pi-agent-core";

async function handleBroadcastAction(
  input: RunMessageActionParams,
  params: Record<string, unknown>,
): Promise<MessageActionRunResult> {
  throwIfAborted(input.abortSignal);
  const broadcastEnabled = input.cfg.tools?.message?.broadcast?.enabled !== false;
  if (!broadcastEnabled) {
    throw new Error("Broadcast is disabled. Set tools.message.broadcast.enabled to true.");
  }
  const rawTargets = readStringArrayParam(params, "targets", { required: true }) ?? [];
  if (rawTargets.length === 0) {
    throw new Error("Broadcast requires at least one target in --targets.");
  }
  const channelHint = readStringParam(params, "channel");
  const configured = await listConfiguredMessageChannels(input.cfg);
  if (configured.length === 0) {
    throw new Error("Broadcast requires at least one configured channel.");
  }
  const targetChannels =
    channelHint && channelHint.trim().toLowerCase() !== "all"
      ? [await resolveChannel(input.cfg, { channel: channelHint })]
      : configured;
  const results: Array<{
    channel: ChannelId;
    to: string;
    ok: boolean;
    error?: string;
    result?: unknown;
  }> = [];
  const isAbortError = (err: unknown): boolean => err instanceof Error && err.name === "AbortError";
  for (const targetChannel of targetChannels) {
    throwIfAborted(input.abortSignal);
    for (const target of rawTargets) {
      throwIfAborted(input.abortSignal);
      try {
        const resolved = await resolveChannelTarget({
          cfg: input.cfg,
          channel: targetChannel,
          input: target,
        });
        if (!resolved.ok) throw resolved.error;
        const sendResult = await runMessageAction({
          ...input,
          action: "send",
          params: {
            ...params,
            channel: targetChannel,
            target: resolved.target.to,
          },
        });
        results.push({
          channel: targetChannel,
          to: resolved.target.to,
          ok: true,
          result: sendResult.kind === "send" ? sendResult.sendResult : undefined,
        });
      } catch (err) {
        if (isAbortError(err)) throw err;
        results.push({
          channel: targetChannel,
          to: target,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  return {
    kind: "broadcast",
    channel: (targetChannels[0] ?? "discord") as ChannelId,
    action: "broadcast",
    handledBy: input.dryRun ? "dry-run" : "core",
    payload: { results },
    dryRun: Boolean(input.dryRun),
  } as MessageActionRunResult;
}

async function handleSendAction(ctx: ResolvedActionContext): Promise<MessageActionRunResult> {
  const {
    cfg,
    params,
    channel,
    accountId,
    dryRun,
    gateway,
    input,
    agentId,
    resolvedTarget,
    abortSignal,
  } = ctx;
  throwIfAborted(abortSignal);
  const action: ChannelMessageActionName = "send";
  const to = readStringParam(params, "to", { required: true });
  const mediaHint =
    readStringParam(params, "media", { trim: false }) ??
    readStringParam(params, "path", { trim: false }) ??
    readStringParam(params, "filePath", { trim: false });
  const hasCard = params.card != null && typeof params.card === "object";
  let message =
    readStringParam(params, "message", {
      required: !mediaHint && !hasCard,
      allowEmpty: true,
    }) ?? "";

  const parsed = parseReplyDirectives(message);
  const mergedMediaUrls: string[] = [];
  const seenMedia = new Set<string>();
  const pushMedia = (value?: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    if (seenMedia.has(trimmed)) return;
    seenMedia.add(trimmed);
    mergedMediaUrls.push(trimmed);
  };
  pushMedia(mediaHint);
  for (const url of parsed.mediaUrls ?? []) {
    pushMedia(url);
  }
  pushMedia(parsed.mediaUrl);

  const normalizedMediaUrls = await normalizeSandboxMediaList({
    values: mergedMediaUrls,
    sandboxRoot: input.sandboxRoot,
  });
  mergedMediaUrls.length = 0;
  mergedMediaUrls.push(...normalizedMediaUrls);

  message = parsed.text;
  params.message = message;
  if (!params.replyTo && parsed.replyToId) params.replyTo = parsed.replyToId;
  if (!params.media) {
    params.media = mergedMediaUrls[0] || undefined;
  }

  message = await maybeApplyCrossContextMarker({
    cfg,
    channel,
    action,
    target: to,
    toolContext: input.toolContext,
    accountId,
    args: params,
    message,
    preferEmbeds: true,
  });

  const mediaUrl = readStringParam(params, "media", { trim: false });
  const gifPlayback = readBooleanParam(params, "gifPlayback") ?? false;
  const bestEffort = readBooleanParam(params, "bestEffort");

  const replyToId = readStringParam(params, "replyTo");
  const threadId = readStringParam(params, "threadId");
  const slackAutoThreadId =
    channel === "slack" && !replyToId && !threadId
      ? resolveSlackAutoThreadId({ to, toolContext: input.toolContext })
      : undefined;
  const outboundRoute =
    agentId && !dryRun
      ? await resolveOutboundSessionRoute({
          cfg,
          channel,
          agentId,
          accountId,
          target: to,
          resolvedTarget,
          replyToId,
          threadId: threadId ?? slackAutoThreadId,
        })
      : null;
  if (outboundRoute && agentId && !dryRun) {
    await ensureOutboundSessionEntry({
      cfg,
      agentId,
      channel,
      accountId,
      route: outboundRoute,
    });
  }
  const mirrorMediaUrls =
    mergedMediaUrls.length > 0 ? mergedMediaUrls : mediaUrl ? [mediaUrl] : undefined;
  throwIfAborted(abortSignal);
  const send = await executeSendAction({
    ctx: {
      cfg,
      channel,
      params,
      accountId: accountId ?? undefined,
      gateway,
      toolContext: input.toolContext,
      deps: input.deps,
      dryRun,
      mirror:
        outboundRoute && !dryRun
          ? {
              sessionKey: outboundRoute.sessionKey,
              agentId,
              text: message,
              mediaUrls: mirrorMediaUrls,
            }
          : undefined,
      abortSignal,
    },
    to,
    message,
    mediaUrl: mediaUrl || undefined,
    mediaUrls: mergedMediaUrls.length ? mergedMediaUrls : undefined,
    gifPlayback,
    bestEffort: bestEffort ?? undefined,
  });

  return {
    kind: "send",
    channel,
    action,
    to,
    handledBy: send.handledBy,
    payload: send.payload,
    toolResult: send.toolResult,
    sendResult: send.sendResult,
    dryRun,
  };
}

async function handlePollAction(ctx: ResolvedActionContext): Promise<MessageActionRunResult> {
  const { cfg, params, channel, accountId, dryRun, gateway, input, abortSignal } = ctx;
  throwIfAborted(abortSignal);
  const action: ChannelMessageActionName = "poll";
  const to = readStringParam(params, "to", { required: true });
  const question = readStringParam(params, "pollQuestion", {
    required: true,
  });
  const options = readStringArrayParam(params, "pollOption", { required: true }) ?? [];
  if (options.length < 2) {
    throw new Error("pollOption requires at least two values");
  }
  const allowMultiselect = readBooleanParam(params, "pollMulti") ?? false;
  const base = typeof params.message === "string" ? params.message : "";
  await maybeApplyCrossContextMarker({
    cfg,
    channel,
    action,
    target: to,
    toolContext: input.toolContext,
    accountId,
    args: params,
    message: base,
    preferEmbeds: true,
  });

  const poll = await executePollAction({
    ctx: {
      cfg,
      channel,
      params,
      accountId: accountId ?? undefined,
      gateway,
      toolContext: input.toolContext,
      dryRun,
    },
    to,
    question,
    options,
    maxSelections: allowMultiselect ? Math.max(2, options.length) : 1,
    durationHours: readNumberParam(params, "pollDurationHours", { integer: true }) ?? undefined,
  });

  return {
    kind: "poll",
    channel,
    action,
    to,
    handledBy: poll.handledBy,
    payload: poll.payload,
    toolResult: poll.toolResult,
    pollResult: poll.pollResult,
    dryRun,
  };
}

async function handlePluginAction(ctx: ResolvedActionContext): Promise<MessageActionRunResult> {
  const { cfg, params, channel, accountId, dryRun, gateway, input, abortSignal } = ctx;
  throwIfAborted(abortSignal);
  const action = input.action as Exclude<ChannelMessageActionName, "send" | "poll" | "broadcast">;
  if (dryRun) {
    return {
      kind: "action",
      channel,
      action,
      handledBy: "dry-run",
      payload: { ok: true, dryRun: true, channel, action },
      dryRun: true,
    };
  }

  const handled = await dispatchChannelMessageAction({
    channel,
    action,
    cfg,
    params,
    accountId: accountId ?? undefined,
    gateway,
    toolContext: input.toolContext,
    dryRun,
  });
  if (!handled) {
    throw new Error(`Message action ${action} not supported for channel ${channel}.`);
  }
  return {
    kind: "action",
    channel,
    action,
    handledBy: "plugin",
    payload: extractToolPayload(handled),
    toolResult: handled,
    dryRun,
  };
}

export async function runMessageAction(
  input: RunMessageActionParams,
): Promise<MessageActionRunResult> {
  const cfg = input.cfg;
  const params = { ...input.params };
  const resolvedAgentId =
    input.agentId ??
    (input.sessionKey
      ? resolveSessionAgentId({ sessionKey: input.sessionKey, config: cfg })
      : undefined);
  parseButtonsParam(params);
  parseCardParam(params);

  const action = input.action;
  if (action === "broadcast") {
    return handleBroadcastAction(input, params);
  }

  const explicitTarget = typeof params.target === "string" ? params.target.trim() : "";
  const hasLegacyTarget =
    (typeof params.to === "string" && params.to.trim().length > 0) ||
    (typeof params.channelId === "string" && params.channelId.trim().length > 0);
  if (explicitTarget && hasLegacyTarget) {
    delete params.to;
    delete params.channelId;
  }
  if (
    !explicitTarget &&
    !hasLegacyTarget &&
    actionRequiresTarget(action) &&
    !actionHasTarget(action, params)
  ) {
    const inferredTarget = input.toolContext?.currentChannelId?.trim();
    if (inferredTarget) {
      params.target = inferredTarget;
    }
  }
  if (!explicitTarget && actionRequiresTarget(action) && hasLegacyTarget) {
    const legacyTo = typeof params.to === "string" ? params.to.trim() : "";
    const legacyChannelId = typeof params.channelId === "string" ? params.channelId.trim() : "";
    const legacyTarget = legacyTo || legacyChannelId;
    if (legacyTarget) {
      params.target = legacyTarget;
      delete params.to;
      delete params.channelId;
    }
  }
  const explicitChannel = typeof params.channel === "string" ? params.channel.trim() : "";
  if (!explicitChannel) {
    const inferredChannel = normalizeMessageChannel(input.toolContext?.currentChannelProvider);
    if (inferredChannel && isDeliverableMessageChannel(inferredChannel)) {
      params.channel = inferredChannel;
    }
  }

  applyTargetToParams({ action, args: params });
  if (actionRequiresTarget(action)) {
    if (!actionHasTarget(action, params)) {
      throw new Error(`Action ${action} requires a target.`);
    }
  }

  const channel = await resolveChannel(cfg, params);
  const accountId = readStringParam(params, "accountId") ?? input.defaultAccountId;
  if (accountId) {
    params.accountId = accountId;
  }
  const dryRun = Boolean(input.dryRun ?? readBooleanParam(params, "dryRun"));

  await hydrateSendAttachmentParams({
    cfg,
    channel,
    accountId,
    args: params,
    action,
    dryRun,
  });

  await hydrateSetGroupIconParams({
    cfg,
    channel,
    accountId,
    args: params,
    action,
    dryRun,
  });

  const resolvedTarget = await resolveActionTarget({
    cfg,
    channel,
    action,
    args: params,
    accountId,
  });

  enforceCrossContextPolicy({
    channel,
    action,
    args: params,
    toolContext: input.toolContext,
    cfg,
  });

  const gateway = resolveGateway(input);

  const ctx: ResolvedActionContext = {
    cfg,
    params,
    channel,
    accountId,
    dryRun,
    gateway,
    input,
    agentId: resolvedAgentId,
    resolvedTarget,
    abortSignal: input.abortSignal,
  };

  if (action === "send") {
    return handleSendAction(ctx);
  }

  if (action === "poll") {
    return handlePollAction(ctx);
  }

  return handlePluginAction(ctx);
}

export function getToolResult(
  result: MessageActionRunResult,
): AgentToolResult<unknown> | undefined {
  if (result.kind === "broadcast") return undefined;
  return result.toolResult;
}

export type { MessageActionRunResult, RunMessageActionParams };
