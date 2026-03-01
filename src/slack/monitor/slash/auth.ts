import { logVerbose } from "../../../globals.js";
import { formatAllowlistMatchMeta } from "../../../channels/allowlist-match.js";
import { buildPairingReply } from "../../../pairing/pairing-messages.js";
import { upsertChannelPairingRequest } from "../../../pairing/pairing-store.js";
import { resolveSlackAllowListMatch, resolveSlackUserAllowed } from "../allow-list.js";
import { isSlackChannelAllowedByPolicy } from "../policy.js";
import type { SlackMonitorContext } from "../context.js";
import type { SlackChannelConfigResolved } from "../channel-config.js";

export async function authorizeSlackSlash(params: {
  ctx: SlackMonitorContext;
  userId: string;
  senderName?: string;
  isDirectMessage: boolean;
  isRoom: boolean;
  channelId: string;
  channelName?: string;
  channelConfig: SlackChannelConfigResolved | null;
  effectiveAllowFromLower: string[];
  respond: (payload: any) => Promise<any>;
}): Promise<{ authorized: boolean; ownerAllowed: boolean }> {
  const {
    ctx,
    userId,
    senderName,
    isDirectMessage,
    isRoom,
    channelConfig,
    effectiveAllowFromLower,
    respond,
  } = params;

  if (isDirectMessage) {
    if (!ctx.dmEnabled || ctx.dmPolicy === "disabled") {
      await respond({ text: "Slack DMs are disabled.", response_type: "ephemeral" });
      return { authorized: false, ownerAllowed: false };
    }
    if (ctx.dmPolicy !== "open") {
      const allowMatch = resolveSlackAllowListMatch({
        allowList: effectiveAllowFromLower,
        id: userId,
        name: senderName,
      });
      const allowMatchMeta = formatAllowlistMatchMeta(allowMatch);
      if (!allowMatch.allowed) {
        if (ctx.dmPolicy === "pairing") {
          const { code, created } = await upsertChannelPairingRequest({
            channel: "slack",
            id: userId,
            meta: { name: senderName },
          });
          if (created) {
            logVerbose(
              `slack pairing request sender=${userId} name=${senderName ?? "unknown"} (${allowMatchMeta})`,
            );
            await respond({
              text: buildPairingReply({
                channel: "slack",
                idLine: `Your Slack user id: ${userId}`,
                code,
              }),
              response_type: "ephemeral",
            });
          }
        } else {
          logVerbose(
            `slack: blocked slash sender ${userId} (dmPolicy=${ctx.dmPolicy}, ${allowMatchMeta})`,
          );
          await respond({
            text: "You are not authorized to use this command.",
            response_type: "ephemeral",
          });
        }
        return { authorized: false, ownerAllowed: false };
      }
    }
  }

  if (isRoom) {
    if (ctx.useAccessGroups) {
      const channelAllowlistConfigured =
        Boolean(ctx.channelsConfig) && Object.keys(ctx.channelsConfig ?? {}).length > 0;
      const channelAllowed = channelConfig?.allowed !== false;
      const hasExplicitConfig = Boolean(channelConfig?.matchSource);
      if (
        !isSlackChannelAllowedByPolicy({
          groupPolicy: ctx.groupPolicy,
          channelAllowlistConfigured,
          channelAllowed,
        })
      ) {
        await respond({ text: "This channel is not allowed.", response_type: "ephemeral" });
        return { authorized: false, ownerAllowed: false };
      }
      if (!channelAllowed && (ctx.groupPolicy !== "open" || hasExplicitConfig)) {
        await respond({ text: "This channel is not allowed.", response_type: "ephemeral" });
        return { authorized: false, ownerAllowed: false };
      }
    }
    const channelUsersAllowlistConfigured =
      Array.isArray(channelConfig?.users) && channelConfig.users.length > 0;
    if (
      channelUsersAllowlistConfigured &&
      !resolveSlackUserAllowed({
        allowList: channelConfig?.users as string[],
        userId,
        userName: senderName || userId,
      })
    ) {
      await respond({
        text: "You are not authorized to use this command here.",
        response_type: "ephemeral",
      });
      return { authorized: false, ownerAllowed: false };
    }
  }

  const ownerAllowed = resolveSlackAllowListMatch({
    allowList: effectiveAllowFromLower,
    id: userId,
    name: senderName,
  }).allowed;
  return { authorized: true, ownerAllowed };
}
