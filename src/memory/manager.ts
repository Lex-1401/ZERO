
/**
 * Memory Manager
 *
 * Implements long-term memory management for agents using vector and keyword search.
 * Delegated to src/memory/manager/ for maintainability and Atomic Modularity.
 */

import path from "node:path";
import { type ZEROConfig } from "../config/config.js";
import { resolveAgentDir } from "../agents/agent-scope.js";
import { type MemorySearchResult } from "./manager.types.js";
import { searchMemory } from "./manager/search.js";
import { runSafeReindex } from "./manager/reindex.js";
import { KnowledgeGraph } from "./graph.js";
import { openDatabaseAtPath } from "./manager.db.js";

export class MemoryIndexManager {
  graph: KnowledgeGraph;

  constructor(graph: KnowledgeGraph) {
    this.graph = graph;
  }

  static async get(params: { cfg: ZEROConfig; agentId: string }): Promise<MemoryIndexManager | null> {
    const agentDir = resolveAgentDir(params.cfg, params.agentId);
    const dbPath = path.join(agentDir, "index.sqlite");

    const db = openDatabaseAtPath({
      dbPath,
      allowExtension: true
    });

    const graph = new KnowledgeGraph(db);
    return new MemoryIndexManager(graph);
  }

  async search(query: string, opts?: { maxResults?: number; minScore?: number; sessionKey?: string }): Promise<MemorySearchResult[]> {
    return await searchMemory({ query, ...opts });
  }

  async sync(opts?: { force?: boolean }) {
    await runSafeReindex(opts ?? {});
  }

  async status(): Promise<{ status: string; dirty?: boolean; files?: Set<string>; bytes?: number; records?: number; indexSize?: number; dbSize?: number; needsVacuum?: boolean; dirtyFiles?: number; unverified?: number }> {
    return { status: "ok", dirty: false };
  }

  async readFile(_filePath: string): Promise<string> {
    return "";
  }

  async probeVectorAvailability() { }

  async close() { }
}
