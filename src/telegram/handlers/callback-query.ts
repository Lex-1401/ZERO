import { logVerbose } from "../../globals.js";
import { resolveTelegramForumThreadId } from "../bot/helpers.js";
import { firstDefined, isSenderAllowed, normalizeAllowFromWithStore } from "../bot-access.js";
import { resolveTelegramInlineButtonsScope } from "../inline-buttons.js";
import { readTelegramAllowFromStore } from "../pairing-store.js";
import type { TelegramMessage } from "../bot/types.js";

/**
 * Handles Telegram callback query events (inline button clicks).
 * Implements access control and message conversion for processing.
 *
 * @param params - Context and resolvers for callback processing.
 */
export const handleTelegramCallbackQuery = async ({
  ctx,
  cfg,
  accountId,
  bot,
  telegramCfg,
  groupAllowFrom,
  resolveGroupPolicy,
  resolveTelegramGroupConfig,
  shouldSkipUpdate,
  processMessage,
  logger,
  runtime,
}: {
  ctx: any;
  cfg: any;
  accountId: string;
  bot: any;
  telegramCfg: any;
  groupAllowFrom: any;
  resolveGroupPolicy: any;
  resolveTelegramGroupConfig: any;
  shouldSkipUpdate: any;
  processMessage: any;
  logger: any;
  runtime: any;
}) => {
  const callback = ctx.callbackQuery;
  if (!callback) return;
  if (shouldSkipUpdate(ctx)) return;

  // Answer immediately to prevent Telegram from retrying while we process
  await bot.api.answerCallbackQuery(callback.id).catch(() => {});

  try {
    const data = (callback.data ?? "").trim();
    const callbackMessage = callback.message;
    if (!data || !callbackMessage) return;

    const inlineButtonsScope = resolveTelegramInlineButtonsScope({
      cfg,
      accountId,
    });
    if (inlineButtonsScope === "off") return;

    const chatId = callbackMessage.chat.id;
    const isGroup =
      callbackMessage.chat.type === "group" || callbackMessage.chat.type === "supergroup";
    if (inlineButtonsScope === "dm" && isGroup) return;
    if (inlineButtonsScope === "group" && !isGroup) return;

    const messageThreadId = (callbackMessage as { message_thread_id?: number }).message_thread_id;
    const isForum = (callbackMessage.chat as { is_forum?: boolean }).is_forum === true;
    const resolvedThreadId = resolveTelegramForumThreadId({
      isForum,
      messageThreadId,
    });
    const { groupConfig, topicConfig } = resolveTelegramGroupConfig(chatId, resolvedThreadId);
    const storeAllowFrom = await readTelegramAllowFromStore().catch(() => []);
    const groupAllowOverride = firstDefined(topicConfig?.allowFrom, groupConfig?.allowFrom);
    const effectiveGroupAllow = normalizeAllowFromWithStore({
      allowFrom: groupAllowOverride ?? groupAllowFrom,
      storeAllowFrom,
    });
    const effectiveDmAllow = normalizeAllowFromWithStore({
      allowFrom: telegramCfg.allowFrom,
      storeAllowFrom,
    });
    const dmPolicy = telegramCfg.dmPolicy ?? "pairing";
    const senderId = callback.from?.id ? String(callback.from.id) : "";
    const senderUsername = callback.from?.username ?? "";

    if (isGroup) {
      if (groupConfig?.enabled === false) {
        logVerbose(`Blocked telegram group ${chatId} (group disabled)`);
        return;
      }
      if (topicConfig?.enabled === false) {
        logVerbose(
          `Blocked telegram topic ${chatId} (${resolvedThreadId ?? "unknown"}) (topic disabled)`,
        );
        return;
      }
      if (typeof groupAllowOverride !== "undefined") {
        const allowed =
          senderId &&
          isSenderAllowed({
            allow: effectiveGroupAllow,
            senderId,
            senderUsername,
          });
        if (!allowed) {
          logVerbose(
            `Blocked telegram group sender ${senderId || "unknown"} (group allowFrom override)`,
          );
          return;
        }
      }
      const defaultGroupPolicy = cfg.channels?.defaults?.groupPolicy;
      const groupPolicy = telegramCfg.groupPolicy ?? defaultGroupPolicy ?? "open";
      if (groupPolicy === "disabled") {
        logVerbose(`Blocked telegram group message (groupPolicy: disabled)`);
        return;
      }
      if (groupPolicy === "allowlist") {
        if (!senderId) {
          logVerbose(`Blocked telegram group message (no sender ID, groupPolicy: allowlist)`);
          return;
        }
        if (!effectiveGroupAllow.hasEntries) {
          logVerbose(
            "Blocked telegram group message (groupPolicy: allowlist, no group allowlist entries)",
          );
          return;
        }
        if (
          !isSenderAllowed({
            allow: effectiveGroupAllow,
            senderId,
            senderUsername,
          })
        ) {
          logVerbose(`Blocked telegram group message from ${senderId} (groupPolicy: allowlist)`);
          return;
        }
      }
      const groupAllowlist = resolveGroupPolicy(chatId);
      if (groupAllowlist.allowlistEnabled && !groupAllowlist.allowed) {
        logger.info(
          { chatId, title: callbackMessage.chat.title, reason: "not-allowed" },
          "skipping group message",
        );
        return;
      }
    }

    if (inlineButtonsScope === "allowlist") {
      if (!isGroup) {
        if (dmPolicy === "disabled") return;
        if (dmPolicy !== "open") {
          const allowed =
            effectiveDmAllow.hasWildcard ||
            (effectiveDmAllow.hasEntries &&
              isSenderAllowed({
                allow: effectiveDmAllow,
                senderId,
                senderUsername,
              }));
          if (!allowed) return;
        }
      } else {
        const allowed =
          effectiveGroupAllow.hasWildcard ||
          (effectiveGroupAllow.hasEntries &&
            isSenderAllowed({
              allow: effectiveGroupAllow,
              senderId,
              senderUsername,
            }));
        if (!allowed) return;
      }
    }

    const syntheticMessage: TelegramMessage = {
      ...callbackMessage,
      from: callback.from,
      text: data,
      caption: undefined,
      caption_entities: undefined,
      entities: undefined,
    };
    const getFile = typeof ctx.getFile === "function" ? ctx.getFile.bind(ctx) : async () => ({});
    await processMessage({ message: syntheticMessage, me: ctx.me, getFile }, [], storeAllowFrom, {
      forceWasMentioned: true,
      messageIdOverride: callback.id,
    });
  } catch (err) {
    runtime.error?.(`callback handler failed: ${String(err)}`);
  }
};
