import { renamePairedNode } from "../../../infra/node-pairing.js";
import { listDevicePairing } from "../../../infra/device-pairing.js";
import {
  ErrorCodes,
  errorShape,
  validateNodeDescribeParams,
  validateNodeListParams,
  validateNodeRenameParams,
} from "../../protocol/index.js";
import {
  respondInvalidParams,
  respondUnavailableOnThrow,
  uniqueSortedStrings,
} from "../nodes.helpers.js";
import type { GatewayRequestHandlers } from "../types.js";

const isNodeEntry = (e: any) =>
  e.role === "node" || (Array.isArray(e.roles) && e.roles.includes("node"));

export const managementHandlers: Partial<GatewayRequestHandlers> = {
  "node.rename": async ({ params, respond }) => {
    if (!validateNodeRenameParams(params)) {
      respondInvalidParams({ respond, method: "node.rename", validator: validateNodeRenameParams });
      return;
    }
    const { nodeId, displayName } = params as { nodeId: string; displayName: string };
    await respondUnavailableOnThrow(respond, async () => {
      const trimmed = displayName.trim();
      if (!trimmed) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "displayName required"));
        return;
      }
      const updated = await renamePairedNode(nodeId, trimmed);
      if (!updated) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown nodeId"));
        return;
      }
      respond(true, { nodeId: updated.nodeId, displayName: updated.displayName }, undefined);
    });
  },
  "node.list": async ({ params, respond, context }) => {
    if (!validateNodeListParams(params)) {
      respondInvalidParams({ respond, method: "node.list", validator: validateNodeListParams });
      return;
    }
    await respondUnavailableOnThrow(respond, async () => {
      const list = await listDevicePairing();
      const paired = new Map(list.paired.filter(isNodeEntry).map((e) => [e.deviceId, e]));
      const connected = context.nodeRegistry.listConnected();
      const connectedById = new Map(connected.map((n) => [n.nodeId, n]));
      const nodeIds = new Set([...Array.from(paired.keys()), ...Array.from(connectedById.keys())]);
      const nodes = [...nodeIds].map((id) => {
        const p = paired.get(id) as any,
          l = connectedById.get(id) as any;
        const caps = uniqueSortedStrings([...(l?.caps ?? p?.caps ?? [])]);
        const commands = uniqueSortedStrings([...(l?.commands ?? p?.commands ?? [])]);
        return {
          nodeId: id,
          displayName: l?.displayName ?? p?.displayName,
          platform: l?.platform ?? p?.platform,
          version: l?.version ?? p?.version,
          coreVersion: l?.coreVersion ?? p?.coreVersion,
          uiVersion: l?.uiVersion ?? p?.uiVersion,
          deviceFamily: l?.deviceFamily ?? p?.deviceFamily,
          modelIdentifier: l?.modelIdentifier ?? p?.modelIdentifier,
          remoteIp: l?.remoteIp ?? p?.remoteIp,
          caps,
          commands,
          pathEnv: l?.pathEnv,
          permissions: l?.permissions ?? p?.permissions,
          connectedAtMs: l?.connectedAtMs,
          paired: !!p,
          connected: !!l,
        };
      });
      nodes.sort((a, b) =>
        a.connected !== b.connected
          ? a.connected
            ? -1
            : 1
          : (a.displayName ?? a.nodeId).localeCompare(b.displayName ?? b.nodeId),
      );
      respond(true, { ts: Date.now(), nodes }, undefined);
    });
  },
  "node.describe": async ({ params, respond, context }) => {
    if (!validateNodeDescribeParams(params)) {
      respondInvalidParams({
        respond,
        method: "node.describe",
        validator: validateNodeDescribeParams,
      });
      return;
    }
    const { nodeId } = params as { nodeId: string };
    await respondUnavailableOnThrow(respond, async () => {
      const list = await listDevicePairing();
      const p = list.paired.find((n) => n.deviceId === nodeId && isNodeEntry(n)),
        connected = context.nodeRegistry.listConnected(),
        l = connected.find((n) => n.nodeId === nodeId);
      if (!p && !l) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "unknown nodeId"));
        return;
      }
      respond(
        true,
        {
          ts: Date.now(),
          nodeId,
          displayName: l?.displayName ?? p?.displayName,
          platform: l?.platform ?? p?.platform,
          version: l?.version,
          coreVersion: l?.coreVersion,
          uiVersion: l?.uiVersion,
          deviceFamily: l?.deviceFamily,
          modelIdentifier: l?.modelIdentifier,
          remoteIp: l?.remoteIp ?? p?.remoteIp,
          caps: uniqueSortedStrings([...(l?.caps ?? [])]),
          commands: uniqueSortedStrings([...(l?.commands ?? [])]),
          pathEnv: l?.pathEnv,
          permissions: l?.permissions,
          connectedAtMs: l?.connectedAtMs,
          paired: !!p,
          connected: !!l,
        },
        undefined,
      );
    });
  },
};
