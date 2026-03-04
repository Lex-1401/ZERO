import { logVerbose } from "../../../../globals.js";
import { formatAllowlistMatchMeta } from "../../../../channels/allowlist-match.js";
import { buildPairingReply } from "../../../../pairing/pairing-messages.js";
import { upsertChannelPairingRequest } from "../../../../pairing/pairing-store.js";
import { sendMessageSlack } from "../../../send.js";
import { resolveSlackAllowListMatch } from "../../allow-list.js";
import type { SlackMonitorContext } from "../../context.js";
import type { SlackMessageEvent } from "../../../types.js";
import type { ResolvedSlackAccount } from "../../../accounts.js";

export async function validateSlackMessageAuth(params: {
  ctx: SlackMonitorContext;
  account: ResolvedSlackAccount;
  message: SlackMessageEvent;
  allowFromLower: string[];
  isDirectMessage: boolean;
  isBotMessage: boolean;
  allowBots: boolean;
}): Promise<boolean> {
  const { ctx, account, message, allowFromLower, isDirectMessage, isBotMessage, allowBots } =
    params;

  if (isBotMessage) {
    if (message.user && ctx.botUserId && message.user === ctx.botUserId) return false;
    if (!allowBots) {
      logVerbose(`slack: drop bot message ${message.bot_id ?? "unknown"} (allowBots=false)`);
      return false;
    }
  }

  if (isDirectMessage) {
    const directUserId = message.user;
    if (!directUserId) {
      logVerbose("slack: drop dm message (missing user id)");
      return false;
    }
    if (!ctx.dmEnabled || ctx.dmPolicy === "disabled") {
      logVerbose("slack: drop dm (dms disabled)");
      return false;
    }
    if (ctx.dmPolicy !== "open") {
      const allowMatch = resolveSlackAllowListMatch({
        allowList: allowFromLower,
        id: directUserId,
      });
      const allowMatchMeta = formatAllowlistMatchMeta(allowMatch);
      if (!allowMatch.allowed) {
        if (ctx.dmPolicy === "pairing") {
          const sender = await ctx.resolveUserName(directUserId);
          const { code, created } = await upsertChannelPairingRequest({
            channel: "slack",
            id: directUserId,
            meta: { name: sender?.name },
          });
          if (created) {
            logVerbose(
              `slack pairing request sender=${directUserId} name=${sender?.name ?? "unknown"} (${allowMatchMeta})`,
            );
            try {
              await sendMessageSlack(
                message.channel,
                buildPairingReply({
                  channel: "slack",
                  idLine: `Your Slack user id: ${directUserId}`,
                  code,
                }),
                { token: ctx.botToken, client: ctx.app.client, accountId: account.accountId },
              );
            } catch (err) {
              logVerbose(`slack pairing reply failed for ${message.user}: ${String(err)}`);
            }
          }
        } else {
          logVerbose(
            `Blocked unauthorized slack sender ${message.user} (dmPolicy=${ctx.dmPolicy}, ${allowMatchMeta})`,
          );
        }
        return false;
      }
    }
  }
  return true;
}
