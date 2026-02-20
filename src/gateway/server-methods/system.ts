import { resolveMainSessionKeyFromConfig } from "../../config/sessions.js";
import { getLastHeartbeatEvent } from "../../infra/heartbeat-events.js";
import { setHeartbeatsEnabled } from "../../infra/heartbeat-runner.js";
import { enqueueSystemEvent, isSystemEventContextChanged } from "../../infra/system-events.js";
import { listSystemPresence, updateSystemPresence } from "../../infra/system-presence.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";
import { readConfigFileSnapshot, writeConfigFile } from "../../config/config.js";
import { runSmartScan } from "../../commands/smart-scan.js";

export const systemHandlers: GatewayRequestHandlers = {
  "last-heartbeat": ({ respond }) => {
    respond(true, getLastHeartbeatEvent(), undefined);
  },
  "set-heartbeats": ({ params, respond }) => {
    const enabled = params.enabled;
    if (typeof enabled !== "boolean") {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          "invalid set-heartbeats params: enabled (boolean) required",
        ),
      );
      return;
    }
    setHeartbeatsEnabled(enabled);
    respond(true, { ok: true, enabled }, undefined);
  },
  "system-presence": ({ respond }) => {
    const presence = listSystemPresence();
    respond(true, presence, undefined);
  },
  "system-event": ({ params, respond, context }) => {
    const text = typeof params.text === "string" ? params.text.trim() : "";
    if (!text) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "text required"));
      return;
    }
    const sessionKey = resolveMainSessionKeyFromConfig();
    const deviceId = typeof params.deviceId === "string" ? params.deviceId : undefined;
    const instanceId = typeof params.instanceId === "string" ? params.instanceId : undefined;
    const host = typeof params.host === "string" ? params.host : undefined;
    const ip = typeof params.ip === "string" ? params.ip : undefined;
    const mode = typeof params.mode === "string" ? params.mode : undefined;
    const version = typeof params.version === "string" ? params.version : undefined;
    const platform = typeof params.platform === "string" ? params.platform : undefined;
    const deviceFamily = typeof params.deviceFamily === "string" ? params.deviceFamily : undefined;
    const modelIdentifier =
      typeof params.modelIdentifier === "string" ? params.modelIdentifier : undefined;
    const lastInputSeconds =
      typeof params.lastInputSeconds === "number" && Number.isFinite(params.lastInputSeconds)
        ? params.lastInputSeconds
        : undefined;
    const reason = typeof params.reason === "string" ? params.reason : undefined;
    const roles =
      Array.isArray(params.roles) && params.roles.every((t) => typeof t === "string")
        ? (params.roles as string[])
        : undefined;
    const scopes =
      Array.isArray(params.scopes) && params.scopes.every((t) => typeof t === "string")
        ? (params.scopes as string[])
        : undefined;
    const tags =
      Array.isArray(params.tags) && params.tags.every((t) => typeof t === "string")
        ? (params.tags as string[])
        : undefined;
    const presenceUpdate = updateSystemPresence({
      text,
      deviceId,
      instanceId,
      host,
      ip,
      mode,
      version,
      platform,
      deviceFamily,
      modelIdentifier,
      lastInputSeconds,
      reason,
      roles,
      scopes,
      tags,
    });
    const isNodePresenceLine = text.startsWith("Node:");
    if (isNodePresenceLine) {
      const next = presenceUpdate.next;
      const changed = new Set(presenceUpdate.changedKeys);
      const reasonValue = next.reason ?? reason;
      const normalizedReason = (reasonValue ?? "").toLowerCase();
      const ignoreReason =
        normalizedReason.startsWith("periodic") || normalizedReason === "heartbeat";
      const hostChanged = changed.has("host");
      const ipChanged = changed.has("ip");
      const versionChanged = changed.has("version");
      const modeChanged = changed.has("mode");
      const reasonChanged = changed.has("reason") && !ignoreReason;
      const hasChanges = hostChanged || ipChanged || versionChanged || modeChanged || reasonChanged;
      if (hasChanges) {
        const contextChanged = isSystemEventContextChanged(sessionKey, presenceUpdate.key);
        const parts: string[] = [];
        if (contextChanged || hostChanged || ipChanged) {
          const hostLabel = next.host?.trim() || "Unknown";
          const ipLabel = next.ip?.trim();
          parts.push(`Node: ${hostLabel}${ipLabel ? ` (${ipLabel})` : ""}`);
        }
        if (versionChanged) {
          parts.push(`app ${next.version?.trim() || "unknown"}`);
        }
        if (modeChanged) {
          parts.push(`mode ${next.mode?.trim() || "unknown"}`);
        }
        if (reasonChanged) {
          parts.push(`reason ${reasonValue?.trim() || "event"}`);
        }
        const deltaText = parts.join(" · ");
        if (deltaText) {
          enqueueSystemEvent(deltaText, {
            sessionKey,
            contextKey: presenceUpdate.key,
          });
        }
      }
    } else {
      enqueueSystemEvent(text, { sessionKey });
    }
    const nextPresenceVersion = context.incrementPresenceVersion();
    context.broadcast(
      "presence",
      { presence: listSystemPresence() },
      {
        dropIfSlow: true,
        stateVersion: {
          presence: nextPresenceVersion,
          health: context.getHealthVersion(),
        },
      },
    );
    respond(true, { ok: true }, undefined);
  },
  "system.panic": async ({ respond, context }) => {
    const abortedCount = context.chatAbortControllers.size;
    const runIds = Array.from(context.chatAbortControllers.keys());

    // Broadcast panic to all clients early to show immediate feedback
    context.broadcast("system.panic", {
      timestamp: Date.now(),
      reason: "Emergency stop triggered by operator",
      abortedCount,
    });

    // Abort all active chat runs globally
    for (const runId of runIds) {
      const active = context.chatAbortControllers.get(runId);
      if (!active) continue;

      try {
        active.controller.abort();
      } catch {
        // Ignore abort errors
      }

      context.chatAbortedRuns.set(runId, Date.now());
      context.chatAbortControllers.delete(runId);
      context.chatRunBuffers.delete(runId);
      context.chatDeltaSentAt.delete(runId);

      // Attempt to remove from registry. Keys might vary but often runId = sessionId in simple cases
      // or we use the fields from the active entry.
      context.removeChatRun(active.sessionId, runId, active.sessionKey);

      // Notify the specific session
      const payload = {
        runId,
        sessionKey: active.sessionKey,
        seq: (context.agentRunSeq.get(runId) ?? 0) + 1,
        state: "aborted" as const,
        stopReason: "EMERGENCY PANIC",
      };
      context.broadcast("chat", payload);
      context.nodeSendToSession(active.sessionKey, "chat", payload);
    }

    // Log emergency event
    const sessionKey = resolveMainSessionKeyFromConfig();
    enqueueSystemEvent("EMERGENCY STOP: All operations halted by operator.", { sessionKey });

    respond(true, { ok: true, abortedCount }, undefined);
  },
  "system.smartScan": async ({ respond }) => {
    try {
      const snapshot = await readConfigFileSnapshot();
      const recommendations = await runSmartScan(snapshot.config);
      respond(true, { recommendations }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
  "system.applyRecommendations": async ({ params, respond }) => {
    try {
      const recommendations = params.recommendations as any[];
      if (!Array.isArray(recommendations)) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "recommendations array required"),
        );
        return;
      }

      const snapshot = await readConfigFileSnapshot();
      let nextConfig = { ...snapshot.config };

      for (const r of recommendations) {
        if (r.id === "enable_sandbox") {
          nextConfig.tools = {
            ...nextConfig.tools,
            exec: { ...nextConfig.tools?.exec, host: "sandbox" },
          };
          nextConfig.agents = {
            ...nextConfig.agents,
            defaults: {
              ...nextConfig.agents?.defaults,
              sandbox: { ...nextConfig.agents?.defaults?.sandbox, mode: "all" },
            },
          };
        } else if (r.id === "high_perf_model") {
          nextConfig.agents = {
            ...nextConfig.agents,
            defaults: {
              ...nextConfig.agents?.defaults,
              model: { ...nextConfig.agents?.defaults?.model, primary: r.recommendedValue },
            },
          };
        } else if (r.id === "macos_daemon") {
          nextConfig.gateway = { ...nextConfig.gateway, mode: "local" };
        }
      }

      await writeConfigFile(nextConfig);
      respond(true, { ok: true }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
  "system.applyPersona": async ({ params, respond }) => {
    try {
      const personaId = params.personaId as string;
      const snapshot = await readConfigFileSnapshot();
      let nextConfig = { ...snapshot.config };

      if (personaId === "analista") {
        nextConfig.ui = { ...nextConfig.ui, assistant: { name: "Analista", avatar: "👨‍💻" } };
        nextConfig.env = { ...nextConfig.env, shellEnv: { enabled: true } };
      } else if (personaId === "escudeiro") {
        nextConfig.ui = { ...nextConfig.ui, assistant: { name: "Escudeiro", avatar: "🛡️" } };
        nextConfig.cron = { ...nextConfig.cron, enabled: true };
      } else if (personaId === "explorador") {
        nextConfig.ui = { ...nextConfig.ui, assistant: { name: "Explorador", avatar: "🧭" } };
        nextConfig.browser = { ...nextConfig.browser, enabled: true };
      }

      await writeConfigFile(nextConfig);
      respond(true, { ok: true }, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, String(err)));
    }
  },
};
