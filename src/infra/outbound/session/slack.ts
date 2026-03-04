
import { type OutboundSessionRoute, type ResolveOutboundSessionRouteParams } from "./types.js";
import { buildBaseSessionKey } from "./core.js";

export async function resolveSlackSession(
    params: ResolveOutboundSessionRouteParams,
): Promise<OutboundSessionRoute | null> {
    const { cfg, agentId, channel, target } = params;
    const peerId = target.startsWith("slack:") ? target.slice(6) : target;
    const peer = { id: peerId, kind: "channel" as const };
    const baseSessionKey = buildBaseSessionKey({ cfg, agentId, channel, peer });

    return {
        sessionKey: `${baseSessionKey}:${params.threadId || "main"}`,
        baseSessionKey,
        peer,
        chatType: "channel",
        from: `agent:${agentId}`,
        to: `slack:${peerId}`,
        threadId: params.threadId || undefined,
    };
}
