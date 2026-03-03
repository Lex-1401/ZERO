import { buildSenderLabel, buildSenderName, buildGroupLabel } from "../bot/helpers.js";

/**
 * Resolves various metadata for a Telegram message including sender details and group info.
 *
 * @param msg - The raw Telegram message update.
 * @param chatId - The ID of the chat.
 * @param senderId - Normalized ID of the sender.
 * @param isGroup - Whether the chat is a group or supergroup.
 * @param resolvedThreadId - The ID of the forum thread, if applicable.
 */
export const resolveTelegramMetadata = ({
  msg,
  chatId,
  senderId,
  isGroup,
  resolvedThreadId,
}: {
  msg: any;
  chatId: number | string;
  senderId: string;
  isGroup: boolean;
  resolvedThreadId?: number;
}) => {
  const senderName = buildSenderName(msg);
  const senderLabel = buildSenderLabel(msg, senderId || chatId);
  const groupLabel = isGroup ? buildGroupLabel(msg, chatId, resolvedThreadId) : undefined;

  const conversationLabel = isGroup ? (groupLabel ?? `group:${chatId}`) : senderLabel;

  return {
    senderName,
    senderLabel,
    groupLabel,
    conversationLabel,
  };
};
