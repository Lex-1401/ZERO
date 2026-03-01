import {
  approveNodePairing,
  listNodePairing,
  rejectNodePairing,
  requestNodePairing,
  verifyNodeToken,
} from "../../../infra/node-pairing.js";
import {
  ErrorCodes,
  errorShape,
  validateNodePairApproveParams,
  validateNodePairListParams,
  validateNodePairRejectParams,
  validateNodePairRequestParams,
  validateNodePairVerifyParams,
} from "../../protocol/index.js";
import { respondInvalidParams, respondUnavailableOnThrow } from "../nodes.helpers.js";
import type { GatewayRequestHandlers } from "../types.js";

export const pairingHandlers: Partial<GatewayRequestHandlers> = {
  "node.pair.request": async ({ params, respond, context }) => {
    if (!validateNodePairRequestParams(params)) {
      respondInvalidParams({
        respond,
        method: "node.pair.request",
        validator: validateNodePairRequestParams,
      });
      return;
    }
    await respondUnavailableOnThrow(respond, async () => {
      const result = await requestNodePairing(params as any);
      if (result.status === "pending" && result.created)
        context.broadcast("node.pair.requested", result.request, { dropIfSlow: true });
      respond(true, result, undefined);
    });
  },
  "node.pair.list": async ({ params, respond }) => {
    if (!validateNodePairListParams(params)) {
      respondInvalidParams({
        respond,
        method: "node.pair.list",
        validator: validateNodePairListParams,
      });
      return;
    }
    await respondUnavailableOnThrow(respond, async () => {
      respond(true, await listNodePairing(), undefined);
    });
  },
  "node.pair.approve": async ({ params, respond, context }) => {
    if (!validateNodePairApproveParams(params)) {
      respondInvalidParams({
        respond,
        method: "node.pair.approve",
        validator: validateNodePairApproveParams,
      });
      return;
    }
    const { requestId } = params as { requestId: string };
    await respondUnavailableOnThrow(respond, async () => {
      const approved = await approveNodePairing(requestId);
      if (!approved) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown requestId"));
        return;
      }
      context.broadcast(
        "node.pair.resolved",
        { requestId, nodeId: approved.node.nodeId, decision: "approved", ts: Date.now() },
        { dropIfSlow: true },
      );
      respond(true, approved, undefined);
    });
  },
  "node.pair.reject": async ({ params, respond, context }) => {
    if (!validateNodePairRejectParams(params)) {
      respondInvalidParams({
        respond,
        method: "node.pair.reject",
        validator: validateNodePairRejectParams,
      });
      return;
    }
    const { requestId } = params as { requestId: string };
    await respondUnavailableOnThrow(respond, async () => {
      const rejected = await rejectNodePairing(requestId);
      if (!rejected) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown requestId"));
        return;
      }
      context.broadcast(
        "node.pair.resolved",
        { requestId, nodeId: rejected.nodeId, decision: "rejected", ts: Date.now() },
        { dropIfSlow: true },
      );
      respond(true, rejected, undefined);
    });
  },
  "node.pair.verify": async ({ params, respond }) => {
    if (!validateNodePairVerifyParams(params)) {
      respondInvalidParams({
        respond,
        method: "node.pair.verify",
        validator: validateNodePairVerifyParams,
      });
      return;
    }
    const { nodeId, token } = params as { nodeId: string; token: string };
    await respondUnavailableOnThrow(respond, async () => {
      respond(true, await verifyNodeToken(nodeId, token), undefined);
    });
  },
};
