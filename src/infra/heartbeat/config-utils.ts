
import {
    resolveAgentConfig,
    resolveDefaultAgentId,
} from "../../agents/agent-scope.js";
import {
    DEFAULT_HEARTBEAT_ACK_MAX_CHARS,
    DEFAULT_HEARTBEAT_EVERY,
    resolveHeartbeatPrompt as resolveHeartbeatPromptText,
} from "../../auto-reply/heartbeat.js";
import { parseDurationMs } from "../../cli/parse-duration.js";
import { type ZEROConfig } from "../../config/config.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { DEFAULT_HEARTBEAT_TARGET } from "./constants.js";
import { type HeartbeatConfig, type HeartbeatSummary, type HeartbeatAgent } from "./types.js";

export function hasExplicitHeartbeatAgents(cfg: ZEROConfig) {
    const list = cfg.agents?.list ?? [];
    return list.some((entry) => Boolean(entry?.heartbeat));
}

export function isHeartbeatEnabledForAgent(cfg: ZEROConfig, agentId?: string): boolean {
    const resolvedAgentId = normalizeAgentId(agentId ?? resolveDefaultAgentId(cfg));
    const list = cfg.agents?.list ?? [];
    const hasExplicit = hasExplicitHeartbeatAgents(cfg);
    if (hasExplicit) {
        return list.some(
            (entry) => Boolean(entry?.heartbeat) && normalizeAgentId(entry?.id) === resolvedAgentId,
        );
    }
    return resolvedAgentId === resolveDefaultAgentId(cfg);
}

export function resolveHeartbeatConfig(cfg: ZEROConfig, agentId?: string): HeartbeatConfig | undefined {
    const defaults = cfg.agents?.defaults?.heartbeat;
    if (!agentId) return defaults;
    const overrides = resolveAgentConfig(cfg, agentId)?.heartbeat;
    if (!defaults && !overrides) return overrides;
    return { ...defaults, ...overrides };
}

export function resolveHeartbeatIntervalMs(
    cfg: ZEROConfig,
    overrideEvery?: string,
    heartbeat?: HeartbeatConfig,
) {
    const raw =
        overrideEvery ??
        heartbeat?.every ??
        cfg.agents?.defaults?.heartbeat?.every ??
        DEFAULT_HEARTBEAT_EVERY;
    if (!raw) return null;
    const trimmed = String(raw).trim();
    if (!trimmed) return null;
    let ms: number;
    try {
        ms = parseDurationMs(trimmed, { defaultUnit: "m" });
    } catch {
        return null;
    }
    if (ms <= 0) return null;
    return ms;
}

export function resolveHeartbeatSummaryForAgent(
    cfg: ZEROConfig,
    agentId?: string,
): HeartbeatSummary {
    const defaults = cfg.agents?.defaults?.heartbeat;
    const overrides = agentId ? resolveAgentConfig(cfg, agentId)?.heartbeat : undefined;
    const enabled = isHeartbeatEnabledForAgent(cfg, agentId);

    if (!enabled) {
        return {
            enabled: false,
            every: "disabled",
            everyMs: null,
            prompt: resolveHeartbeatPromptText(defaults?.prompt),
            target: defaults?.target ?? DEFAULT_HEARTBEAT_TARGET,
            model: defaults?.model,
            ackMaxChars: Math.max(0, defaults?.ackMaxChars ?? DEFAULT_HEARTBEAT_ACK_MAX_CHARS),
        };
    }

    const merged = defaults || overrides ? { ...defaults, ...overrides } : undefined;
    const every = merged?.every ?? defaults?.every ?? overrides?.every ?? DEFAULT_HEARTBEAT_EVERY;
    const everyMs = resolveHeartbeatIntervalMs(cfg, undefined, merged);
    const prompt = resolveHeartbeatPromptText(
        merged?.prompt ?? defaults?.prompt ?? overrides?.prompt,
    );
    const target =
        merged?.target ?? defaults?.target ?? overrides?.target ?? DEFAULT_HEARTBEAT_TARGET;
    const model = merged?.model ?? defaults?.model ?? overrides?.model;
    const ackMaxChars = Math.max(
        0,
        merged?.ackMaxChars ??
        defaults?.ackMaxChars ??
        overrides?.ackMaxChars ??
        DEFAULT_HEARTBEAT_ACK_MAX_CHARS,
    );

    return {
        enabled: true,
        every,
        everyMs,
        prompt,
        target,
        model,
        ackMaxChars,
    };
}

export function resolveHeartbeatAgents(cfg: ZEROConfig): HeartbeatAgent[] {
    const list = cfg.agents?.list ?? [];
    if (hasExplicitHeartbeatAgents(cfg)) {
        return list
            .filter((entry) => entry?.heartbeat)
            .map((entry) => {
                const id = normalizeAgentId(entry.id);
                return { agentId: id, heartbeat: resolveHeartbeatConfig(cfg, id) };
            })
            .filter((entry) => entry.agentId);
    }
    const fallbackId = resolveDefaultAgentId(cfg);
    return [{ agentId: fallbackId, heartbeat: resolveHeartbeatConfig(cfg, fallbackId) }];
}

export function resolveHeartbeatPrompt(cfg: ZEROConfig, heartbeat?: HeartbeatConfig) {
    return resolveHeartbeatPromptText(heartbeat?.prompt ?? cfg.agents?.defaults?.heartbeat?.prompt);
}

export function resolveHeartbeatAckMaxChars(cfg: ZEROConfig, heartbeat?: HeartbeatConfig) {
    return Math.max(
        0,
        heartbeat?.ackMaxChars ??
        cfg.agents?.defaults?.heartbeat?.ackMaxChars ??
        DEFAULT_HEARTBEAT_ACK_MAX_CHARS,
    );
}
