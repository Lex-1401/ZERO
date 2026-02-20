import { Type } from "@sinclair/typebox";
import path from "node:path";
import fs from "node:fs/promises";
import { MemoryIndexManager } from "../../memory/manager.js";
import type { ZEROConfig } from "../../config/config.js";
import { jsonResult, readStringParam, readNumberParam } from "./common.js";
import type { AnyAgentTool } from "./common.js";
import { resolveAgentWorkspaceDir } from "../agent-scope.js";

const MEMORY_CATEGORIES = ["preference", "fact", "decision", "entity", "other"] as const;

const MemoryStoreSchema = Type.Object({
  content: Type.String({ description: "The fact, preference, or concept to store." }),
  category: Type.Optional(
    Type.String({
      description: `Category of the memory: ${MEMORY_CATEGORIES.join(", ")}`,
      enum: MEMORY_CATEGORIES,
    }),
  ),
});

const MemorySearchSchema = Type.Object({
  query: Type.String({ description: "Search query to find relevant memories." }),
  limit: Type.Optional(Type.Number({ description: "Max number of results (default: 5)." })),
});

const MemoryGetSchema = Type.Object({
  path: Type.String({ description: "Relative path to the memory file to read." }),
});

export function createMemoryTools(options: {
  config: ZEROConfig;
  agentId: string;
  agentSessionKey?: string;
}): AnyAgentTool[] {
  return [
    createMemoryStoreTool(options),
    createMemorySearchTool(options),
    createMemoryGetTool(options),
  ];
}

export function createMemoryStoreTool(options: {
  config: ZEROConfig;
  agentId: string;
}): AnyAgentTool {
  return {
    name: "memory_store",
    label: "Store Memory",
    description:
      "Save important facts, user preferences, or project decisions to long-term memory. Use this when the user explicitly asks to remember something or when you learn a critical piece of information.",
    parameters: MemoryStoreSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const content = readStringParam(params, "content", { required: true });
      const category = readStringParam(params, "category") || "fact";

      const workspaceDir = resolveAgentWorkspaceDir(options.config, options.agentId);
      const memoryDir = path.join(workspaceDir, "memory");
      await fs.mkdir(memoryDir, { recursive: true });

      // We append to category-based files for organization
      const filename = `${category}.md`;
      const filePath = path.join(memoryDir, filename);

      const entry = `\n- [${new Date().toISOString()}] ${content}`;
      await fs.appendFile(filePath, entry, "utf-8");

      // Trigger sync if manager is active
      const manager = await MemoryIndexManager.get({
        cfg: options.config,
        agentId: options.agentId,
      });
      if (manager) {
        if (manager.status().dirty) {
          void manager.sync();
        }
      }

      return jsonResult({
        status: "stored",
        file: `memory/${filename}`,
        category,
      });
    },
  };
}

export function createMemorySearchTool(options: {
  config: ZEROConfig;
  agentId: string;
  agentSessionKey?: string;
}): AnyAgentTool {
  return {
    name: "memory_search",
    label: "Search Memory",
    description:
      "Search through long-term memory (facts, preferences, past decisions) using semantic search.",
    parameters: MemorySearchSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const query = readStringParam(params, "query", { required: true });
      const limit = readNumberParam(params, "limit") || 5;

      const manager = await MemoryIndexManager.get({
        cfg: options.config,
        agentId: options.agentId,
      });

      if (!manager) {
        return jsonResult({ error: "Memory system not initialized." });
      }

      try {
        const results = await manager.search(query, {
          maxResults: limit,
          sessionKey: options.agentSessionKey,
        });
        return jsonResult({ results });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return jsonResult({ error: msg });
      }
    },
  };
}

export function createMemoryGetTool(options: {
  config: ZEROConfig;
  agentId: string;
}): AnyAgentTool {
  return {
    name: "memory_get",
    label: "Read Memory File",
    description: "Read the content of a specific memory file.",
    parameters: MemoryGetSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const relPath = readStringParam(params, "path", { required: true });

      const manager = await MemoryIndexManager.get({
        cfg: options.config,
        agentId: options.agentId,
      });

      if (!manager) {
        return jsonResult({ error: "Memory system not initialized." });
      }

      try {
        const result = await manager.readFile({ relPath: relPath });
        return jsonResult({ content: result.text, path: result.path });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return jsonResult({ error: msg });
      }
    },
  };
}
