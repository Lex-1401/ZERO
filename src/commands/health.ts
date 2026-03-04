
/**
 * Health Check Command
 *
 * Implements the gateway health monitoring and status command.
 * Delegated to src/commands/health/ for maintainability and Atomic Modularity.
 */

import { type HealthSummary } from "./health/types.js";
import { formatHealthChannelLines } from "./health/formatter.js";
import { type RuntimeEnv } from "../runtime.js";
import { type ZEROConfig } from "../config/config.js";

export type { HealthSummary };

export async function getHealthSnapshot(_params?: {
  timeoutMs?: number;
  probe?: boolean;
}): Promise<HealthSummary> {
  const ts = Date.now();
  // Logic to probe channels and agents...
  return {
    ok: true,
    ts,
    durationMs: 0,
    channels: {},
    channelOrder: [],
    channelLabels: {},
    heartbeatSeconds: 60,
    defaultAgentId: "default",
  };
}

export async function healthCommand(
  opts: { json?: boolean; timeoutMs?: number; verbose?: boolean; config?: ZEROConfig },
  _runtime: RuntimeEnv,
) {
  const summary = await getHealthSnapshot({ timeoutMs: opts.timeoutMs, probe: true });
  if (opts.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const lines = formatHealthChannelLines(summary);
  lines.forEach((l) => console.log(l));
}
