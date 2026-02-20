import type { IncomingMessage, ServerResponse } from "node:http";
import { MemoryIndexManager } from "../memory/manager.js";
import { authorizeGatewayConnect, type ResolvedGatewayAuth } from "./auth.js";
import type { ZEROConfig } from "../config/config.js";
import { sendJson, sendUnauthorized } from "./http-common.js";
import { getBearerToken } from "./http-utils.js";

export async function handleMemoryGraphHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: {
    auth: ResolvedGatewayAuth;
    config: ZEROConfig;
    trustedProxies: string[];
  },
): Promise<boolean> {
  const url = new URL(req.url ?? "/", `http://localhost`);
  if (url.pathname !== "/api/memory/graph") return false;

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end("Method Not Allowed");
    return true;
  }

  const token = getBearerToken(req);
  const authResult = await authorizeGatewayConnect({
    auth: opts.auth,
    connectAuth: { token, password: token },
    req,
    trustedProxies: opts.trustedProxies,
  });
  if (!authResult.ok) {
    sendUnauthorized(res);
    return true;
  }

  try {
    const agentId = url.searchParams.get("agentId") || "default";

    // Initialize Memory Manager
    const manager = await MemoryIndexManager.get({
      cfg: opts.config,
      agentId,
    });

    if (!manager) {
      sendJson(res, 404, { ok: false, error: "Agent memory not found" });
      return true;
    }

    const graph = manager.graph.getWholeGraph();
    sendJson(res, 200, { ok: true, graph });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    sendJson(res, 500, { ok: false, error: msg });
  }

  return true;
}
