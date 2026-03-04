
/**
 * Nodes Tool
 *
 * Implements the agent tool for interacting with distributed ZERO Nodes.
 * Delegated to src/agents/tools/nodes/ for maintainability and Atomic Modularity.
 */

import { type AnyAgentTool } from "./common.js";
import { NodesToolSchema } from "./nodes/types.js";
import { executeNodesAction as action } from "./nodes/actions.js";

export function createNodesTool(options: any = {}): AnyAgentTool {
  return {
    name: "nodes",
    label: "nodes",
    description: "Manage and interact with ZERO Nodes.",
    parameters: NodesToolSchema,
    execute: async (toolCallId: string, args: any) => {
      return await action(args, options);
    },
  };
}
