import { describe, expect, it, vi, beforeEach } from "vitest";
import { completeSimple } from "@mariozechner/pi-ai";
import { getApiKeyForModel } from "../agents/model-auth.js";
import { resolveModel } from "../agents/pi-embedded-runner/model.js";
import { resolveTtsConfig } from "./tts.config.js";
import {
    isValidVoiceId,
    isValidOpenAIVoice,
    isValidOpenAIModel,
    OPENAI_TTS_MODELS,
    OPENAI_TTS_VOICES,
    parseTtsDirectives,
    summarizeText,
} from "./tts.utils.js";
import { resolveModelOverridePolicy } from "./tts.config.js";

vi.mock("@mariozechner/pi-ai", () => ({
    completeSimple: vi.fn(),
}));

vi.mock("../agents/pi-embedded-runner/model.js", () => ({
    resolveModel: vi.fn((provider: string, modelId: string) => ({
        model: {
            provider,
            id: modelId,
            name: modelId,
            api: "openai-completions",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
        },
        authStorage: { profiles: {} },
        modelRegistry: { find: vi.fn() },
    })),
}));

vi.mock("../agents/model-auth.js", () => ({
    getApiKeyForModel: vi.fn(async () => ({
        apiKey: "test-api-key",
        source: "test",
        mode: "api-key",
    })),
    requireApiKey: vi.fn((auth: { apiKey?: string }) => auth.apiKey ?? ""),
}));

describe("tts.utils", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(completeSimple).mockResolvedValue({
            role: "assistant",
            content: [{ type: "text", text: "Summary" }],
            api: "openai-completions",
            provider: "openai",
            model: "gpt-4o-mini",
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            latencyMs: 0,
            timestamp: Date.now(),
        } as any);
    });

    describe("isValidVoiceId", () => {
        it("accepts valid ElevenLabs voice IDs", () => {
            expect(isValidVoiceId("pMsXgVXv3BLzUgSXRplE")).toBe(true);
            expect(isValidVoiceId("21m00Tcm4TlvDq8ikWAM")).toBe(true);
            expect(isValidVoiceId("EXAVITQu4vr4xnSDxMaL")).toBe(true);
        });

        it("accepts voice IDs of varying valid lengths", () => {
            expect(isValidVoiceId("a1b2c3d4e5")).toBe(true);
            expect(isValidVoiceId("a".repeat(40))).toBe(true);
        });

        it("rejects too short voice IDs", () => {
            expect(isValidVoiceId("")).toBe(false);
            expect(isValidVoiceId("abc")).toBe(false);
            expect(isValidVoiceId("123456789")).toBe(false);
        });

        it("rejects too long voice IDs", () => {
            expect(isValidVoiceId("a".repeat(41))).toBe(false);
            expect(isValidVoiceId("a".repeat(100))).toBe(false);
        });

        it("rejects voice IDs with invalid characters", () => {
            expect(isValidVoiceId("pMsXgVXv3BLz-gSXRplE")).toBe(false);
            expect(isValidVoiceId("pMsXgVXv3BLz_gSXRplE")).toBe(false);
            expect(isValidVoiceId("pMsXgVXv3BLz gSXRplE")).toBe(false);
            expect(isValidVoiceId("../../../etc/passwd")).toBe(false);
            expect(isValidVoiceId("voice?param=value")).toBe(false);
        });
    });

    describe("isValidOpenAIVoice", () => {
        it("accepts all valid OpenAI voices", () => {
            for (const voice of OPENAI_TTS_VOICES) {
                expect(isValidOpenAIVoice(voice)).toBe(true);
            }
        });

        it("rejects invalid voice names", () => {
            expect(isValidOpenAIVoice("invalid")).toBe(false);
            expect(isValidOpenAIVoice("")).toBe(false);
            expect(isValidOpenAIVoice("ALLOY")).toBe(false);
            expect(isValidOpenAIVoice("alloy ")).toBe(false);
            expect(isValidOpenAIVoice(" alloy")).toBe(false);
        });
    });

    describe("isValidOpenAIModel", () => {
        it("accepts supported models", () => {
            expect(isValidOpenAIModel("gpt-4o-mini-tts")).toBe(true);
            expect(isValidOpenAIModel("tts-1")).toBe(true);
            expect(isValidOpenAIModel("tts-1-hd")).toBe(true);
        });

        it("rejects unsupported models", () => {
            expect(isValidOpenAIModel("invalid")).toBe(false);
            expect(isValidOpenAIModel("")).toBe(false);
            expect(isValidOpenAIModel("gpt-4")).toBe(false);
        });
    });

    describe("OPENAI_TTS_MODELS", () => {
        it("contains supported models", () => {
            expect(OPENAI_TTS_MODELS).toContain("gpt-4o-mini-tts");
            expect(OPENAI_TTS_MODELS).toContain("tts-1");
            expect(OPENAI_TTS_MODELS).toContain("tts-1-hd");
            expect(OPENAI_TTS_MODELS).toHaveLength(3);
        });
    });

    describe("parseTtsDirectives", () => {
        it("extracts overrides and strips directives when enabled", () => {
            const policy = resolveModelOverridePolicy({ enabled: true });
            const input =
                "Hello [[tts:provider=elevenlabs voiceId=pMsXgVXv3BLzUgSXRplE stability=0.4 speed=1.1]] world\n\n" +
                "[[tts:text]](laughs) Read the song once more.[[/tts:text]]";
            const result = parseTtsDirectives(input, policy);

            expect(result.cleanedText).not.toContain("[[tts:");
            expect(result.ttsText).toBe("(laughs) Read the song once more.");
            expect(result.overrides.provider).toBe("elevenlabs");
        });
    });

    describe("summarizeText", () => {
        const baseCfg = {
            agents: { defaults: { model: { primary: "openai/gpt-4o-mini" } } },
            messages: { tts: {} },
        };
        const baseConfig = resolveTtsConfig(baseCfg);

        it("summarizes text and returns result with metrics", async () => {
            const mockSummary = "This is a summarized version of the text.";
            vi.mocked(completeSimple).mockResolvedValue({
                content: [{ type: "text", text: mockSummary }],
            });

            const longText = "A".repeat(2000);
            const result = await summarizeText({
                text: longText,
                targetLength: 1500,
                cfg: baseCfg,
                config: baseConfig,
                timeoutMs: 30_000,
            });

            expect(result.summary).toBe(mockSummary);
            expect(result.inputLength).toBe(2000);
        });
    });
});
