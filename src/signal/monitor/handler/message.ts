import { resolveHumanDelayConfig } from "../../../agents/identity.js";
import {
  formatInboundEnvelope,
  formatInboundFromLabel,
  resolveEnvelopeFormatOptions,
} from "../../../auto-reply/envelope.js";
import { dispatchInboundMessage } from "../../../auto-reply/dispatch.js";
import {
  buildPendingHistoryContextFromMap,
  clearHistoryEntriesIfEnabled,
} from "../../../auto-reply/reply/history.js";
import { finalizeInboundContext } from "../../../auto-reply/reply/inbound-context.js";
import { createReplyDispatcherWithTyping } from "../../../auto-reply/reply/reply-dispatcher.js";
import { logTypingFailure } from "../../../channels/logging.js";
import { createReplyPrefixContext } from "../../../channels/reply-prefix.js";
import { recordInboundSession } from "../../../channels/session.js";
import { createTypingCallbacks } from "../../../channels/typing.js";
import { readSessionUpdatedAt, resolveStorePath } from "../../../config/sessions.js";
import { danger, logVerbose, shouldLogVerbose } from "../../../globals.js";
import { resolveAgentRoute } from "../../../routing/resolve-route.js";
import { sendTypingSignal } from "../../send.js";
import type { SignalEventHandlerDeps } from "../event-handler.types.js";

export async function processSignalInboundMessage(params: {
  deps: SignalEventHandlerDeps;
  entry: any; // SignalInboundEntry
}) {
  const { deps, entry } = params;
  const fromLabel = formatInboundFromLabel({
    isGroup: entry.isGroup,
    groupLabel: entry.groupName ?? undefined,
    groupId: entry.groupId ?? "unknown",
    groupFallback: "Group",
    directLabel: entry.senderName,
    directId: entry.senderDisplay,
  });
  const route = resolveAgentRoute({
    cfg: deps.cfg,
    channel: "signal",
    accountId: deps.accountId,
    peer: {
      kind: entry.isGroup ? "group" : "dm",
      id: entry.isGroup ? (entry.groupId ?? "unknown") : entry.senderPeerId,
    },
  });
  const storePath = resolveStorePath(deps.cfg.session?.store, { agentId: route.agentId });
  const envelopeOptions = resolveEnvelopeFormatOptions(deps.cfg);
  const previousTimestamp = readSessionUpdatedAt({ storePath, sessionKey: route.sessionKey });

  const body = formatInboundEnvelope({
    channel: "Signal",
    from: fromLabel,
    timestamp: entry.timestamp ?? undefined,
    body: entry.bodyText,
    chatType: entry.isGroup ? "group" : "direct",
    sender: { name: entry.senderName, id: entry.senderDisplay },
    previousTimestamp,
    envelope: envelopeOptions,
  });
  let combinedBody = body;
  const historyKey = entry.isGroup ? String(entry.groupId ?? "unknown") : undefined;
  if (entry.isGroup && historyKey) {
    combinedBody = buildPendingHistoryContextFromMap({
      historyMap: deps.groupHistories,
      historyKey,
      limit: deps.historyLimit,
      currentMessage: combinedBody,
      formatEntry: (h) =>
        formatInboundEnvelope({
          channel: "Signal",
          from: fromLabel,
          timestamp: h.timestamp,
          body: `${h.body}${h.messageId ? ` [id:${h.messageId}]` : ""}`,
          chatType: "group",
          senderLabel: h.sender,
          envelope: envelopeOptions,
        }),
    });
  }

  const signalTo = entry.isGroup ? `group:${entry.groupId}` : `signal:${entry.senderRecipient}`;
  const ctxPayload = finalizeInboundContext({
    Body: combinedBody,
    RawBody: entry.bodyText,
    CommandBody: entry.bodyText,
    From: entry.isGroup ? `group:${entry.groupId ?? "unknown"}` : `signal:${entry.senderRecipient}`,
    To: signalTo,
    SessionKey: route.sessionKey,
    AccountId: route.accountId,
    ChatType: entry.isGroup ? "group" : "direct",
    ConversationLabel: fromLabel,
    GroupSubject: entry.isGroup ? (entry.groupName ?? undefined) : undefined,
    SenderName: entry.senderName,
    SenderId: entry.senderDisplay,
    Provider: "signal" as const,
    Surface: "signal" as const,
    MessageSid: entry.messageId,
    Timestamp: entry.timestamp ?? undefined,
    MediaPath: entry.mediaPath,
    MediaType: entry.mediaType,
    MediaUrl: entry.mediaPath,
    CommandAuthorized: entry.commandAuthorized,
    OriginatingChannel: "signal" as const,
    OriginatingTo: signalTo,
  });

  await recordInboundSession({
    storePath,
    sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
    ctx: ctxPayload,
    updateLastRoute: !entry.isGroup
      ? {
        sessionKey: route.mainSessionKey,
        channel: "signal",
        to: entry.senderRecipient,
        accountId: route.accountId,
      }
      : undefined,
    onRecordError: (err) => logVerbose(`signal: failed updating session meta: ${String(err)}`),
  });

  if (shouldLogVerbose())
    logVerbose(
      `signal inbound: from=${ctxPayload.From} len=${body.length} preview="${body.slice(0, 100).replace(/\\n/g, "\\\\n")}..."`,
    );

  const prefixContext = createReplyPrefixContext({ cfg: deps.cfg, agentId: route.agentId });
  const typingCallbacks = createTypingCallbacks({
    start: async () => {
      if (ctxPayload.To)
        await sendTypingSignal(ctxPayload.To, {
          baseUrl: deps.baseUrl,
          account: deps.account,
          accountId: deps.accountId,
        });
    },
    onStartError: (err) =>
      logTypingFailure({
        log: logVerbose,
        channel: "signal",
        target: ctxPayload.To ?? undefined,
        error: err,
      }),
  });

  const { dispatcher, replyOptions, markDispatchIdle } = createReplyDispatcherWithTyping({
    responsePrefix: prefixContext.responsePrefix,
    responsePrefixContextProvider: prefixContext.responsePrefixContextProvider,
    humanDelay: resolveHumanDelayConfig(deps.cfg, route.agentId),
    deliver: async (p) => {
      await deps.deliverReplies({
        replies: [p],
        target: ctxPayload.To,
        baseUrl: deps.baseUrl,
        account: deps.account,
        accountId: deps.accountId,
        runtime: deps.runtime,
        maxBytes: deps.mediaMaxBytes,
        textLimit: deps.textLimit,
      });
    },
    onError: (err, info) =>
      deps.runtime.error?.(danger(`signal ${info.kind} reply failed: ${String(err)}`)),
    onReplyStart: typingCallbacks.onReplyStart,
  });

  await dispatchInboundMessage({
    ctx: ctxPayload,
    cfg: deps.cfg,
    dispatcher,
    replyOptions: {
      ...replyOptions,
      disableBlockStreaming:
        typeof deps.blockStreaming === "boolean" ? !deps.blockStreaming : undefined,
      onModelSelected: (c) => prefixContext.onModelSelected(c),
    },
  });
  markDispatchIdle();
  if (entry.isGroup && historyKey)
    clearHistoryEntriesIfEnabled({
      historyMap: deps.groupHistories,
      historyKey,
      limit: deps.historyLimit,
    });
}
