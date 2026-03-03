import type { Bot } from "grammy";
import { resolveAckReaction } from "../agents/identity.js";
import { hasControlCommand } from "../auto-reply/command-detection.js";
import { normalizeCommandBody } from "../auto-reply/commands-registry.js";
import { formatInboundEnvelope, resolveEnvelopeFormatOptions } from "../auto-reply/envelope.js";
import {
  buildPendingHistoryContextFromMap,
  recordPendingHistoryEntryIfEnabled,
  type HistoryEntry,
} from "../auto-reply/reply/history.js";
import { finalizeInboundContext } from "../auto-reply/reply/inbound-context.js";
import { buildMentionRegexes, matchesMentionWithExplicit } from "../auto-reply/reply/mentions.js";
import { formatLocationText, toLocationContext } from "../channels/location.js";
import { recordInboundSession } from "../channels/session.js";
import { readSessionUpdatedAt, resolveStorePath } from "../config/sessions.js";
import type { ZEROConfig } from "../config/config.js";
import type { DmPolicy } from "../config/types.js";
import { logVerbose, shouldLogVerbose } from "../globals.js";
import { recordChannelActivity } from "../infra/channel-activity.js";
import { resolveAgentRoute } from "../routing/resolve-route.js";
import { resolveThreadSessionKeys } from "../routing/session-key.js";
import { shouldAckReaction as shouldAckReactionGate } from "../channels/ack-reactions.js";
import { resolveMentionGatingWithBypass } from "../channels/mention-gating.js";
import { resolveControlCommandGate } from "../channels/command-gating.js";
import { logInboundDrop } from "../channels/logging.js";
import {
  buildSenderLabel,
  buildTelegramGroupFrom,
  buildTelegramGroupPeerId,
  expandTextLinks,
  normalizeForwardedContext,
  describeReplyTarget,
  extractTelegramLocation,
  hasBotMention,
  resolveTelegramForumThreadId,
} from "./bot/helpers.js";
import { firstDefined, isSenderAllowed, normalizeAllowFromWithStore } from "./bot-access.js";
import type { TelegramContext } from "./bot/types.js";

import { evaluateTelegramDmAccess } from "./context/access.js";
import { resolveTelegramMetadata } from "./context/metadata.js";
import { createTelegramActions } from "./context/actions.js";

type TelegramMediaRef = { path: string; contentType?: string };
type TelegramMessageContextOptions = { forceWasMentioned?: boolean; messageIdOverride?: string };
type TelegramLogger = { info: (obj: Record<string, unknown>, msg: string) => void };

type BuildTelegramMessageContextParams = {
  primaryCtx: TelegramContext;
  allMedia: TelegramMediaRef[];
  storeAllowFrom: string[];
  options?: TelegramMessageContextOptions;
  bot: Bot;
  cfg: ZEROConfig;
  account: { accountId: string };
  historyLimit: number;
  groupHistories: Map<string, HistoryEntry[]>;
  dmPolicy: DmPolicy;
  allowFrom?: Array<string | number>;
  groupAllowFrom?: Array<string | number>;
  ackReactionScope: "off" | "group-mentions" | "group-all" | "direct" | "all";
  logger: TelegramLogger;
  resolveGroupActivation: any;
  resolveGroupRequireMention: any;
  resolveTelegramGroupConfig: any;
};

/**
 * Builds a comprehensive message context for the AI agent from a raw Telegram update.
 * Orchesrates access control, mention gating, media resolution, and session management.
 */
export const buildTelegramMessageContext = async ({
  primaryCtx,
  allMedia,
  storeAllowFrom,
  options,
  bot,
  cfg,
  account,
  historyLimit,
  groupHistories,
  dmPolicy,
  allowFrom,
  groupAllowFrom,
  ackReactionScope,
  logger,
  resolveGroupActivation,
  resolveGroupRequireMention,
  resolveTelegramGroupConfig,
}: BuildTelegramMessageContextParams) => {
  const msg = primaryCtx.message;
  recordChannelActivity({
    channel: "telegram",
    accountId: account.accountId,
    direction: "inbound",
  });

  const chatId = msg.chat.id;
  const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
  const messageThreadId = (msg as { message_thread_id?: number }).message_thread_id;
  const isForum = (msg.chat as { is_forum?: boolean }).is_forum === true;
  const resolvedThreadId = resolveTelegramForumThreadId({ isForum, messageThreadId });
  const { groupConfig, topicConfig } = resolveTelegramGroupConfig(chatId, resolvedThreadId);
  const peerId = isGroup ? buildTelegramGroupPeerId(chatId, resolvedThreadId) : String(chatId);

  const route = resolveAgentRoute({
    cfg,
    channel: "telegram",
    accountId: account.accountId,
    peer: { kind: isGroup ? "group" : "dm", id: peerId },
  });

  const baseSessionKey = route.sessionKey;
  const dmThreadId = !isGroup ? resolvedThreadId : undefined;
  const threadKeys =
    dmThreadId != null
      ? resolveThreadSessionKeys({ baseSessionKey, threadId: String(dmThreadId) })
      : null;
  const sessionKey = threadKeys?.sessionKey ?? baseSessionKey;

  const effectiveDmAllow = normalizeAllowFromWithStore({ allowFrom, storeAllowFrom });
  const groupAllowOverride = firstDefined(topicConfig?.allowFrom, groupConfig?.allowFrom);
  const effectiveGroupAllow = normalizeAllowFromWithStore({
    allowFrom: groupAllowOverride ?? groupAllowFrom,
    storeAllowFrom,
  });

  if (isGroup && (groupConfig?.enabled === false || topicConfig?.enabled === false)) {
    logVerbose(`Blocked telegram group/topic ${chatId} (disabled)`);
    return null;
  }

  // Action helpers
  const { sendTyping, sendRecordVoice } = createTelegramActions({ bot, chatId, resolvedThreadId });

  // DM access control
  if (!isGroup) {
    const access = await evaluateTelegramDmAccess({
      chatId,
      msg,
      dmPolicy,
      effectiveDmAllow,
      bot,
      logger,
    });
    if (!access.allowed) return null;
  }

  const botUsername = primaryCtx.me?.username?.toLowerCase();
  const senderId = msg.from?.id ? String(msg.from.id) : "";
  const senderUsername = msg.from?.username ?? "";

  if (isGroup && typeof groupAllowOverride !== "undefined") {
    if (!isSenderAllowed({ allow: effectiveGroupAllow, senderId, senderUsername })) {
      logVerbose(`Blocked telegram group sender ${senderId || "unknown"} (allowFrom override)`);
      return null;
    }
  }

  const allowForCommands = isGroup ? effectiveGroupAllow : effectiveDmAllow;
  const senderAllowedForCommands = isSenderAllowed({
    allow: allowForCommands,
    senderId,
    senderUsername,
  });
  const hasControlCommandInMessage = hasControlCommand(msg.text ?? msg.caption ?? "", cfg, {
    botUsername,
  });

  const commandGate = resolveControlCommandGate({
    useAccessGroups: cfg.commands?.useAccessGroups !== false,
    authorizers: [{ configured: allowForCommands.hasEntries, allowed: senderAllowedForCommands }],
    allowTextCommands: true,
    hasControlCommand: hasControlCommandInMessage,
  });

  if (isGroup && commandGate.shouldBlock) {
    logInboundDrop({
      log: logVerbose,
      channel: "telegram",
      reason: "control command (unauthorized)",
      target: senderId ?? "unknown",
    });
    return null;
  }

  const { senderName, conversationLabel, groupLabel } = resolveTelegramMetadata({
    msg,
    chatId,
    senderId,
    isGroup,
    resolvedThreadId,
  });

  // Body construction
  const locationData = extractTelegramLocation(msg);
  const locationText = locationData ? formatLocationText(locationData) : undefined;
  const rawText = expandTextLinks(
    msg.text ?? msg.caption ?? "",
    msg.entities ?? msg.caption_entities,
  ).trim();
  let rawBody = [rawText, locationText].filter(Boolean).join("\n").trim();
  if (!rawBody) {
    if (msg.photo) rawBody = "<media:image>";
    else if (msg.video) rawBody = "<media:video>";
    else if (msg.audio || msg.voice) rawBody = "<media:audio>";
    else if (msg.document) rawBody = "<media:document>";
  }
  if (!rawBody && allMedia.length === 0) return null;

  let bodyText = rawBody;
  if (!bodyText && allMedia.length > 0)
    bodyText = `<media:image>${allMedia.length > 1 ? ` (${allMedia.length} images)` : ""}`;

  // Mention gating
  const mentionRegexes = buildMentionRegexes(cfg, route.agentId);
  const hasAnyMention = (msg.entities ?? msg.caption_entities ?? []).some(
    (ent) => ent.type === "mention",
  );
  const wasMentioned =
    options?.forceWasMentioned === true ||
    matchesMentionWithExplicit({
      text: msg.text ?? msg.caption ?? "",
      mentionRegexes,
      explicit: {
        hasAnyMention,
        isExplicitlyMentioned: botUsername ? hasBotMention(msg, botUsername) : false,
        canResolveExplicit: Boolean(botUsername),
      },
    });

  const activationOverride = resolveGroupActivation({
    chatId,
    messageThreadId: resolvedThreadId,
    sessionKey,
    agentId: route.agentId,
  });
  const requireMention = firstDefined(
    activationOverride,
    topicConfig?.requireMention,
    groupConfig?.requireMention,
    resolveGroupRequireMention(chatId),
  );
  const implicitMention =
    isGroup && primaryCtx.me?.id != null && msg.reply_to_message?.from?.id === primaryCtx.me.id;

  const mentionGate = resolveMentionGatingWithBypass({
    isGroup,
    requireMention: Boolean(requireMention),
    canDetectMention: Boolean(botUsername) || mentionRegexes.length > 0,
    wasMentioned,
    implicitMention: Boolean(requireMention) && implicitMention,
    hasAnyMention,
    allowTextCommands: true,
    hasControlCommand: hasControlCommandInMessage,
    commandAuthorized: commandGate.commandAuthorized,
  });

  if (isGroup && requireMention && mentionGate.shouldSkip) {
    logger.info({ chatId, reason: "no-mention" }, "skipping group message");
    const historyKey = buildTelegramGroupPeerId(chatId, resolvedThreadId);
    recordPendingHistoryEntryIfEnabled({
      historyMap: groupHistories,
      historyKey,
      limit: historyLimit,
      entry: {
        sender: buildSenderLabel(msg, senderId || chatId),
        body: rawBody,
        timestamp: msg.date ? msg.date * 1000 : undefined,
        messageId: String(msg.message_id),
      },
    });
    return null;
  }

  // ACK reactions
  const ackReaction = resolveAckReaction(cfg, route.agentId);
  const shouldAckReaction =
    ackReaction &&
    shouldAckReactionGate({
      scope: ackReactionScope,
      isDirect: !isGroup,
      isGroup,
      isMentionableGroup: isGroup,
      requireMention: Boolean(requireMention),
      canDetectMention: Boolean(botUsername) || mentionRegexes.length > 0,
      effectiveWasMentioned: mentionGate.effectiveWasMentioned,
      shouldBypassMention: mentionGate.shouldBypassMention,
    });

  const reactionApi = (bot.api as any).setMessageReaction?.bind(bot.api);
  const ackReactionPromise =
    shouldAckReaction && reactionApi
      ? reactionApi(chatId, msg.message_id, [{ type: "emoji", emoji: ackReaction }]).catch(
          (err: any) => logVerbose(`telegram react failed: ${err}`),
        )
      : null;

  // Final context assembly
  const replyTarget = describeReplyTarget(msg);
  const forwardOrigin = normalizeForwardedContext(msg);
  const storePath = resolveStorePath(cfg.session?.store, { agentId: route.agentId });
  const previousTimestamp = readSessionUpdatedAt({ storePath, sessionKey });
  const envelopeOptions = resolveEnvelopeFormatOptions(cfg);

  const body = formatInboundEnvelope({
    channel: "Telegram",
    from: conversationLabel,
    timestamp: msg.date ? msg.date * 1000 : undefined,
    body: `${forwardOrigin ? `[Forwarded from ${forwardOrigin.from}]\n` : ""}${bodyText}${replyTarget ? `\n\n[Replying to ${replyTarget.sender}${replyTarget.id ? ` id:${replyTarget.id}` : ""}]\n${replyTarget.body}\n[/Replying]` : ""}`,
    chatType: isGroup ? "group" : "direct",
    sender: { name: senderName, username: senderUsername || undefined, id: senderId || undefined },
    previousTimestamp,
    envelope: envelopeOptions,
  });

  let combinedBody = body;
  if (isGroup && historyLimit > 0) {
    combinedBody = buildPendingHistoryContextFromMap({
      historyMap: groupHistories,
      historyKey: buildTelegramGroupPeerId(chatId, resolvedThreadId),
      limit: historyLimit,
      currentMessage: combinedBody,
      formatEntry: (entry) =>
        formatInboundEnvelope({
          channel: "Telegram",
          from: groupLabel ?? `group:${chatId}`,
          timestamp: entry.timestamp,
          body: `${entry.body} [id:${entry.messageId ?? "unknown"} chat:${chatId}]`,
          chatType: "group",
          senderLabel: entry.sender,
          envelope: envelopeOptions,
        }),
    });
  }

  const systemPromptParts = [groupConfig?.systemPrompt, topicConfig?.systemPrompt].filter(Boolean);
  const ctxPayload = finalizeInboundContext({
    Body: combinedBody,
    RawBody: rawBody,
    CommandBody: normalizeCommandBody(rawBody, { botUsername }),
    From: isGroup ? buildTelegramGroupFrom(chatId, resolvedThreadId) : `telegram:${chatId}`,
    To: `telegram:${chatId}`,
    SessionKey: sessionKey,
    AccountId: route.accountId,
    ChatType: isGroup ? "group" : "direct",
    ConversationLabel: conversationLabel,
    SenderName: senderName,
    SenderId: senderId || undefined,
    SenderUsername: senderUsername || undefined,
    Provider: "telegram",
    Surface: "telegram",
    MessageSid: options?.messageIdOverride ?? String(msg.message_id),
    ReplyToId: replyTarget?.id,
    ReplyToBody: replyTarget?.body,
    ReplyToSender: replyTarget?.sender,
    ForwardedFrom: forwardOrigin?.from,
    ForwardedDate: forwardOrigin?.date ? forwardOrigin.date * 1000 : undefined,
    Timestamp: msg.date ? msg.date * 1000 : undefined,
    WasMentioned: isGroup ? mentionGate.effectiveWasMentioned : undefined,
    MediaPaths: allMedia.map((m) => m.path),
    MediaTypes: allMedia.map((m) => m.contentType).filter(Boolean) as string[],
    ...(locationData ? toLocationContext(locationData) : undefined),
    CommandAuthorized: commandGate.commandAuthorized,
    MessageThreadId: resolvedThreadId,
    IsForum: isForum,
    OriginatingChannel: "telegram",
    OriginatingTo: `telegram:${chatId}`,
    GroupSubject: isGroup ? (msg.chat as any).title : undefined,
    GroupSystemPrompt: systemPromptParts.join("\n\n") || undefined,
  });

  await recordInboundSession({
    storePath,
    sessionKey: ctxPayload.SessionKey ?? sessionKey,
    ctx: ctxPayload as any,
    updateLastRoute: !isGroup
      ? {
          sessionKey: route.mainSessionKey,
          channel: "telegram",
          to: String(chatId),
          accountId: route.accountId,
        }
      : undefined,
    onRecordError: (err) => {
      logVerbose(`telegram: failed updating session meta: ${String(err)}`);
    },
  });

  if (shouldLogVerbose())
    logVerbose(`telegram inbound: chatId=${chatId} from=${ctxPayload.From} len=${body.length}`);

  return {
    ctxPayload,
    primaryCtx,
    msg,
    chatId,
    isGroup,
    resolvedThreadId,
    isForum,
    historyKey: isGroup ? buildTelegramGroupPeerId(chatId, resolvedThreadId) : undefined,
    historyLimit,
    groupHistories,
    route,
    skillFilter: firstDefined(topicConfig?.skills, groupConfig?.skills),
    sendTyping,
    sendRecordVoice,
    ackReactionPromise,
    reactionApi,
    removeAckAfterReply: cfg.messages?.removeAckAfterReply ?? false,
    accountId: account.accountId,
  };
};
