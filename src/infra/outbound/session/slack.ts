
import { type OutboundSessionRoute, type ResolveOutboundSessionRouteParams } from "./types.js";


export async function resolveSlackSession(
    params: ResolveOutboundSessionRouteParams,
): Promise<OutboundSessionRoute | null> {
    const { cfg, agentId, channel, target } = params;
    const peerId = target.startsWith("slack:") ? target.slice(6) : (target.startsWith("channel:") ? target.slice(8) : target);

    // Check if channel should be treated as a group (mpim)
    const isGroup = cfg.channels?.slack?.dm?.groupChannels?.includes(peerId);
    const peerKind = isGroup ? "group" : "channel";

    const peer = { id: peerId, kind: peerKind as any };
    const baseSessionKey = `agent:${agentId}:${channel}:${peerKind}:${peerId.toLowerCase()}`;

    return {
        sessionKey: params.threadId ? `${baseSessionKey}:thread:${params.threadId}` : baseSessionKey,
        baseSessionKey,
        peer,
        chatType: isGroup ? "group" : "channel",
        from: `slack:${peerKind}:${peerId}`,
        to: `slack:${peerId}`,
        threadId: params.threadId || undefined,
    };
}
