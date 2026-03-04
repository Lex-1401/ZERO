
/**
 * Memory Manager
 *
 * Implements long-term memory management for agents using vector and keyword search.
 * Delegated to src/memory/manager/ for maintainability and Atomic Modularity.
 */

import { type ZEROConfig } from "../config/config.js";
import { type MemorySearchResult } from "./manager.types.js";
import { searchMemory } from "./manager/search.js";
import { runSafeReindex } from "./manager/reindex.js";

export class MemoryIndexManager {
  graph: any = {
    getWholeGraph: () => ({ nodes: [], edges: [] }),
    addRelation: () => { },
    searchEntities: () => { },
    getGraphContext: () => { },
    addEntity: () => { },
  };

  static async get(_params: { cfg: ZEROConfig; agentId: string }): Promise<MemoryIndexManager | null> {
    return new MemoryIndexManager();
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
