import { resolveAckReaction } from "../../../agents/identity.js";
import { hasControlCommand } from "../../../auto-reply/command-detection.js";
import { shouldHandleTextCommands } from "../../../auto-reply/commands-registry.js";
import {
  formatInboundEnvelope,
  formatThreadStarterEnvelope,
  resolveEnvelopeFormatOptions,
} from "../../../auto-reply/envelope.js";
import {
  buildPendingHistoryContextFromMap,
  recordPendingHistoryEntryIfEnabled,
} from "../../../auto-reply/reply/history.js";
import { finalizeInboundContext } from "../../../auto-reply/reply/inbound-context.js";
import { logVerbose, shouldLogVerbose } from "../../../globals.js";
import { resolveAgentRoute } from "../../../routing/resolve-route.js";
import { resolveThreadSessionKeys } from "../../../routing/session-key.js";
import {
  shouldAckReaction as shouldAckReactionGate,
  type AckReactionScope,
} from "../../../channels/ack-reactions.js";
import { resolveConversationLabel } from "../../../channels/conversation-label.js";
import { resolveControlCommandGate } from "../../../channels/command-gating.js";
import { logInboundDrop } from "../../../channels/logging.js";
import { recordInboundSession } from "../../../channels/session.js";
import { readSessionUpdatedAt, resolveStorePath } from "../../../config/sessions.js";

import type { ResolvedSlackAccount } from "../../accounts.js";
import { reactSlackMessage } from "../../actions.js";
import type { SlackMessageEvent } from "../../types.js";
import { resolveSlackThreadContext } from "../../threading.js";
import { resolveSlackAllowListMatch, resolveSlackUserAllowed } from "../allow-list.js";
import { resolveSlackEffectiveAllowFrom } from "../auth.js";
import { resolveSlackChannelConfig } from "../channel-config.js";
import { normalizeSlackChannelType, type SlackMonitorContext } from "../context.js";
import { resolveSlackMedia, resolveSlackThreadStarter } from "../media.js";
import type { PreparedSlackMessage } from "./types.js";

import { validateSlackMessageAuth } from "./prepare/auth-gate.js";
import { resolveSlackMessageMentionGate } from "./prepare/mention-gate.js";

export async function prepareSlackMessage(params: {
  ctx: SlackMonitorContext;
  account: ResolvedSlackAccount;
  message: SlackMessageEvent;
  opts: { source: "message" | "app_mention"; wasMentioned?: boolean };
}): Promise<PreparedSlackMessage | null> {
  const { ctx, account, message, opts } = params;
  const cfg = ctx.cfg;

  let channelInfo = await (message.channel_type === "im"
    ? Promise.resolve({})
    : ctx.resolveChannelName(message.channel));
  const channelType = message.channel_type ?? (channelInfo as any).type;
  const resolvedChannelType = normalizeSlackChannelType(channelType, message.channel);
  const isDirectMessage = resolvedChannelType === "im";
  const isRoom = resolvedChannelType === "channel" || resolvedChannelType === "group";
  const isRoomish = isRoom || resolvedChannelType === "mpim";

  const channelConfig = isRoom
    ? resolveSlackChannelConfig({
        channelId: message.channel,
        channelName: (channelInfo as any).name,
        channels: ctx.channelsConfig,
        defaultRequireMention: ctx.defaultRequireMention,
      })
    : null;
  const allowBots =
    channelConfig?.allowBots ??
    account.config?.allowBots ??
    cfg.channels?.slack?.allowBots ??
    false;
  const isBotMessage = Boolean(message.bot_id);
  const senderId = message.user ?? (isBotMessage ? message.bot_id : undefined);
  if (
    !senderId ||
    !ctx.isChannelAllowed({
      channelId: message.channel,
      channelName: (channelInfo as any).name,
      channelType: resolvedChannelType,
    })
  )
    return null;

  const { allowFromLower } = await resolveSlackEffectiveAllowFrom(ctx);
  if (
    !(await validateSlackMessageAuth({
      ctx,
      account,
      message,
      allowFromLower,
      isDirectMessage,
      isBotMessage,
      allowBots,
    }))
  )
    return null;

  const route = resolveAgentRoute({
    cfg,
    channel: "slack",
    accountId: account.accountId,
    teamId: message.team ?? ctx.teamId,
    peer: {
      kind: isDirectMessage ? "dm" : isRoom ? "channel" : "group",
      id: isDirectMessage ? (message.user ?? "") : message.channel,
    },
  });
  const threadContext = resolveSlackThreadContext({ message, replyToMode: ctx.replyToMode });
  const threadTs = threadContext.incomingThreadTs;
  const threadKeys = resolveThreadSessionKeys({
    baseSessionKey: route.sessionKey,
    threadId: threadContext.isThreadReply ? threadTs : undefined,
    parentSessionKey:
      threadContext.isThreadReply && ctx.threadInheritParent ? route.sessionKey : undefined,
  });
  const sessionKey = threadKeys.sessionKey;
  const historyKey =
    threadContext.isThreadReply && ctx.threadHistoryScope === "thread"
      ? sessionKey
      : message.channel;

  const sender = message.user ? await ctx.resolveUserName(message.user) : null;
  const senderName =
    sender?.name ?? message.username?.trim() ?? message.user ?? message.bot_id ?? "unknown";

  const allowTextCommands = shouldHandleTextCommands({ cfg, surface: "slack" });
  const hasControlCommandInMessage = hasControlCommand(message.text ?? "", cfg);
  const ownerAuthorized = resolveSlackAllowListMatch({
    allowList: allowFromLower,
    id: senderId,
    name: senderName,
  }).allowed;
  const channelCommandAuthorized =
    isRoom && Array.isArray(channelConfig?.users) && channelConfig.users.length > 0
      ? resolveSlackUserAllowed({
          allowList: channelConfig?.users,
          userId: senderId,
          userName: senderName,
        })
      : false;

  const commandGate = resolveControlCommandGate({
    useAccessGroups: ctx.useAccessGroups,
    authorizers: [
      { configured: allowFromLower.length > 0, allowed: ownerAuthorized },
      { configured: isRoom && !!channelConfig?.users?.length, allowed: channelCommandAuthorized },
    ],
    allowTextCommands,
    hasControlCommand: hasControlCommandInMessage,
  });
  if (isRoomish && commandGate.shouldBlock) {
    logInboundDrop({
      log: logVerbose,
      channel: "slack",
      reason: "control command (unauthorized)",
      target: senderId,
    });
    return null;
  }

  const shouldRequireMention = isRoom
    ? (channelConfig?.requireMention ?? ctx.defaultRequireMention)
    : false;
  const mention = resolveSlackMessageMentionGate({
    ctx,
    message,
    agentId: route.agentId,
    isDirectMessage,
    isRoom,
    wasMentionedRequested: opts.wasMentioned,
    shouldRequireMention: Boolean(shouldRequireMention),
    allowTextCommands,
    hasControlCommand: hasControlCommandInMessage,
    commandAuthorized: commandGate.commandAuthorized,
  });

  if (isRoom && shouldRequireMention && mention.gate.shouldSkip) {
    const pendingBody =
      (message.text ?? "").trim() ||
      (message.files?.[0]?.name ? `[Slack file: ${message.files[0].name}]` : "");
    recordPendingHistoryEntryIfEnabled({
      historyMap: ctx.channelHistories,
      historyKey,
      limit: ctx.historyLimit,
      entry: pendingBody
        ? {
            sender: senderName,
            body: pendingBody,
            timestamp: message.ts ? Math.round(Number(message.ts) * 1000) : undefined,
            messageId: message.ts,
          }
        : null,
    });
    return null;
  }

  const media = await resolveSlackMedia({
    files: message.files,
    token: ctx.botToken,
    maxBytes: ctx.mediaMaxBytes,
  });
  const rawBody = (message.text ?? "").trim() || media?.placeholder || "";
  if (!rawBody) return null;

  const ackReaction = resolveAckReaction(cfg, route.agentId);
  const shouldAck =
    ackReaction &&
    shouldAckReactionGate({
      scope: ctx.ackReactionScope as AckReactionScope,
      isDirect: isDirectMessage,
      isGroup: isRoomish,
      isMentionableGroup: isRoom,
      requireMention: Boolean(shouldRequireMention),
      canDetectMention: mention.canDetectMention,
      effectiveWasMentioned: mention.gate.effectiveWasMentioned,
      shouldBypassMention: mention.gate.shouldBypassMention,
    });
  const ackReactionPromise =
    shouldAck && message.ts
      ? reactSlackMessage(message.channel, message.ts, ackReaction, {
          token: ctx.botToken,
          client: ctx.app.client,
        }).then(
          () => true,
          (err) => {
            logVerbose(`slack react failed: ${err}`);
            return false;
          },
        )
      : null;

  const roomLabel = (channelInfo as any).name
    ? `#${(channelInfo as any).name}`
    : `#${message.channel}`;
  const envelopeFrom =
    resolveConversationLabel({
      ChatType: isDirectMessage ? "direct" : "channel",
      SenderName: senderName,
      GroupSubject: isRoomish ? roomLabel : undefined,
      From: isDirectMessage
        ? `slack:${message.user}`
        : isRoom
          ? `slack:channel:${message.channel}`
          : `slack:group:${message.channel}`,
    }) ?? (isDirectMessage ? senderName : roomLabel);
  const envelopeOptions = resolveEnvelopeFormatOptions(cfg);
  const storePath = resolveStorePath(cfg.session?.store, { agentId: route.agentId });
  const body = formatInboundEnvelope({
    channel: "Slack",
    from: envelopeFrom,
    timestamp: message.ts ? Math.round(Number(message.ts) * 1000) : undefined,
    body: `${rawBody}\n[slack id: ${message.ts} channel: ${message.channel}]`,
    chatType: isDirectMessage ? "direct" : "channel",
    sender: { name: senderName, id: senderId },
    previousTimestamp: readSessionUpdatedAt({ storePath, sessionKey: route.sessionKey }),
    envelope: envelopeOptions,
  });

  let combinedBody = body;
  if (isRoomish && ctx.historyLimit > 0)
    combinedBody = buildPendingHistoryContextFromMap({
      historyMap: ctx.channelHistories,
      historyKey,
      limit: ctx.historyLimit,
      currentMessage: combinedBody,
      formatEntry: (e) =>
        formatInboundEnvelope({
          channel: "Slack",
          from: roomLabel,
          timestamp: e.timestamp,
          body: `${e.body}${e.messageId ? ` [id:${e.messageId} channel:${message.channel}]` : ""}`,
          chatType: "channel",
          senderLabel: e.sender,
          envelope: envelopeOptions,
        }),
    });

  let threadStarterBody: string | undefined;
  let threadLabel: string | undefined;
  let effectiveMedia = media;
  if (threadContext.isThreadReply && threadTs) {
    const starter = await resolveSlackThreadStarter({
      channelId: message.channel,
      threadTs,
      client: ctx.app.client,
    });
    if (starter?.text) {
      threadStarterBody = formatThreadStarterEnvelope({
        channel: "Slack",
        author:
          (starter.userId ? await ctx.resolveUserName(starter.userId) : null)?.name || "Unknown",
        timestamp: starter.ts ? Math.round(Number(starter.ts) * 1000) : undefined,
        body: `${starter.text}\n[id: ${starter.ts || threadTs} channel: ${message.channel}]`,
        envelope: envelopeOptions,
      });
      threadLabel = `Slack thread ${roomLabel}: ${starter.text.replace(/\s+/g, " ").slice(0, 80)}`;
      if (!media && starter.files?.length)
        effectiveMedia = await resolveSlackMedia({
          files: starter.files,
          token: ctx.botToken,
          maxBytes: ctx.mediaMaxBytes,
        });
    } else threadLabel = `Slack thread ${roomLabel}`;
  }

  const ctxPayload = finalizeInboundContext({
    Body: combinedBody,
    RawBody: rawBody,
    CommandBody: rawBody,
    From: isDirectMessage
      ? `slack:${message.user}`
      : isRoom
        ? `slack:channel:${message.channel}`
        : `slack:group:${message.channel}`,
    To: isDirectMessage ? `user:${message.user}` : `channel:${message.channel}`,
    SessionKey: sessionKey,
    AccountId: route.accountId,
    ChatType: isDirectMessage ? "direct" : "channel",
    ConversationLabel: envelopeFrom,
    GroupSubject: isRoomish ? roomLabel : undefined,
    GroupSystemPrompt: [
      (channelInfo as any).topic,
      (channelInfo as any).purpose,
      channelConfig?.systemPrompt,
    ]
      .filter(Boolean)
      .join("\n\n"),
    SenderName: senderName,
    SenderId: senderId,
    Provider: "slack" as const,
    Surface: "slack" as const,
    MessageSid: message.ts as string,
    ReplyToId: threadContext.replyToId,
    MessageThreadId: threadContext.messageThreadId,
    ParentSessionKey: threadKeys.parentSessionKey,
    ThreadStarterBody: threadStarterBody,
    ThreadLabel: threadLabel,
    Timestamp: message.ts ? Math.round(Number(message.ts) * 1000) : undefined,
    WasMentioned: isRoomish ? mention.gate.effectiveWasMentioned : undefined,
    MediaPath: effectiveMedia?.path,
    MediaType: effectiveMedia?.contentType,
    MediaUrl: effectiveMedia?.path,
    CommandAuthorized: commandGate.commandAuthorized,
    OriginatingChannel: "slack" as const,
    OriginatingTo: isDirectMessage ? `user:${message.user}` : `channel:${message.channel}`,
  });

  await recordInboundSession({
    storePath,
    sessionKey,
    ctx: ctxPayload,
    updateLastRoute: isDirectMessage
      ? {
          sessionKey: route.mainSessionKey,
          channel: "slack",
          to: `user:${message.user}`,
          accountId: route.accountId,
        }
      : undefined,
    onRecordError: (err) =>
      ctx.logger.warn(
        { error: String(err), storePath, sessionKey },
        "failed updating session info",
      ),
  });

  if (shouldLogVerbose())
    logVerbose(`slack inbound: channel=${message.channel} preview="${rawBody.slice(0, 50)}..."`);
  return {
    ctx,
    account,
    message,
    route,
    channelConfig,
    replyTarget: ctxPayload.To ?? "unknown",
    ctxPayload,
    isDirectMessage,
    isRoomish,
    historyKey,
    preview: rawBody.slice(0, 160),
    ackReactionMessageTs: message.ts,
    ackReactionValue: ackReaction ?? "",
    ackReactionPromise,
  };
}
