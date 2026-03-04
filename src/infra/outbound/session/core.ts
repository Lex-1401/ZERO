
import { type ZEROConfig } from "../../../config/config.js";
import { type ChannelId } from "../../../channels/plugins/types.js";
import { type RoutePeer, type RoutePeerKind } from "../../../routing/resolve-route.js";


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string): boolean {
    return UUID_RE.test(value);
}

export function normalizeThreadId(value?: string | number | null): string | undefined {
    if (value == null) return undefined;
    return String(value);
}

export function stripProviderPrefix(raw: string, channel: string): string {
    const prefix = `${channel}:`;
    return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
}

export function buildBaseSessionKey(params: {
    cfg: ZEROConfig;
    agentId: string;
    channel: ChannelId;
    peer: RoutePeer;
}): string {
    return `agent:${params.agentId}:${params.channel}:${params.peer.id}`;
}

export function inferPeerKind(params: {
    channel: ChannelId;
    resolvedTarget?: any;
}): RoutePeerKind {
    if (params.resolvedTarget?.kind) return params.resolvedTarget.kind;
    if (params.channel === "slack") return "channel";
    if (params.channel === "discord") return "channel";
    return "dm";
}
