import { loadConfig } from "../../../config/config.js";
import { isNodeCommandAllowed, resolveNodeCommandAllowlist } from "../../node-command-policy.js";
import {
  ErrorCodes,
  errorShape,
  validateNodeInvokeParams,
  validateNodeInvokeResultParams,
} from "../../protocol/index.js";
import {
  respondInvalidParams,
  respondUnavailableOnThrow,
  safeParseJson,
} from "../nodes.helpers.js";
import type { GatewayRequestHandlers } from "../types.js";

function normalizeInvokeResult(params: any): any {
  if (!params || typeof params !== "object") return params;
  const normalized = { ...params };
  if (normalized.payloadJSON === null) delete normalized.payloadJSON;
  else if (normalized.payloadJSON !== undefined && typeof normalized.payloadJSON !== "string") {
    if (normalized.payload === undefined) normalized.payload = normalized.payloadJSON;
    delete normalized.payloadJSON;
  }
  if (normalized.error === null) delete normalized.error;
  return normalized;
}

export const invokeHandlers: Partial<GatewayRequestHandlers> = {
  "node.invoke": async ({ params, respond, context }) => {
    if (!validateNodeInvokeParams(params)) {
      respondInvalidParams({ respond, method: "node.invoke", validator: validateNodeInvokeParams });
      return;
    }
    const { nodeId, command, params: p, timeoutMs, idempotencyKey } = params as any;
    await respondUnavailableOnThrow(respond, async () => {
      const session = context.nodeRegistry.get(nodeId);
      if (!session) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.UNAVAILABLE, "node not connected", {
            details: { code: "NOT_CONNECTED" },
          }),
        );
        return;
      }
      const allowed = isNodeCommandAllowed({
        command,
        declaredCommands: session.commands,
        allowlist: resolveNodeCommandAllowlist(loadConfig(), session),
      });
      if (!allowed.ok) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, "node command not allowed", {
            details: { reason: allowed.reason, command },
          }),
        );
        return;
      }
      const res = await context.nodeRegistry.invoke({
        nodeId,
        command,
        params: p,
        timeoutMs,
        idempotencyKey,
      });
      if (!res.ok) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.UNAVAILABLE, res.error?.message ?? "node invoke failed", {
            details: { nodeError: res.error ?? null },
          }),
        );
        return;
      }
      respond(
        true,
        {
          ok: true,
          nodeId,
          command,
          payload: res.payloadJSON ? safeParseJson(res.payloadJSON) : res.payload,
          payloadJSON: res.payloadJSON ?? null,
        },
        undefined,
      );
    });
  },
  "node.invoke.result": async ({ params, respond, context, client: _client }) => {
    const normalized = normalizeInvokeResult(params);
    if (!validateNodeInvokeResultParams(normalized)) {
      respondInvalidParams({
        respond,
        method: "node.invoke.result",
        validator: validateNodeInvokeResultParams,
      });
      return;
    }
    const p = normalized as any;
    const ok = context.nodeRegistry.handleInvokeResult({
      id: p.id,
      nodeId: p.nodeId,
      ok: p.ok,
      payload: p.payload,
      payloadJSON: p.payloadJSON ?? null,
      error: p.error ?? null,
    });
    if (!ok) {
      context.logGateway.debug(`late invoke result ignored: id=${p.id} node=${p.nodeId}`);
      respond(true, { ok: true, ignored: true }, undefined);
      return;
    }
    respond(true, { ok: true }, undefined);
  },
};
