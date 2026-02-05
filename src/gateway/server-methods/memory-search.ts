import { MemoryIndexManager } from "../../memory/manager.js";
import { loadConfig } from "../../config/config.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateMemorySearchParams,
} from "../protocol/index.js";
import type { GatewayRequestHandlers } from "./types.js";

export const memoryHandlers: GatewayRequestHandlers = {
  "memory.search": async ({ params, respond }) => {
    if (!validateMemorySearchParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid memory.search params: ${formatValidationErrors(validateMemorySearchParams.errors)}`,
        ),
      );
      return;
    }
    const p = params as import("../protocol/index.js").MemorySearchParams;
    const cfg = loadConfig();
    const agentId = p.agentId ?? "default";

    try {
      const memoryManager = await MemoryIndexManager.get({ cfg, agentId });

      if (!memoryManager) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.UNAVAILABLE, `Memory is disabled for agent ${agentId}`),
        );
        return;
      }

      const results = await memoryManager.search(p.query, {
        maxResults: p.limit,
        minScore: p.minScore,
        sessionKey: p.sessionKey,
      });

      respond(
        true,
        {
          ts: Date.now(),
          results: results.map((r: any) => ({
            id: r.id ?? "unknown",
            snippet: r.snippet,
            score: r.score,
            source: r.source,
            path: r.path,
            startLine: r.startLine,
            endLine: r.endLine,
            sessionKey: p.sessionKey ?? undefined, // basic echo if provided, otherwise undefined
          })),
        } as import("../protocol/index.js").MemorySearchResult,
        undefined,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, msg));
    }
  },
};
