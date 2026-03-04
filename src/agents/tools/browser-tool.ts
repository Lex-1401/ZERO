
/**
 * Browser Agent Tool
 *
 * Implements the browser tool for agent interactions.
 * Delegated to src/agents/tools/browser/ for maintainability and Atomic Modularity.
 */

import { BrowserToolSchema } from "./browser-tool.schema.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";
import { resolveBrowserBaseUrl } from "./browser/resolver.js";
import { executeBrowserAction } from "./browser/actions.js";

export function createBrowserTool(opts?: {
  defaultControlUrl?: string;
  allowHostControl?: boolean;
  allowedControlUrls?: string[];
  allowedControlHosts?: string[];
  allowedControlPorts?: number[];
}): AnyAgentTool {
  return {
    ...BrowserToolSchema.definition,
    execute: async (_toolCallId, args) => {
      const action = readStringParam(args, "action");
      if (!action) throw new Error("Missing browser action.");

      const baseUrl = await resolveBrowserBaseUrl({
        target: args.target as any,
        controlUrl: args.controlUrl as any,
        defaultControlUrl: opts?.defaultControlUrl,
        allowHostControl: opts?.allowHostControl,
      });

      const result = await executeBrowserAction(action, args, baseUrl);
      return jsonResult(result);
    },
  };
}
