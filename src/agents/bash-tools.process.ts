
/**
 * Bash Process Tool
 *
 * Implements the agent tool for running shell commands and interacting with processes.
 * Delegated to src/agents/tools/process/ for maintainability and Atomic Modularity.
 */

import type { AgentTool } from "@mariozechner/pi-agent-core";
import { executeProcessAction } from "./tools/process/actions.js";
import { type ProcessToolDefaults } from "./tools/process/types.js";
export type { ProcessToolDefaults };

export function createProcessTool(defaults?: ProcessToolDefaults): AgentTool<any> {
  return {
    name: "process",
    description: "Execute shell commands and manage background processes.",
    execute: async (toolCallId: string, args: any) => {
      return await executeProcessAction(args.action, args, { defaults });
    }
  } as any;
}

export const processTool = createProcessTool();
