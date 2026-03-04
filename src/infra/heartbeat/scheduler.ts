
import { loadConfig, type ZEROConfig } from "../../config/config.js";
import { defaultRuntime, type RuntimeEnv } from "../../runtime.js";
import { requestHeartbeatNow, setHeartbeatWakeHandler } from "../heartbeat-wake.js";
import { type HeartbeatAgentState, type HeartbeatRunner } from "./types.js";
import {
    resolveHeartbeatAgents,
    resolveHeartbeatIntervalMs,
} from "./config-utils.js";
import { runHeartbeatOnce } from "./run-once.js";

export function startHeartbeatRunner(opts: {
    cfg?: ZEROConfig;
    runtime?: RuntimeEnv;
    abortSignal?: AbortSignal;
    runOnce?: typeof runHeartbeatOnce;
}): HeartbeatRunner {
    const runtime = opts.runtime ?? defaultRuntime;
    const runOnce = opts.runOnce ?? runHeartbeatOnce;
    const state = {
        cfg: opts.cfg ?? loadConfig(),
        runtime,
        agents: new Map<string, HeartbeatAgentState>(),
        timer: null as NodeJS.Timeout | null,
        stopped: false,
    };
    let initialized = false;

    const resolveNextDue = (now: number, intervalMs: number, prevState?: HeartbeatAgentState) => {
        if (typeof prevState?.lastRunMs === "number") {
            return prevState.lastRunMs + intervalMs;
        }
        if (prevState && prevState.intervalMs === intervalMs && prevState.nextDueMs > now) {
            return prevState.nextDueMs;
        }
        return now + intervalMs;
    };

    const scheduleNext = () => {
        if (state.stopped) return;
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }
        if (state.agents.size === 0) return;
        const now = Date.now();
        let nextDue = Number.POSITIVE_INFINITY;
        for (const agent of state.agents.values()) {
            if (agent.nextDueMs < nextDue) nextDue = agent.nextDueMs;
        }
        if (!Number.isFinite(nextDue)) return;
        const delay = Math.max(0, nextDue - now);
        state.timer = setTimeout(() => {
            requestHeartbeatNow({ reason: "interval", coalesceMs: 0 });
        }, delay);
        state.timer.unref?.();
    };

    const updateConfig = (cfg: ZEROConfig) => {
        state.cfg = cfg;
        const now = Date.now();
        const nextAgents = new Map<string, HeartbeatAgentState>();
        const heartbeatAgents = resolveHeartbeatAgents(cfg);
        for (const agent of heartbeatAgents) {
            const intervalMs = resolveHeartbeatIntervalMs(cfg, undefined, agent.heartbeat);
            if (!intervalMs) continue;
            const prev = state.agents.get(agent.agentId);
            const nextDueMs = resolveNextDue(now, intervalMs, prev);
            nextAgents.set(agent.agentId, {
                ...agent,
                intervalMs,
                lastRunMs: prev?.lastRunMs,
                nextDueMs,
            });
        }
        state.agents = nextAgents;
        if (initialized) scheduleNext();
    };

    const tick = async (params: { reason?: string }) => {
        if (state.stopped) return;
        const now = Date.now();
        const due = Array.from(state.agents.values()).filter((a) => a.nextDueMs <= now);
        if (due.length === 0 && params.reason === "interval") {
            scheduleNext();
            return;
        }

        const agentsToRun = params.reason === "interval" ? due : Array.from(state.agents.values());
        for (const agentState of agentsToRun) {
            if (state.stopped) break;
            await runOnce({
                cfg: state.cfg,
                agentId: agentState.agentId,
                heartbeat: agentState.heartbeat,
                reason: params.reason,
            });
            const current = state.agents.get(agentState.agentId);
            if (current) {
                const lastRunMs = Date.now();
                state.agents.set(agentState.agentId, {
                    ...current,
                    lastRunMs,
                    nextDueMs: lastRunMs + current.intervalMs,
                });
            }
        }
        scheduleNext();
    };

    const wakeHandler = async (params: { reason?: string }) => {
        try {
            await tick(params);
            return { status: "ran", durationMs: 0 } as const;
        } catch (err) {
            if (!state.stopped) scheduleNext();
            return { status: "failed", reason: String(err) } as const;
        }
    };

    setHeartbeatWakeHandler(wakeHandler);

    updateConfig(state.cfg);
    initialized = true;
    scheduleNext();

    if (opts.abortSignal) {
        opts.abortSignal.addEventListener("abort", () => {
            state.stopped = true;
            if (state.timer) {
                clearTimeout(state.timer);
                state.timer = null;
            }
        });
    }

    return {
        stop: () => {
            state.stopped = true;
            if (state.timer) {
                clearTimeout(state.timer);
                state.timer = null;
            }
        },
        updateConfig,
    };
}
