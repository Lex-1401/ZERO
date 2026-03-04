
import { Bot, InputFile } from "grammy";
import { loadConfig } from "../config/config.js";
import { logVerbose } from "../globals.js";
import { recordChannelActivity } from "../infra/channel-activity.js";
import { formatErrorMessage } from "../infra/errors.js";
import { createTelegramRetryRunner } from "../infra/retry-policy.js";
import { mediaKindFromMime } from "../media/constants.js";
import { isGifMedia } from "../media/mime.js";
import { loadWebMedia } from "../web/media.js";
import { resolveTelegramAccount } from "./accounts.js";
import { renderTelegramHtmlText } from "./format.js";
import { resolveMarkdownTableMode } from "../config/markdown-tables.js";
import { splitTelegramCaption } from "./caption.js";
import { recordSentMessage } from "./sent-message-cache.js";
import { parseTelegramTarget } from "./targets.js";
import { resolveTelegramVoiceSend } from "./voice.js";
import { buildTelegramThreadParams } from "./bot/helpers.js";
import {
  type TelegramSendOpts,
  type TelegramSendResult,
  type TelegramReactionOpts,
  type TelegramDeleteOpts,
} from "./send/types.js";
import {
  createTelegramHttpLogger,
  resolveTelegramClientOptions,
  resolveToken,
  normalizeChatId,
  normalizeMessageId,
  buildInlineKeyboard,
  inferFilename,
  PARSE_ERR_RE,
} from "./send/utils.js";

export type { TelegramSendOpts, TelegramSendResult, TelegramReactionOpts, TelegramDeleteOpts };
export { buildInlineKeyboard };

export async function sendMessageTelegram(
  to: string,
  text: string,
  opts: TelegramSendOpts = {},
): Promise<TelegramSendResult> {
  const cfg = loadConfig();
  const account = resolveTelegramAccount({ cfg, accountId: opts.accountId });
  const token = resolveToken(opts.token, account);
  const target = parseTelegramTarget(to);
  const chatId = normalizeChatId(target.chatId);
  const client = resolveTelegramClientOptions(account);
  const api = opts.api ?? new Bot(token, client ? { client } : undefined).api;
  const mediaUrl = opts.mediaUrl?.trim();
  const replyMarkup = buildInlineKeyboard(opts.buttons);

  const messageThreadId = opts.messageThreadId != null ? opts.messageThreadId : target.messageThreadId;
  const threadIdParams = buildTelegramThreadParams(messageThreadId);
  const threadParams: Record<string, number> = threadIdParams ? { ...threadIdParams } : {};
  if (opts.replyToMessageId != null) threadParams.reply_to_message_id = Math.trunc(opts.replyToMessageId);

  const request = createTelegramRetryRunner({ retry: opts.retry, configRetry: account.config.retry, verbose: opts.verbose });
  const logHttpError = createTelegramHttpLogger(cfg);
  const requestWithDiag = <T>(fn: () => Promise<T>, label?: string) =>
    request(fn, label).catch((err) => { logHttpError(label ?? "request", err); throw err; });

  const wrapChatNotFound = (err: unknown) => {
    if (!/400: Bad Request: chat not found/i.test(formatErrorMessage(err))) return err;
    return new Error(`Telegram send failed: chat not found (chat_id=${chatId}). Likely: bot not started in DM, bot removed from group/channel, or wrong token. Input: ${JSON.stringify(to)}.`);
  };

  const textMode = opts.textMode ?? "markdown";
  const tableMode = resolveMarkdownTableMode({ cfg, channel: "telegram", accountId: account.accountId });
  const renderHtmlText = (val: string) => renderTelegramHtmlText(val, { textMode, tableMode });
  const linkPreviewOptions = (account.config.linkPreview ?? true) ? undefined : { is_disabled: true };

  const sendTelegramText = async (raw: string, params?: Record<string, unknown>, fallback?: string) => {
    const htmlText = renderHtmlText(raw);
    const baseParams: Record<string, any> = { ...params };
    if (linkPreviewOptions) baseParams.link_preview_options = linkPreviewOptions;
    return await requestWithDiag(() => api.sendMessage(chatId, htmlText, { parse_mode: "HTML", ...baseParams }), "message").catch(async (err) => {
      if (PARSE_ERR_RE.test(formatErrorMessage(err))) {
        if (opts.verbose) console.warn("telegram HTML parse failed, retrying as plain text");
        return await requestWithDiag(() => api.sendMessage(chatId, fallback ?? raw, baseParams), "message-plain").catch(e => { throw wrapChatNotFound(e); });
      }
      throw wrapChatNotFound(err);
    });
  };

  if (mediaUrl) {
    const media = await loadWebMedia(mediaUrl, opts.maxBytes);
    const kind = mediaKindFromMime(media.contentType ?? undefined);
    const isGif = isGifMedia({ contentType: media.contentType, fileName: media.fileName });
    const fileName = media.fileName ?? (isGif ? "animation.gif" : inferFilename(kind)) ?? "file";
    const file = new InputFile(media.buffer, fileName);
    const { caption, followUpText } = splitTelegramCaption(text);
    const htmlCaption = caption ? renderHtmlText(caption) : undefined;
    const needsSeparateText = Boolean(followUpText);
    const mediaParams = {
      caption: htmlCaption,
      ...(htmlCaption ? { parse_mode: "HTML" as const } : {}),
      ...threadParams,
      ...(!needsSeparateText && replyMarkup ? { reply_markup: replyMarkup } : {}),
    };

    let result: any;
    if (isGif) result = await requestWithDiag(() => api.sendAnimation(chatId, file, mediaParams), "animation").catch(e => { throw wrapChatNotFound(e); });
    else if (kind === "image") result = await requestWithDiag(() => api.sendPhoto(chatId, file, mediaParams), "photo").catch(e => { throw wrapChatNotFound(e); });
    else if (kind === "video") result = await requestWithDiag(() => api.sendVideo(chatId, file, mediaParams), "video").catch(e => { throw wrapChatNotFound(e); });
    else if (kind === "audio") {
      const { useVoice } = resolveTelegramVoiceSend({ wantsVoice: opts.asVoice === true, contentType: media.contentType, fileName, logFallback: logVerbose });
      if (useVoice) {
        result = await requestWithDiag(() => api.sendVoice(chatId, file, mediaParams), "voice").catch(e => { throw wrapChatNotFound(e); });
      } else {
        result = await requestWithDiag(() => api.sendAudio(chatId, file, mediaParams), "audio").catch(e => { throw wrapChatNotFound(e); });
      }
    } else result = await requestWithDiag(() => api.sendDocument(chatId, file, mediaParams), "document").catch(e => { throw wrapChatNotFound(e); });

    const mediaMessageId = String(result?.message_id ?? "unknown");
    if (result?.message_id) recordSentMessage(chatId, result.message_id);
    recordChannelActivity({ channel: "telegram", accountId: account.accountId, direction: "outbound" });

    if (needsSeparateText && followUpText) {
      const textParams = { ...threadParams, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) };
      const textRes = await sendTelegramText(followUpText, textParams);
      return { messageId: String(textRes?.message_id ?? mediaMessageId), chatId: String(result?.chat?.id ?? chatId) };
    }
    return { messageId: mediaMessageId, chatId: String(result?.chat?.id ?? chatId) };
  }

  if (!text?.trim()) throw new Error("Message must be non-empty for Telegram sends");
  const textParams = { ...threadParams, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) };
  const res = await sendTelegramText(text, textParams, opts.plainText);
  const messageId = String(res?.message_id ?? "unknown");
  if (res?.message_id) recordSentMessage(chatId, res.message_id);
  recordChannelActivity({ channel: "telegram", accountId: account.accountId, direction: "outbound" });
  return { messageId, chatId: String(res?.chat?.id ?? chatId) };
}

export async function reactMessageTelegram(
  chatIdInput: string | number,
  messageIdInput: string | number,
  emoji: string,
  opts: TelegramReactionOpts = {},
): Promise<{ ok: true }> {
  const cfg = loadConfig();
  const account = resolveTelegramAccount({ cfg, accountId: opts.accountId });
  const token = resolveToken(opts.token, account);
  const chatId = normalizeChatId(String(chatIdInput));
  const messageId = normalizeMessageId(messageIdInput);
  const client = resolveTelegramClientOptions(account);
  const api = opts.api ?? new Bot(token, client ? { client } : undefined).api;
  const request = createTelegramRetryRunner({ retry: opts.retry, configRetry: account.config.retry, verbose: opts.verbose });
  const logHttpError = createTelegramHttpLogger(cfg);
  const requestWithDiag = <T>(fn: () => Promise<T>, label?: string) =>
    request(fn, label).catch((err) => { logHttpError(label ?? "request", err); throw err; });

  const reactions: any[] = opts.remove === true || !emoji.trim() ? [] : [{ type: "emoji", emoji: emoji.trim() }];
  if (typeof api.setMessageReaction !== "function") throw new Error("Telegram reactions are unavailable in this bot API.");
  await requestWithDiag(() => api.setMessageReaction(chatId, messageId, reactions), "reaction");
  return { ok: true };
}

export async function deleteMessageTelegram(
  chatIdInput: string | number,
  messageIdInput: string | number,
  opts: TelegramDeleteOpts = {},
): Promise<{ ok: true }> {
  const cfg = loadConfig();
  const account = resolveTelegramAccount({ cfg, accountId: opts.accountId });
  const token = resolveToken(opts.token, account);
  const chatId = normalizeChatId(String(chatIdInput));
  const messageId = normalizeMessageId(messageIdInput);
  const client = resolveTelegramClientOptions(account);
  const api = opts.api ?? new Bot(token, client ? { client } : undefined).api;
  const request = createTelegramRetryRunner({ retry: opts.retry, configRetry: account.config.retry, verbose: opts.verbose });
  const logHttpError = createTelegramHttpLogger(cfg);
  const requestWithDiag = <T>(fn: () => Promise<T>, label?: string) =>
    request(fn, label).catch((err) => { logHttpError(label ?? "request", err); throw err; });
  await requestWithDiag(() => api.deleteMessage(chatId, messageId), "deleteMessage");
  logVerbose(`[telegram] Deleted message ${messageId} from chat ${chatId}`);
  return { ok: true };
}
