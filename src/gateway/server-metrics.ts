import { MetricsEngine as NativeMetrics } from "@zero/ratchet";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("gateway/metrics");

let metricsEngine: NativeMetrics | null = null;
try {
  metricsEngine = new NativeMetrics();
} catch {
  log.warn("Failed to load native MetricsEngine, metrics reporting restricted.");
}

/**
 * High-performance telemetry orchestrator.
 */
export class GatewayMetrics {
  static recordTokens(model: string, count: number) {
    metricsEngine?.recordTokens(model, count);
  }

  static recordLatency(ms: number) {
    metricsEngine?.recordLatency(ms);
  }

  static getSummary() {
    if (!metricsEngine) return null;
    return metricsEngine.summarize();
  }
}
