
import { type RuntimeEnv } from "../../runtime.js";
import { type OutboundSendDeps } from "../outbound/deliver.js";
import { type ChannelHeartbeatDeps } from "../../channels/plugins/types.js";
import { type AgentDefaultsConfig } from "../../config/types.agent-defaults.js";

export type HeartbeatDeps = OutboundSendDeps &
    ChannelHeartbeatDeps & {
        runtime?: RuntimeEnv;
        getQueueSize?: (lane?: string) => number;
        nowMs?: () => number;
    };

export type HeartbeatConfig = AgentDefaultsConfig["heartbeat"];

export type HeartbeatAgent = {
    agentId: string;
    heartbeat?: HeartbeatConfig;
};

export type HeartbeatSummary = {
    enabled: boolean;
    every: string;
    everyMs: number | null;
    prompt: string;
    target: string;
    model?: string;
    ackMaxChars: number;
};

export type HeartbeatAgentState = {
    agentId: string;
    heartbeat?: HeartbeatConfig;
    intervalMs: number;
    lastRunMs?: number;
    nextDueMs: number;
};

export type HeartbeatRunner = {
    stop: () => void;
    updateConfig: (cfg: any) => void;
};
