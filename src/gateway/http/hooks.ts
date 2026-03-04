import { type IncomingMessage, type ServerResponse } from "node:http";
import type { createSubsystemLogger } from "../../logging/subsystem.js";
import {
    type HooksConfigResolved,
    extractHookToken,
    readJsonBody,
    normalizeWakePayload,
    normalizeAgentPayload,
    type HookAgentPayload,
} from "../hooks.js";
import { sendJson } from "./utils.js";

export type HooksRequestHandler = (
    req: IncomingMessage,
    res: ServerResponse,
) => void | Promise<void>;

export function createHooksRequestHandler(params: {
    getHooksConfig: () => HooksConfigResolved | null;
    bindHost: string;
    port: number;
    logHooks: ReturnType<typeof createSubsystemLogger>;
    dispatchAgentHook: (payload: HookAgentPayload) => string;
    dispatchWakeHook: (payload: { text: string; mode: "now" | "next-heartbeat" }) => void;
}): HooksRequestHandler {
    const { getHooksConfig, logHooks, dispatchAgentHook, dispatchWakeHook } = params;

    return async (req, res) => {
        try {
            if (req.method !== "POST") {
                sendJson(res, 405, { ok: false, error: "Method Not Allowed" });
                return;
            }

            const config = getHooksConfig();
            if (!config) {
                sendJson(res, 503, { ok: false, error: "Hooks are disabled" });
                return;
            }

            const url = new URL(req.url || "/", "http://localhost");
            const pathname = url.pathname;

            if (!pathname.startsWith(config.basePath)) {
                sendJson(res, 404, { ok: false, error: "Not Found" });
                return;
            }

            const token = extractHookToken(req, url);
            if (!token || token !== config.token) {
                sendJson(res, 401, { ok: false, error: "Unauthorized" });
                return;
            }

            const bodyRes = await readJsonBody(req, config.maxBodyBytes);
            if (!bodyRes.ok) {
                sendJson(res, 400, { ok: false, error: bodyRes.error });
                return;
            }
            const body = bodyRes.value as Record<string, unknown>;

            const subPath = pathname.slice(config.basePath.length);

            if (subPath === "/wake" || subPath === "/wake/") {
                const payload = normalizeWakePayload(body);
                if (!payload.ok) {
                    sendJson(res, 400, { ok: false, error: payload.error });
                    return;
                }
                dispatchWakeHook(payload.value);
                sendJson(res, 200, { ok: true, message: "Wake hook dispatched" });
                return;
            }

            if (subPath === "/agent" || subPath === "/agent/") {
                const payload = normalizeAgentPayload(body);
                if (!payload.ok) {
                    sendJson(res, 400, { ok: false, error: payload.error });
                    return;
                }
                const runId = dispatchAgentHook(payload.value);
                sendJson(res, 200, { ok: true, runId });
                return;
            }

            sendJson(res, 404, { ok: false, error: "Unknown hook endpoint" });
        } catch (err) {
            logHooks.error(`Hook request error: ${String(err)}`);
            sendJson(res, 500, { ok: false, error: "Internal Server Error" });
        }
    };
}
