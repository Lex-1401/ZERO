import { MetricsEngine } from "@zero/ratchet";

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
