import { MetricsEngine } from "../../rust-core/index.js";

const engine = new MetricsEngine();

export const telemetry = {
  recordTokens: (model: string, count: number) => {
    engine.recordTokens(model, count);
  },
  recordLatency: (ms: number) => {
    engine.recordLatency(ms);
  },
  getSummary: () => {
    return engine.summarize();
  },
};
