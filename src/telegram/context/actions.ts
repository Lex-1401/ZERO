import { buildTypingThreadParams } from "../bot/helpers.js";
import { logVerbose } from "../../globals.js";

/**
 * Creates feedback actions (typing, voice recording) for the Telegram bot.
 *
 * @param params - Context for executing actions.
 */
export const createTelegramActions = ({
  bot,
  chatId,
  resolvedThreadId,
}: {
  bot: any;
  chatId: number | string;
  resolvedThreadId?: number;
}) => {
  const sendTyping = async () => {
    await bot.api.sendChatAction(chatId, "typing", buildTypingThreadParams(resolvedThreadId));
  };

  const sendRecordVoice = async () => {
    try {
      await bot.api.sendChatAction(
        chatId,
        "record_voice",
        buildTypingThreadParams(resolvedThreadId),
      );
    } catch (err) {
      logVerbose(`telegram record_voice cue failed for chat ${chatId}: ${String(err)}`);
    }
  };

  return {
    sendTyping,
    sendRecordVoice,
  };
};
