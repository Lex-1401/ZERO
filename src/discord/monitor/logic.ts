import { ChannelType } from "@buape/carbon";
import { isDiscordGroupAllowedByPolicy } from "./allow-list.js";

export type DiscordAccessContext = {
  author: { id: string; username: string; bot?: boolean; globalName?: string | null };
  channelInfo: { type: ChannelType; id?: string } | null;
  guildId?: string;
  isGroupDm: boolean;
  isDirectMessage: boolean;
};

export type DiscordAccessParams = {
  dmEnabled: boolean;
  groupDmEnabled: boolean;
  dmPolicy: "disabled" | "open" | "pairing" | "allowlist" | (string & {});
  groupPolicy: "disabled" | "open" | "allowlist" | (string & {});
  guildInfo: any;
  guildEntriesCount: number;
  channelConfig: any;
  channelAllowlistConfigured: boolean;
  channelAllowed: boolean;
};

/**
 * @MasterTier: Decoupled decision logic for Discord access.
 * Returns the "Judgment" without performing any side-effects.
 */
export function evaluateDiscordAccess(context: DiscordAccessContext, params: DiscordAccessParams) {
  const { isGroupDm, isDirectMessage } = context;
  const {
    dmEnabled,
    groupDmEnabled,
    dmPolicy,
    groupPolicy,
    guildInfo,
    guildEntriesCount,
    channelConfig,
    channelAllowlistConfigured,
    channelAllowed,
  } = params;

  // 1. Basic Bot/DM/GroupDM Gating
  if (isGroupDm && !groupDmEnabled) return { allowed: false, reason: "group-dms-disabled" };
  if (isDirectMessage && !dmEnabled) return { allowed: false, reason: "dms-disabled" };

  // 2. DM Policy Logic
  if (isDirectMessage) {
    if (dmPolicy === "disabled") return { allowed: false, reason: "dm-policy-disabled" };
    if (dmPolicy === "pairing") return { allowed: false, reason: "pairing" };
  }

  // 3. Guild/Channel Gating
  const isGuildMessage = Boolean(context.guildId);
  if (isGuildMessage) {
    if (guildInfo == null && guildEntriesCount > 0) {
      return { allowed: false, reason: "guild-not-in-allowlist" };
    }

    if (channelConfig?.enabled === false) {
      return { allowed: false, reason: "channel-disabled" };
    }

    if (
      !isDiscordGroupAllowedByPolicy({
        groupPolicy: groupPolicy as any,
        guildAllowlisted: Boolean(guildInfo),
        channelAllowlistConfigured,
        channelAllowed,
      })
    ) {
      return { allowed: false, reason: "group-policy-violation" };
    }

    if (channelConfig?.allowed === false) {
      return { allowed: false, reason: "channel-not-in-allowlist" };
    }
  }

  return { allowed: true };
}
