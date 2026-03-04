
import { type ZEROConfig } from "../../../config/config.js";
import { type ChannelId } from "../../../channels/plugins/types.js";
import { type ResolvedMessagingTarget } from "../target-resolver.js";
import { type RoutePeer } from "../../../routing/resolve-route.js";

export interface OutboundSessionRoute {
    sessionKey: string;
    baseSessionKey: string;
    peer: RoutePeer;
    chatType: "direct" | "group" | "channel";
    from: string;
    to: string;
    threadId?: string | number;
}

export interface ResolveOutboundSessionRouteParams {
    cfg: ZEROConfig;
    channel: ChannelId;
    agentId: string;
    accountId?: string | null;
    target: string;
    resolvedTarget?: ResolvedMessagingTarget;
    replyToId?: string | null;
    threadId?: string | number | null;
}
