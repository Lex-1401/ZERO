
/**
 * @fileoverview Heartbeat runner for ZERO.
 * Handles periodic agent activations and outbound delivery.
 * @module src/infra/heartbeat-runner
 */

import { setHeartbeatsEnabled as setEnabledInRunOnce, runHeartbeatOnce } from "./heartbeat/run-once.js";
import { startHeartbeatRunner } from "./heartbeat/scheduler.js";
import { isHeartbeatEnabledForAgent, resolveHeartbeatSummaryForAgent, resolveHeartbeatIntervalMs, resolveHeartbeatPrompt } from "./heartbeat/config-utils.js";

import type { HeartbeatRunner } from "./heartbeat/types.js";

export {
  runHeartbeatOnce,
  startHeartbeatRunner,
  isHeartbeatEnabledForAgent,
  resolveHeartbeatSummaryForAgent,
  resolveHeartbeatIntervalMs,
  resolveHeartbeatPrompt,
};
export type { HeartbeatRunner };

/**
 * Enable or disable heartbeats globally.
 * @param {boolean} enabled - Whether heartbeats should be enabled.
 */
export function setHeartbeatsEnabled(enabled: boolean) {
  setEnabledInRunOnce(enabled);
}
