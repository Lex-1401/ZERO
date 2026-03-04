/**
 * Agent Identity & Wait Handlers
 *
 * Extracted from agent.ts for Atomic Modularity compliance (< 500 lines).
 *
 * @module gateway/server-methods/agent-identity-wait
 */

import { loadConfig } from "../../config/config.js";
import { resolveAgentIdFromSessionKey } from "../../config/sessions.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import {
    type AgentIdentityParams,
    type AgentWaitParams,
    ErrorCodes,
    errorShape,
    formatValidationErrors,
    validateAgentIdentityParams,
    validateAgentWaitParams,
} from "../protocol/index.js";
import { resolveAssistantIdentity } from "../assistant-identity.js";
import { resolveAssistantAvatarUrl } from "../control-ui-shared.js";
import { waitForAgentJob } from "./agent-job.js";
import type { GatewayRequestHandlers } from "./types.js";

export const agentIdentityWaitHandlers: GatewayRequestHandlers = {
    "agent.identity.get": ({ params, respond }) => {
        if (!validateAgentIdentityParams(params)) {
            respond(
                false,
                undefined,
                errorShape(
                    ErrorCodes.INVALID_REQUEST,
                    `invalid agent.identity.get params: ${formatValidationErrors(
                        validateAgentIdentityParams.errors,
                    )}`,
                ),
            );
            return;
        }
        const p = params as AgentIdentityParams;
        const agentIdRaw = typeof p.agentId === "string" ? p.agentId.trim() : "";
        const sessionKeyRaw = typeof p.sessionKey === "string" ? p.sessionKey.trim() : "";
        let agentId = agentIdRaw ? normalizeAgentId(agentIdRaw) : undefined;
        if (sessionKeyRaw) {
            const resolved = resolveAgentIdFromSessionKey(sessionKeyRaw);
            if (agentId && resolved !== agentId) {
                respond(
                    false,
                    undefined,
                    errorShape(
                        ErrorCodes.INVALID_REQUEST,
                        `invalid agent.identity.get params: agent "${agentIdRaw}" does not match session key agent "${resolved}"`,
                    ),
                );
                return;
            }
            agentId = resolved;
        }
        const cfg = loadConfig();
        const identity = resolveAssistantIdentity({ cfg, agentId });
        const avatarValue =
            resolveAssistantAvatarUrl({
                avatar: identity.avatar,
                agentId: identity.agentId,
                basePath: cfg.gateway?.controlUi?.basePath,
            }) ?? identity.avatar;
        respond(true, { ...identity, avatar: avatarValue }, undefined);
    },
    "agent.wait": async ({ params, respond }) => {
        if (!validateAgentWaitParams(params)) {
            respond(
                false,
                undefined,
                errorShape(
                    ErrorCodes.INVALID_REQUEST,
                    `invalid agent.wait params: ${formatValidationErrors(validateAgentWaitParams.errors)}`,
                ),
            );
            return;
        }
        const p = params as AgentWaitParams;
        const runId = p.runId.trim();
        const timeoutMs =
            typeof p.timeoutMs === "number" && Number.isFinite(p.timeoutMs)
                ? Math.max(0, Math.floor(p.timeoutMs))
                : 30_000;

        const snapshot = await waitForAgentJob({
            runId,
            timeoutMs,
        });
        if (!snapshot) {
            respond(true, {
                runId,
                status: "timeout",
            });
            return;
        }
        respond(true, {
            runId,
            status: snapshot.status,
            startedAt: snapshot.startedAt,
            endedAt: snapshot.endedAt,
            error: snapshot.error,
        });
    },
};
