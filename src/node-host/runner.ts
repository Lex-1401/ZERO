
/**
 * Node Host Runner
 *
 * Implements the runtime for executing assistant commands on the host system.
 * Delegated to src/node-host/runner/ for maintainability and Atomic Modularity.
 */

import { handleNodeExec } from "./runner/handlers/exec.js";

export interface NodeHostRunOptions {
  socketPath: string;
  agentId?: string;
}

export async function runNodeHost(_opts: NodeHostRunOptions): Promise<void> {
  // Logic to connect to the gateway and listen for invoke events.
  // Omitted for brevity in this stage, will be copied from original.
}

export async function handleInvoke(frame: any, _client: any, _skillBins: any) {
  const method = frame.method;
  switch (method) {
    case "exec": return await handleNodeExec(frame.params);
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}
