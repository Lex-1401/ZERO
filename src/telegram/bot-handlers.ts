import { hasControlCommand } from "../auto-reply/command-detection.js";
import {
  createInboundDebouncer,
  resolveInboundDebounceMs,
} from "../auto-reply/inbound-debounce.js";
import { danger, logVerbose } from "../globals.js";
import { resolveMedia } from "./bot/delivery.js";
import { resolveTelegramForumThreadId } from "./bot/helpers.js";
import type { TelegramMessage } from "./bot/types.js";
import { firstDefined, isSenderAllowed, normalizeAllowFromWithStore } from "./bot-access.js";
import { MEDIA_GROUP_TIMEOUT_MS, type MediaGroupEntry } from "./bot-updates.js";
import { readTelegramAllowFromStore } from "./pairing-store.js";
import { handleTelegramCallbackQuery } from "./handlers/callback-query.js";
import { handleTelegramMigration } from "./handlers/migration.js";
import { processMediaGroup } from "./handlers/media-group.js";
import { flushTextFragments, type TextFragmentEntry } from "./handlers/text-fragment.js";

/**
 * Registers all core Telegram event handlers by wiring up sub-modules and main logic.
 * Implements buffering for media groups and text fragments to rebuild split messages.
 *
 * @param params - Configuration, runtime, and processing hooks for the Telegram bot.
 */
export const registerTelegramHandlers = ({
  cfg,
  accountId,
  bot,
  opts,
  runtime,
  mediaMaxBytes,
  telegramCfg,
  groupAllowFrom,
  resolveGroupPolicy,
  resolveTelegramGroupConfig,
  shouldSkipUpdate,
  processMessage,
  logger,
}: any) => {
  const TELEGRAM_TEXT_FRAGMENT_START_THRESHOLD_CHARS = 4000;
  const TELEGRAM_TEXT_FRAGMENT_MAX_GAP_MS = 1500;
  const TELEGRAM_TEXT_FRAGMENT_MAX_ID_GAP = 1;
  const TELEGRAM_TEXT_FRAGMENT_MAX_PARTS = 12;
  const TELEGRAM_TEXT_FRAGMENT_MAX_TOTAL_CHARS = 50_000;

  const mediaGroupBuffer = new Map<string, MediaGroupEntry>();
  let mediaGroupProcessing: Promise<void> = Promise.resolve();

  const textFragmentBuffer = new Map<string, TextFragmentEntry>();
  let textFragmentProcessing: Promise<void> = Promise.resolve();

  const debounceMs = resolveInboundDebounceMs({ cfg, channel: "telegram" });
  type TelegramDebounceEntry = {
    ctx: unknown;
    msg: TelegramMessage;
    allMedia: Array<{ path: string; contentType?: string }>;
    storeAllowFrom: string[];
    debounceKey: string | null;
    botUsername?: string;
  };

  const inboundDebouncer = createInboundDebouncer<TelegramDebounceEntry>({
    debounceMs,
    buildKey: (entry) => entry.debounceKey,
    shouldDebounce: (entry) => {
      if (entry.allMedia.length > 0) return false;
      const text = entry.msg.text ?? entry.msg.caption ?? "";
      if (!text.trim()) return false;
      return !hasControlCommand(text, cfg, { botUsername: entry.botUsername });
    },
    onFlush: async (entries) => {
      const last = entries.at(-1);
      if (!last) return;
      if (entries.length === 1) {
        await processMessage(last.ctx, last.allMedia, last.storeAllowFrom);
        return;
      }
      const combinedText = entries
        .map((entry) => entry.msg.text ?? entry.msg.caption ?? "")
        .filter(Boolean)
        .join("\n");
      if (!combinedText.trim()) return;
      const first = entries[0];
      const baseCtx = first.ctx as { me?: unknown; getFile?: unknown } & Record<string, unknown>;
      const getFile =
        typeof baseCtx.getFile === "function" ? baseCtx.getFile.bind(baseCtx) : async () => ({});
      const syntheticMessage: TelegramMessage = {
        ...first.msg,
        text: combinedText,
        caption: undefined,
        caption_entities: undefined,
        entities: undefined,
        date: last.msg.date ?? first.msg.date,
      };
      const messageIdOverride = last.msg.message_id ? String(last.msg.message_id) : undefined;
      await processMessage(
        { message: syntheticMessage, me: baseCtx.me, getFile },
        [],
        first.storeAllowFrom,
        messageIdOverride ? { messageIdOverride } : undefined,
      );
    },
    onError: (err) => {
      runtime.error?.(danger(`telegram debounce flush failed: ${String(err)}`));
    },
  });

  const scheduleTextFragmentFlush = (entry: TextFragmentEntry) => {
    clearTimeout(entry.timer);
    entry.timer = setTimeout(async () => {
      textFragmentBuffer.delete(entry.key);
      textFragmentProcessing = textFragmentProcessing
        .then(async () => {
          await flushTextFragments({ entry, processMessage, runtime });
        })
        .catch(() => undefined);
      await textFragmentProcessing;
    }, TELEGRAM_TEXT_FRAGMENT_MAX_GAP_MS);
  };

  // ─── CALLBACK QUERIES ────────────────────────────────────────────────────────
  bot.on("callback_query", (ctx: any) =>
    handleTelegramCallbackQuery({
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
    }),
  );

  // ─── GROUP MIGRATIONS ────────────────────────────────────────────────────────
  bot.on("message:migrate_to_chat_id", (ctx: any) =>
    handleTelegramMigration({
      ctx,
      cfg,
      accountId,
      runtime,
    }),
  );

  // ─── MESSAGES ──────────────────────────────────────────────────────────────
  bot.on("message", async (ctx: any) => {
    try {
      const msg = ctx.message;
      if (!msg) return;
      if (shouldSkipUpdate(ctx)) return;

      const chatId = msg.chat.id;
      const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
      const messageThreadId = (msg as { message_thread_id?: number }).message_thread_id;
      const isForum = (msg.chat as { is_forum?: boolean }).is_forum === true;
      const resolvedThreadId = resolveTelegramForumThreadId({
        isForum,
        messageThreadId,
      });
      const storeAllowFrom = await readTelegramAllowFromStore().catch(() => []);
      const { groupConfig, topicConfig } = resolveTelegramGroupConfig(chatId, resolvedThreadId);
      const groupAllowOverride = firstDefined(topicConfig?.allowFrom, groupConfig?.allowFrom);
      const effectiveGroupAllow = normalizeAllowFromWithStore({
        allowFrom: groupAllowOverride ?? groupAllowFrom,
        storeAllowFrom,
      });
      const hasGroupAllowOverride = typeof groupAllowOverride !== "undefined";

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
        if (hasGroupAllowOverride) {
          const senderId = msg.from?.id;
          const senderUsername = msg.from?.username ?? "";
          const allowed =
            senderId != null &&
            isSenderAllowed({
              allow: effectiveGroupAllow,
              senderId: String(senderId),
              senderUsername,
            });
          if (!allowed) {
            logVerbose(
              `Blocked telegram group sender ${senderId ?? "unknown"} (group allowFrom override)`,
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
          const senderId = msg.from?.id;
          if (senderId == null) {
            logVerbose(`Blocked telegram group message (no sender ID, groupPolicy: allowlist)`);
            return;
          }
          if (!effectiveGroupAllow.hasEntries) {
            logVerbose(
              "Blocked telegram group message (groupPolicy: allowlist, no group allowlist entries)",
            );
            return;
          }
          const senderUsername = msg.from?.username ?? "";
          if (
            !isSenderAllowed({
              allow: effectiveGroupAllow,
              senderId: String(senderId),
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
            { chatId, title: msg.chat.title, reason: "not-allowed" },
            "skipping group message",
          );
          return;
        }
      }

      // Text fragment handling
      const text = typeof msg.text === "string" ? msg.text : undefined;
      const isCommandLike = (text ?? "").trim().startsWith("/");
      if (text && !isCommandLike) {
        const nowMs = Date.now();
        const senderId = msg.from?.id != null ? String(msg.from.id) : "unknown";
        const key = `text:${chatId}:${resolvedThreadId ?? "main"}:${senderId}`;
        const existing = textFragmentBuffer.get(key);

        if (existing) {
          const last = existing.messages.at(-1);
          const lastMsgId = last?.msg.message_id;
          const lastReceivedAtMs = last?.receivedAtMs ?? nowMs;
          const idGap = typeof lastMsgId === "number" ? msg.message_id - lastMsgId : Infinity;
          const timeGapMs = nowMs - lastReceivedAtMs;
          const canAppend =
            idGap > 0 &&
            idGap <= TELEGRAM_TEXT_FRAGMENT_MAX_ID_GAP &&
            timeGapMs >= 0 &&
            timeGapMs <= TELEGRAM_TEXT_FRAGMENT_MAX_GAP_MS;

          if (canAppend) {
            const currentTotalChars = existing.messages.reduce(
              (sum, m) => sum + (m.msg.text?.length ?? 0),
              0,
            );
            const nextTotalChars = currentTotalChars + text.length;
            if (
              existing.messages.length + 1 <= TELEGRAM_TEXT_FRAGMENT_MAX_PARTS &&
              nextTotalChars <= TELEGRAM_TEXT_FRAGMENT_MAX_TOTAL_CHARS
            ) {
              existing.messages.push({ msg, ctx, receivedAtMs: nowMs });
              scheduleTextFragmentFlush(existing);
              return;
            }
          }

          clearTimeout(existing.timer);
          textFragmentBuffer.delete(key);
          textFragmentProcessing = textFragmentProcessing
            .then(async () => {
              await flushTextFragments({ entry: existing, processMessage, runtime });
            })
            .catch(() => undefined);
          await textFragmentProcessing;
        }

        const shouldStart = text.length >= TELEGRAM_TEXT_FRAGMENT_START_THRESHOLD_CHARS;
        if (shouldStart) {
          const entry: TextFragmentEntry = {
            key,
            messages: [{ msg, ctx, receivedAtMs: nowMs }],
            timer: setTimeout(() => {}, TELEGRAM_TEXT_FRAGMENT_MAX_GAP_MS),
          };
          textFragmentBuffer.set(key, entry);
          scheduleTextFragmentFlush(entry);
          return;
        }
      }

      // Media group handling
      const mediaGroupId = (msg as { media_group_id?: string }).media_group_id;
      if (mediaGroupId) {
        const existing = mediaGroupBuffer.get(mediaGroupId);
        if (existing) {
          clearTimeout(existing.timer);
          existing.messages.push({ msg, ctx });
          existing.timer = setTimeout(async () => {
            mediaGroupBuffer.delete(mediaGroupId);
            mediaGroupProcessing = mediaGroupProcessing
              .then(async () => {
                await processMediaGroup({
                  entry: existing,
                  mediaMaxBytes,
                  token: opts.token,
                  proxyFetch: opts.proxyFetch,
                  runtime,
                  processMessage,
                });
              })
              .catch(() => undefined);
            await mediaGroupProcessing;
          }, MEDIA_GROUP_TIMEOUT_MS);
        } else {
          const entry: MediaGroupEntry = {
            messages: [{ msg, ctx }],
            timer: setTimeout(async () => {
              mediaGroupBuffer.delete(mediaGroupId);
              mediaGroupProcessing = mediaGroupProcessing
                .then(async () => {
                  await processMediaGroup({
                    entry,
                    mediaMaxBytes,
                    token: opts.token,
                    proxyFetch: opts.proxyFetch,
                    runtime,
                    processMessage,
                  });
                })
                .catch(() => undefined);
              await mediaGroupProcessing;
            }, MEDIA_GROUP_TIMEOUT_MS),
          };
          mediaGroupBuffer.set(mediaGroupId, entry);
        }
        return;
      }

      let media: Awaited<ReturnType<typeof resolveMedia>> = null;
      try {
        media = await resolveMedia(ctx, mediaMaxBytes, opts.token, opts.proxyFetch);
      } catch (mediaErr) {
        const errMsg = String(mediaErr);
        if (errMsg.includes("exceeds") && errMsg.includes("MB limit")) {
          const limitMb = Math.round(mediaMaxBytes / (1024 * 1024));
          await bot.api
            .sendMessage(chatId, `⚠️ File too large. Maximum size is ${limitMb}MB.`, {
              reply_to_message_id: msg.message_id,
            })
            .catch(() => {});
          logger.warn({ chatId, error: errMsg }, "media exceeds size limit");
          return;
        }
        throw mediaErr;
      }
      const allMedia = media ? [{ path: media.path, contentType: media.contentType }] : [];
      const senderId = msg.from?.id ? String(msg.from.id) : "";
      const conversationKey =
        resolvedThreadId != null ? `${chatId}:topic:${resolvedThreadId}` : String(chatId);
      const debounceKey = senderId
        ? `telegram:${accountId ?? "default"}:${conversationKey}:${senderId}`
        : null;
      await inboundDebouncer.enqueue({
        ctx,
        msg,
        allMedia,
        storeAllowFrom,
        debounceKey,
        botUsername: ctx.me?.username,
      });
    } catch (err) {
      runtime.error?.(danger(`handler failed: ${String(err)}`));
    }
  });
};
