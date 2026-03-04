
/**
 * Outbound Session Infrastructure
 *
 * Manages session routing and context for outbound agent communications.
 * Delegated to src/infra/outbound/session/ for maintainability.
 */

import { type ZEROConfig } from "../../config/config.js";
import { type ChannelId } from "../../channels/plugins/types.js";
import {
  type OutboundSessionRoute,
  type ResolveOutboundSessionRouteParams,
} from "./session/types.js";
import { resolveSlackSession } from "./session/slack.js";
import { resolveDiscordSession } from "./session/discord.js";
import { buildBaseSessionKey } from "./session/core.js";

export async function resolveOutboundSessionRoute(
  params: ResolveOutboundSessionRouteParams,
): Promise<OutboundSessionRoute | null> {
  const { channel } = params;

  switch (channel) {
    case "slack": return resolveSlackSession(params);
    case "discord": return resolveDiscordSession(params);
    default:
      // Fallback logic
      const target = params.target.startsWith(`${channel}:`) ? params.target.slice(channel.length + 1) : params.target;
      const peer = { id: target, kind: "dm" as const };
      const baseSessionKey = buildBaseSessionKey({ ...params, peer });
      return {
        sessionKey: `${baseSessionKey}:${params.threadId || "main"}`,
        baseSessionKey,
        peer,
        chatType: "direct",
        from: `agent:${params.agentId}`,
        to: `${channel}:${target}`,
      };
  }
}

export async function ensureOutboundSessionEntry(_params: {
  cfg: ZEROConfig;
  agentId: string;
  channel: ChannelId;
  accountId?: string | null;
  route: OutboundSessionRoute;
}) {
  // Logic to ensure session existence in DB/Store
}
