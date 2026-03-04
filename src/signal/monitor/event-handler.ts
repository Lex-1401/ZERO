import { hasControlCommand } from "../../auto-reply/command-detection.js";
import {
  createInboundDebouncer,
  resolveInboundDebounceMs,
} from "../../auto-reply/inbound-debounce.js";
import { logInboundDrop } from "../../channels/logging.js";
import { danger, logVerbose } from "../../globals.js";
import { mediaKindFromMime } from "../../media/constants.js";
import { buildPairingReply } from "../../pairing/pairing-messages.js";
import {
  readChannelAllowFromStore,
  upsertChannelPairingRequest,
} from "../../pairing/pairing-store.js";
import { normalizeE164 } from "../../utils.js";
import { resolveControlCommandGate } from "../../channels/command-gating.js";
import {
  formatSignalPairingIdLine,
  formatSignalSenderDisplay,
  formatSignalSenderId,
  isSignalSenderAllowed,
  resolveSignalPeerId,
  resolveSignalRecipient,
  resolveSignalSender,
} from "../identity.js";
import { sendMessageSignal, sendReadReceiptSignal } from "../send.js";

import type { SignalEventHandlerDeps, SignalReceivePayload } from "./event-handler.types.js";
import { handleSignalReaction } from "./handler/reaction.js";
import { processSignalInboundMessage } from "./handler/message.js";

export function createSignalEventHandler(deps: SignalEventHandlerDeps) {
  const inboundDebounceMs = resolveInboundDebounceMs({ cfg: deps.cfg, channel: "signal" });

  type SignalInboundEntry = {
    senderName: string;
    senderDisplay: string;
    senderRecipient: string;
    senderPeerId: string;
    groupId?: string;
    groupName?: string;
    isGroup: boolean;
    bodyText: string;
    timestamp?: number;
    messageId?: string;
    mediaPath?: string;
    mediaType?: string;
    commandAuthorized: boolean;
  };

  const inboundDebouncer = createInboundDebouncer<SignalInboundEntry>({
    debounceMs: inboundDebounceMs,
    buildKey: (e) => {
      const convId = e.isGroup ? (e.groupId ?? "unknown") : e.senderPeerId;
      return convId && e.senderPeerId
        ? `signal:${deps.accountId}:${convId}:${e.senderPeerId}`
        : null;
    },
    shouldDebounce: (e) =>
      !!e.bodyText.trim() &&
      !e.mediaPath &&
      !e.mediaType &&
      !hasControlCommand(e.bodyText, deps.cfg),
    onFlush: async (es) => {
      const last = es.at(-1);
      if (!last) return;
      if (es.length === 1) {
        await processSignalInboundMessage({ deps, entry: last });
        return;
      }
      const combinedText = es
        .map((e) => e.bodyText)
        .filter(Boolean)
        .join("\\n");
      if (combinedText.trim())
        await processSignalInboundMessage({
          deps,
          entry: { ...last, bodyText: combinedText, mediaPath: undefined, mediaType: undefined },
        });
    },
    onError: (err) => deps.runtime.error?.(`signal debounce flush failed: ${String(err)}`),
  });

  return async (event: { event?: string; data?: string }) => {
    if (event.event !== "receive" || !event.data) return;
    let payload: SignalReceivePayload | null = null;
    try {
      payload = JSON.parse(event.data);
    } catch (err) {
      deps.runtime.error?.(`failed parse: ${String(err)}`);
      return;
    }
    if (payload?.exception?.message)
      deps.runtime.error?.(`receive exception: ${payload.exception.message}`);
    const envelope = payload?.envelope;
    if (!envelope || envelope.syncMessage) return;

    const sender = resolveSignalSender(envelope);
    if (
      !sender ||
      (deps.account && sender.kind === "phone" && sender.e164 === normalizeE164(deps.account))
    )
      return;

    const dataMessage = envelope.dataMessage ?? envelope.editMessage?.dataMessage;
    const reaction = deps.isSignalReactionMessage(envelope.reactionMessage)
      ? envelope.reactionMessage
      : deps.isSignalReactionMessage(dataMessage?.reaction)
        ? dataMessage?.reaction
        : null;

    const hasValidAttachment = Boolean(
      dataMessage?.attachments?.some((a: Record<string, any>) => Object.keys(a).length > 0),
    );

    if (reaction && !dataMessage?.message?.trim() && !hasValidAttachment) {
      await handleSignalReaction({ deps, envelope, reaction, sender });
      return;
    }
    if (!dataMessage) return;

    const senderDisplay = formatSignalSenderDisplay(sender);
    const senderRecipient = resolveSignalRecipient(sender);
    const senderPeerId = resolveSignalPeerId(sender);
    if (!senderRecipient) return;

    const groupId = dataMessage.groupInfo?.groupId;
    const isGroup = Boolean(groupId);
    const storeAllowFrom = await readChannelAllowFromStore("signal").catch(() => []);
    const dmAllowed =
      deps.dmPolicy === "open"
        ? true
        : isSignalSenderAllowed(sender, [...deps.allowFrom, ...storeAllowFrom]);

    if (!isGroup) {
      if (deps.dmPolicy === "disabled") return;
      if (!dmAllowed) {
        if (deps.dmPolicy === "pairing") {
          const senderId = formatSignalSenderId(sender);
          const { code, created } = await upsertChannelPairingRequest({
            channel: "signal",
            id: senderId,
            meta: { name: envelope.sourceName ?? undefined },
          });
          if (created) {
            logVerbose(`signal pairing request sender=${senderId}`);
            try {
              await sendMessageSignal(
                `signal:${senderRecipient}`,
                buildPairingReply({
                  channel: "signal",
                  idLine: formatSignalPairingIdLine(sender),
                  code,
                }),
                {
                  baseUrl: deps.baseUrl,
                  account: deps.account,
                  maxBytes: deps.mediaMaxBytes,
                  accountId: deps.accountId,
                },
              );
            } catch (err) {
              logVerbose(`pairing fail: ${String(err)}`);
            }
          }
        }
        return;
      }
    } else if (deps.groupPolicy === "disabled") return;

    const useAccess = deps.cfg.commands?.useAccessGroups !== false;
    const auths = [
      {
        configured: deps.allowFrom.length > 0,
        allowed: isSignalSenderAllowed(sender, [...deps.allowFrom, ...storeAllowFrom]),
      },
      {
        configured: deps.groupAllowFrom.length > 0,
        allowed: isSignalSenderAllowed(sender, [...deps.groupAllowFrom, ...storeAllowFrom]),
      },
    ];
    const commandGate = resolveControlCommandGate({
      useAccessGroups: useAccess,
      authorizers: auths,
      allowTextCommands: true,
      hasControlCommand: hasControlCommand(dataMessage.message ?? "", deps.cfg),
    });
    const commandAuthorized = isGroup ? commandGate.commandAuthorized : dmAllowed;
    if (isGroup && commandGate.shouldBlock) {
      logInboundDrop({
        log: logVerbose,
        channel: "signal",
        reason: "control command (unauthorized)",
        target: senderDisplay,
      });
      return;
    }

    let mediaPath: string | undefined,
      mediaType: string | undefined,
      placeholder = "";
    if (dataMessage.attachments?.[0]?.id && !deps.ignoreAttachments) {
      try {
        const fetched = await deps.fetchAttachment({
          baseUrl: deps.baseUrl,
          account: deps.account,
          attachment: dataMessage.attachments[0],
          sender: senderRecipient,
          groupId,
          maxBytes: deps.mediaMaxBytes,
        });
        if (fetched) {
          mediaPath = fetched.path ?? undefined;
          mediaType = fetched.contentType ?? dataMessage.attachments[0].contentType ?? undefined;
        }
      } catch (err) {
        deps.runtime.error?.(danger(`attach fail: ${String(err)}`));
      }
    }
    const kind = mediaKindFromMime(mediaType);
    placeholder = kind
      ? `<media:${kind}>`
      : dataMessage.attachments?.length
        ? "<media:attachment>"
        : "";

    const bodyText =
      (dataMessage.message ?? "").trim() || placeholder || dataMessage.quote?.text?.trim() || "";
    if (!bodyText) return;

    const receiptTs = envelope.timestamp ?? dataMessage.timestamp;
    if (deps.sendReadReceipts && !deps.readReceiptsViaDaemon && !isGroup && receiptTs) {
      try {
        await sendReadReceiptSignal(`signal:${senderRecipient}`, receiptTs, {
          baseUrl: deps.baseUrl,
          account: deps.account,
          accountId: deps.accountId,
        });
      } catch (err) {
        logVerbose(`receipt fail: ${String(err)}`);
      }
    }

    await inboundDebouncer.enqueue({
      senderName: envelope.sourceName ?? senderDisplay,
      senderDisplay,
      senderRecipient,
      senderPeerId,
      groupId,
      groupName: dataMessage.groupInfo?.groupName ?? undefined,
      isGroup,
      bodyText,
      timestamp: envelope.timestamp ?? undefined,
      messageId: envelope.timestamp ? String(envelope.timestamp) : undefined,
      mediaPath: mediaPath ?? undefined,
      mediaType: mediaType ?? undefined,
      commandAuthorized,
    });
  };
}
