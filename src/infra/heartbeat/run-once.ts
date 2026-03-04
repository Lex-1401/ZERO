
import fs from "node:fs/promises";
import path from "node:path";
import {
    resolveAgentWorkspaceDir,
    resolveDefaultAgentId,
} from "../../agents/agent-scope.js";
import { resolveEffectiveMessagesConfig } from "../../agents/identity.js";
import { DEFAULT_HEARTBEAT_FILENAME } from "../../agents/workspace.js";
import {
    isHeartbeatContentEffectivelyEmpty,
} from "../../auto-reply/heartbeat.js";
import { HEARTBEAT_TOKEN } from "../../auto-reply/tokens.js";
import { getReplyFromConfig } from "../../auto-reply/reply.js";
import { getChannelPlugin } from "../../channels/plugins/index.js";
import { loadConfig, type ZEROConfig } from "../../config/config.js";
import {
    loadSessionStore,
    saveSessionStore,
} from "../../config/sessions.js";
import { formatErrorMessage } from "../../infra/errors.js";
import { peekSystemEvents } from "../../infra/system-events.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { getQueueSize } from "../../process/command-queue.js";
import { CommandLane } from "../../process/lanes.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { emitHeartbeatEvent, resolveIndicatorType } from "../heartbeat-events.js";
import { resolveHeartbeatVisibility } from "../heartbeat-visibility.js";
import {
    type HeartbeatRunResult,
} from "../heartbeat-wake.js";
import { deliverOutboundPayloads } from "../outbound/deliver.js";
import {
    resolveHeartbeatDeliveryTarget,
    resolveHeartbeatSenderContext,
} from "../outbound/targets.js";
import { EXEC_EVENT_PROMPT } from "./constants.js";
import { isWithinActiveHours } from "./hours.js";
import {
    isHeartbeatEnabledForAgent,
    resolveHeartbeatConfig,
    resolveHeartbeatIntervalMs,
    resolveHeartbeatPrompt,
    resolveHeartbeatAckMaxChars,
} from "./config-utils.js";
import {
    resolveHeartbeatSession,
    resolveHeartbeatReplyPayload,
    resolveHeartbeatReasoningPayloads,
    restoreHeartbeatUpdatedAt,
    normalizeHeartbeatReply,
} from "./session-utils.js";
import { type HeartbeatDeps, type HeartbeatConfig } from "./types.js";

const log = createSubsystemLogger("gateway/heartbeat");
let heartbeatsEnabled = true;

export function setHeartbeatsEnabled(enabled: boolean) {
    heartbeatsEnabled = enabled;
}

export async function runHeartbeatOnce(opts: {
    cfg?: ZEROConfig;
    agentId?: string;
    heartbeat?: HeartbeatConfig;
    reason?: string;
    deps?: HeartbeatDeps;
}): Promise<HeartbeatRunResult> {
    const cfg = opts.cfg ?? loadConfig();
    const agentId = normalizeAgentId(opts.agentId ?? resolveDefaultAgentId(cfg));
    const heartbeat = opts.heartbeat ?? resolveHeartbeatConfig(cfg, agentId);
    if (!heartbeatsEnabled) {
        return { status: "skipped", reason: "disabled" };
    }
    if (!isHeartbeatEnabledForAgent(cfg, agentId)) {
        return { status: "skipped", reason: "disabled" };
    }
    if (!resolveHeartbeatIntervalMs(cfg, undefined, heartbeat)) {
        return { status: "skipped", reason: "disabled" };
    }

    const startedAt = opts.deps?.nowMs?.() ?? Date.now();
    if (!isWithinActiveHours(cfg, heartbeat, startedAt)) {
        return { status: "skipped", reason: "quiet-hours" };
    }

    const queueSize = (opts.deps?.getQueueSize ?? getQueueSize)(CommandLane.Main);
    if (queueSize > 0) {
        return { status: "skipped", reason: "requests-in-flight" };
    }

    const isExecEventReason = opts.reason === "exec-event";
    const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
    const heartbeatFilePath = path.join(workspaceDir, DEFAULT_HEARTBEAT_FILENAME);
    try {
        const heartbeatFileContent = await fs.readFile(heartbeatFilePath, "utf-8");
        if (isHeartbeatContentEffectivelyEmpty(heartbeatFileContent) && !isExecEventReason) {
            emitHeartbeatEvent({
                status: "skipped",
                reason: "empty-heartbeat-file",
                durationMs: Date.now() - startedAt,
            });
            return { status: "skipped", reason: "empty-heartbeat-file" };
        }
    } catch {
    }

    const { entry, sessionKey, storePath } = resolveHeartbeatSession(cfg, agentId, heartbeat);
    const previousUpdatedAt = entry?.updatedAt;
    const delivery = resolveHeartbeatDeliveryTarget({ cfg, entry, heartbeat });
    const visibility =
        delivery.channel !== "none"
            ? resolveHeartbeatVisibility({
                cfg,
                channel: delivery.channel,
                accountId: delivery.accountId,
            })
            : { showOk: false, showAlerts: true, useIndicator: true };
    const { sender } = resolveHeartbeatSenderContext({ cfg, entry, delivery });
    const responsePrefix = resolveEffectiveMessagesConfig(cfg, agentId).responsePrefix;

    const isExecEvent = opts.reason === "exec-event";
    const pendingEvents = isExecEvent ? peekSystemEvents(sessionKey) : [];
    const hasExecCompletion = pendingEvents.some((evt) => evt.includes("Exec finished"));

    const prompt = hasExecCompletion ? EXEC_EVENT_PROMPT : resolveHeartbeatPrompt(cfg, heartbeat);
    const ctx = {
        Body: prompt,
        From: sender,
        To: sender,
        Provider: hasExecCompletion ? "exec-event" : "heartbeat",
        SessionKey: sessionKey,
    };
    if (!visibility.showAlerts && !visibility.showOk && !visibility.useIndicator) {
        emitHeartbeatEvent({
            status: "skipped",
            reason: "alerts-disabled",
            durationMs: Date.now() - startedAt,
            channel: delivery.channel !== "none" ? delivery.channel : undefined,
        });
        return { status: "skipped", reason: "alerts-disabled" };
    }

    const heartbeatOkText = responsePrefix ? `${responsePrefix} ${HEARTBEAT_TOKEN}` : HEARTBEAT_TOKEN;
    const canAttemptHeartbeatOk = Boolean(
        visibility.showOk && delivery.channel !== "none" && delivery.to,
    );
    const maybeSendHeartbeatOk = async () => {
        if (!canAttemptHeartbeatOk || delivery.channel === "none" || !delivery.to) return false;
        const heartbeatPlugin = getChannelPlugin(delivery.channel);
        if (heartbeatPlugin?.heartbeat?.checkReady) {
            const readiness = await heartbeatPlugin.heartbeat.checkReady({
                cfg,
                accountId: delivery.accountId,
                deps: opts.deps,
            });
            if (!readiness.ok) return false;
        }
        await deliverOutboundPayloads({
            cfg,
            channel: delivery.channel,
            to: delivery.to,
            accountId: delivery.accountId,
            payloads: [{ text: heartbeatOkText }],
            deps: opts.deps,
        });
        return true;
    };

    try {
        const replyResult = await getReplyFromConfig(ctx, { isHeartbeat: true }, cfg);
        const replyPayload = resolveHeartbeatReplyPayload(replyResult);
        const includeReasoning = heartbeat?.includeReasoning === true;
        const reasoningPayloads = includeReasoning
            ? resolveHeartbeatReasoningPayloads(replyResult).filter((payload) => payload !== replyPayload)
            : [];

        if (
            !replyPayload ||
            (!replyPayload.text && !replyPayload.mediaUrl && !replyPayload.mediaUrls?.length)
        ) {
            await restoreHeartbeatUpdatedAt({
                storePath,
                sessionKey,
                updatedAt: previousUpdatedAt,
            });
            const okSent = await maybeSendHeartbeatOk();
            emitHeartbeatEvent({
                status: "ok-empty",
                reason: opts.reason,
                durationMs: Date.now() - startedAt,
                channel: delivery.channel !== "none" ? delivery.channel : undefined,
                silent: !okSent,
                indicatorType: visibility.useIndicator ? resolveIndicatorType("ok-empty") : undefined,
            });
            return { status: "ran", durationMs: Date.now() - startedAt };
        }

        const ackMaxChars = resolveHeartbeatAckMaxChars(cfg, heartbeat);
        const normalized = normalizeHeartbeatReply(replyPayload, responsePrefix, ackMaxChars);
        const execFallbackText =
            hasExecCompletion && !normalized.text.trim() && replyPayload.text?.trim()
                ? replyPayload.text.trim()
                : null;
        if (execFallbackText) {
            normalized.text = execFallbackText;
            normalized.shouldSkip = false;
        }
        const shouldSkipMain = normalized.shouldSkip && !normalized.hasMedia && !hasExecCompletion;
        if (shouldSkipMain && reasoningPayloads.length === 0) {
            await restoreHeartbeatUpdatedAt({
                storePath,
                sessionKey,
                updatedAt: previousUpdatedAt,
            });
            const okSent = await maybeSendHeartbeatOk();
            emitHeartbeatEvent({
                status: "ok-token",
                reason: opts.reason,
                durationMs: Date.now() - startedAt,
                channel: delivery.channel !== "none" ? delivery.channel : undefined,
                silent: !okSent,
                indicatorType: visibility.useIndicator ? resolveIndicatorType("ok-token") : undefined,
            });
            return { status: "ran", durationMs: Date.now() - startedAt };
        }

        const mediaUrls =
            replyPayload.mediaUrls ?? (replyPayload.mediaUrl ? [replyPayload.mediaUrl] : []);

        const prevHeartbeatText =
            typeof entry?.lastHeartbeatText === "string" ? entry.lastHeartbeatText : "";
        const prevHeartbeatAt =
            typeof entry?.lastHeartbeatSentAt === "number" ? entry.lastHeartbeatSentAt : undefined;
        const isDuplicateMain =
            !shouldSkipMain &&
            !mediaUrls.length &&
            Boolean(prevHeartbeatText.trim()) &&
            normalized.text.trim() === prevHeartbeatText.trim() &&
            typeof prevHeartbeatAt === "number" &&
            startedAt - prevHeartbeatAt < 24 * 60 * 60 * 1000;

        if (isDuplicateMain) {
            await restoreHeartbeatUpdatedAt({
                storePath,
                sessionKey,
                updatedAt: previousUpdatedAt,
            });
            emitHeartbeatEvent({
                status: "skipped",
                reason: "duplicate",
                preview: normalized.text.slice(0, 200),
                durationMs: Date.now() - startedAt,
                hasMedia: false,
                channel: delivery.channel !== "none" ? delivery.channel : undefined,
            });
            return { status: "ran", durationMs: Date.now() - startedAt };
        }

        const previewText = shouldSkipMain
            ? reasoningPayloads
                .map((payload) => payload.text)
                .filter((text): text is string => Boolean(text?.trim()))
                .join("\n")
            : normalized.text;

        if (delivery.channel === "none" || !delivery.to) {
            emitHeartbeatEvent({
                status: "skipped",
                reason: delivery.reason ?? "no-target",
                preview: previewText?.slice(0, 200),
                durationMs: Date.now() - startedAt,
                hasMedia: mediaUrls.length > 0,
            });
            return { status: "ran", durationMs: Date.now() - startedAt };
        }

        if (!visibility.showAlerts) {
            await restoreHeartbeatUpdatedAt({ storePath, sessionKey, updatedAt: previousUpdatedAt });
            emitHeartbeatEvent({
                status: "skipped",
                reason: "alerts-disabled",
                preview: previewText?.slice(0, 200),
                durationMs: Date.now() - startedAt,
                channel: delivery.channel,
                hasMedia: mediaUrls.length > 0,
                indicatorType: visibility.useIndicator ? resolveIndicatorType("sent") : undefined,
            });
            return { status: "ran", durationMs: Date.now() - startedAt };
        }

        const deliveryAccountId = delivery.accountId;
        const heartbeatPlugin = getChannelPlugin(delivery.channel);
        if (heartbeatPlugin?.heartbeat?.checkReady) {
            const readiness = await heartbeatPlugin.heartbeat.checkReady({
                cfg,
                accountId: deliveryAccountId,
                deps: opts.deps,
            });
            if (!readiness.ok) {
                emitHeartbeatEvent({
                    status: "skipped",
                    reason: readiness.reason,
                    preview: previewText?.slice(0, 200),
                    durationMs: Date.now() - startedAt,
                    hasMedia: mediaUrls.length > 0,
                    channel: delivery.channel,
                });
                log.info("heartbeat: channel not ready", {
                    channel: delivery.channel,
                    reason: readiness.reason,
                });
                return { status: "skipped", reason: readiness.reason };
            }
        }

        await deliverOutboundPayloads({
            cfg,
            channel: delivery.channel,
            to: delivery.to,
            accountId: deliveryAccountId,
            payloads: [
                ...reasoningPayloads,
                ...(shouldSkipMain
                    ? []
                    : [
                        {
                            text: normalized.text,
                            mediaUrls,
                        },
                    ]),
            ],
            deps: opts.deps,
        });

        if (!shouldSkipMain && normalized.text.trim()) {
            const store = loadSessionStore(storePath);
            const current = store[sessionKey];
            if (current) {
                store[sessionKey] = {
                    ...current,
                    lastHeartbeatText: normalized.text,
                    lastHeartbeatSentAt: startedAt,
                };
                await saveSessionStore(storePath, store);
            }
        }

        emitHeartbeatEvent({
            status: "sent",
            to: delivery.to,
            preview: previewText?.slice(0, 200),
            durationMs: Date.now() - startedAt,
            hasMedia: mediaUrls.length > 0,
            channel: delivery.channel,
            indicatorType: visibility.useIndicator ? resolveIndicatorType("sent") : undefined,
        });
        return { status: "ran", durationMs: Date.now() - startedAt };
    } catch (err) {
        const reason = formatErrorMessage(err);
        emitHeartbeatEvent({
            status: "failed",
            reason,
            durationMs: Date.now() - startedAt,
            channel: delivery.channel !== "none" ? delivery.channel : undefined,
            indicatorType: visibility.useIndicator ? resolveIndicatorType("failed") : undefined,
        });
        log.error(`heartbeat failed: ${reason}`, { error: reason });
        return { status: "failed", reason };
    }
}
