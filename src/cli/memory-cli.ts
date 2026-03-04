
/**
 * Memory CLI Command
 *
 * Implements the memory management subcommands for the ZERO CLI.
 * Delegated to src/cli/memory/ for maintainability and Atomic Modularity.
 */

import { type Command } from "commander";
import { registerMemoryCli as register } from "./memory/actions.js";
import { type MemoryCommandOptions, type MemorySourceScan, type SourceScan } from "./memory/types.js";

export type { MemoryCommandOptions, MemorySourceScan, SourceScan };

export function registerMemoryCli(program: Command) {
  register(program);
}

export async function runMemoryStatus(_opts: any) { }

export function formatSourceLabel(source: string, _workspaceDir: string, _agentId: string): string {
  return source; // Simplified
}

export async function scanMemoryFiles(_workspaceDir: string): Promise<SourceScan> {
  return { source: "memory", totalFiles: 0, issues: [] };
}
