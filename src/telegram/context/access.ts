import { logVerbose } from "../../globals.js";
import { formatCliCommand } from "../../cli/command-format.js";
import { upsertTelegramPairingRequest } from "../pairing-store.js";
import { resolveSenderAllowMatch } from "../bot-access.js";

/**
 * Evaluates and enforces Telegram Direct Message (DM) access policies.
 * Supports pairing, allowlist, open, and disabled policies.
 *
 * @param params - Context and configuration for DM policy enforcement.
 * @returns An object indicating if access is allowed and whether a pairing request was initiated.
 */
export const evaluateTelegramDmAccess = async ({
  chatId,
  msg,
  dmPolicy,
  effectiveDmAllow,
  bot,
  logger,
}: {
  chatId: string | number;
  msg: any;
  dmPolicy: string;
  effectiveDmAllow: any;
  bot: any;
  logger: any;
}) => {
  if (dmPolicy === "disabled") return { allowed: false };

  if (dmPolicy !== "open") {
    const candidate = String(chatId);
    const senderUsername = msg.from?.username ?? "";
    const allowMatch = resolveSenderAllowMatch({
      allow: effectiveDmAllow,
      senderId: candidate,
      senderUsername,
    });
    const allowMatchMeta = `matchKey=${allowMatch.matchKey ?? "none"} matchSource=${allowMatch.matchSource ?? "none"}`;
    const allowed =
      effectiveDmAllow.hasWildcard || (effectiveDmAllow.hasEntries && allowMatch.allowed);

    if (!allowed) {
      if (dmPolicy === "pairing") {
        try {
          const from = msg.from;
          const telegramUserId = from?.id ? String(from.id) : candidate;
          const { code, created } = await upsertTelegramPairingRequest({
            chatId: candidate,
            username: from?.username,
            firstName: from?.first_name,
            lastName: from?.last_name,
          });
          if (created) {
            logger.info(
              {
                chatId: candidate,
                username: from?.username,
                firstName: from?.first_name,
                lastName: from?.last_name,
                matchKey: allowMatch.matchKey ?? "none",
                matchSource: allowMatch.matchSource ?? "none",
              },
              "telegram pairing request",
            );
            await bot.api.sendMessage(
              chatId,
              [
                "ZERO: access not configured.",
                "",
                `Your Telegram user id: ${telegramUserId}`,
                "",
                `Pairing code: ${code}`,
                "",
                "Ask the bot owner to approve with:",
                formatCliCommand("zero pairing approve telegram <code>"),
              ].join("\n"),
            );
          }
        } catch (err) {
          logVerbose(`telegram pairing reply failed for chat ${chatId}: ${String(err)}`);
        }
      } else {
        logVerbose(
          `Blocked unauthorized telegram sender ${candidate} (dmPolicy=${dmPolicy}, ${allowMatchMeta})`,
        );
      }
      return { allowed: false };
    }
  }

  return { allowed: true };
};
