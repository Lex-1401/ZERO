import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ZEROConfig } from "../config/config.js";
import { logVerbose } from "../globals.js";
import { isVoiceCompatibleAudio } from "../media/audio.js";
import {
  TtsResult,
  TtsTelephonyResult,
  TtsStatusEntry
} from "./tts.types.js";
import {
  normalizeTtsAutoMode,
  parseTtsDirectives,
  summarizeText,
  scheduleCleanup,
  resolveOutputFormat,
  resolveEdgeOutputFormat,
  isValidVoiceId
} from "./tts.utils.js";
import {
  resolveTtsConfig,
  resolveTtsPrefsPath,
  getTtsProvider,
  resolveModelOverridePolicy
} from "./tts.config.js";
import {
  openaiTTS,
  elevenLabsTTS,
  edgeTTS
} from "./tts.process.js";

let lastTtsAttempt: TtsStatusEntry | undefined;

export async function textToSpeech(params: {
  text: string;
  cfg: ZEROConfig;
  prefsPath?: string;
  channel?: string;
  overrides?: any;
}): Promise<TtsResult> {
  const config = resolveTtsConfig(params.cfg);
  const providerStart = Date.now();

  try {
    const tempDir = mkdtempSync(path.join(tmpdir(), "tts-"));
    const audioPath = path.join(tempDir, `voice-${Date.now()}.mp3`);

    // Lógica simplificada delegada para tts.process.ts
    if (config.provider === "openai") {
      const buf = await openaiTTS({
        text: params.text,
        apiKey: config.openai.apiKey || "",
        model: config.openai.model,
        voice: config.openai.voice,
        responseFormat: "mp3",
        timeoutMs: config.timeoutMs
      });
      writeFileSync(audioPath, buf);
    } else if (config.provider === "elevenlabs") {
      const buf = await elevenLabsTTS({
        text: params.text,
        apiKey: config.elevenlabs.apiKey || "",
        baseUrl: config.elevenlabs.baseUrl,
        voiceId: config.elevenlabs.voiceId,
        modelId: config.elevenlabs.modelId,
        outputFormat: "mp3_44100_128",
        voiceSettings: config.elevenlabs.voiceSettings,
        timeoutMs: config.timeoutMs
      });
      writeFileSync(audioPath, buf);
    } else {
      await edgeTTS({
        text: params.text,
        outputPath: audioPath,
        config: config.edge,
        timeoutMs: config.timeoutMs
      });
    }

    scheduleCleanup(tempDir, 5 * 60 * 1000);
    return {
      success: true,
      audioPath,
      latencyMs: Date.now() - providerStart,
      provider: config.provider,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function maybeApplyTtsToPayload(params: any): Promise<any> {
  // Redirecionamento da lógica de alto nível que estava no tts.ts original
  // (Esta função invoca o textToSpeech e gerencia o payload de resposta)
  const config = resolveTtsConfig(params.cfg);
  const text = params.payload.text ?? "";
  const directives = parseTtsDirectives(text, config.modelOverrides);

  if (text.length < 10) return params.payload;

  const result = await textToSpeech({
    text: directives.cleanedText || text,
    cfg: params.cfg,
    overrides: directives.overrides
  });

  if (result.success) {
    return { ...params.payload, mediaUrl: result.audioPath };
  }
  return params.payload;
}

export { getTtsProvider, resolveTtsConfig };

export const _test = {
  isValidVoiceId,
  parseTtsDirectives,
  summarizeText,
  resolveOutputFormat,
  resolveEdgeOutputFormat,
};

export function getLastTtsAttempt() { return lastTtsAttempt; }
