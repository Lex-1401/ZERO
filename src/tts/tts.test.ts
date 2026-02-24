import { describe, expect, it, vi, beforeEach } from "vitest";
import { completeSimple } from "@mariozechner/pi-ai";
import * as tts from "./tts.js";
import { resolveTtsConfig } from "./tts.config.js";

vi.mock("@mariozechner/pi-ai", () => ({
  completeSimple: vi.fn(),
}));

// Mock minimal dependencies for tts integration tests
vi.mock("../agents/pi-embedded-runner/model.js", () => ({
  resolveModel: vi.fn(() => ({
    model: { id: "test" },
  })),
}));

const { maybeApplyTtsToPayload, getTtsProvider, _test } = tts;
const { resolveOutputFormat, resolveEdgeOutputFormat } = _test;

describe("tts integration", () => {
  describe("resolveOutputFormat", () => {
    it("uses Opus for Telegram", () => {
      const output = resolveOutputFormat("telegram");
      expect(output.openai).toBe("opus");
      expect(output.extension).toBe(".opus");
    });
  });

  describe("getTtsProvider", () => {
    const baseCfg = {
      agents: { defaults: { model: { primary: "openai/gpt-4o-mini" } } },
      messages: { tts: {} },
    };

    it("falls back to Edge when no API keys are present", () => {
      const config = resolveTtsConfig(baseCfg);
      const provider = getTtsProvider(config, "/tmp/nonexistent.json");
      expect(provider).toBe("edge");
    });
  });

  describe("maybeApplyTtsToPayload", () => {
    const baseCfg = {
      agents: { defaults: { model: { primary: "openai/gpt-4o-mini" } } },
      messages: {
        tts: {
          auto: "inbound",
          provider: "openai",
          openai: { apiKey: "test-key", model: "gpt-4o-mini-tts", voice: "alloy" },
        },
      },
    };

    it("skips auto-TTS when inbound audio gating is off", async () => {
      const payload = { text: "Hello" };
      const result = await maybeApplyTtsToPayload({
        payload,
        cfg: baseCfg,
        kind: "final",
        inboundAudio: false,
      });
      expect(result).toBe(payload);
    });
  });
});
