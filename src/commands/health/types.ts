
export interface ChannelAccountHealthSummary {
    accountId: string;
    configured?: boolean;
    linked?: boolean;
    authAgeMs?: number | null;
    probe?: unknown;
    lastProbeAt?: number | null;
}

export interface ChannelHealthSummary {
    accounts?: Record<string, ChannelAccountHealthSummary>;
}

export interface HealthSummary {
    ok: true;
    ts: number;
    durationMs: number;
    channels: Record<string, ChannelHealthSummary>;
    channelOrder: string[];
    channelLabels: Record<string, string>;
    heartbeatSeconds: number;
    defaultAgentId: string;
}
