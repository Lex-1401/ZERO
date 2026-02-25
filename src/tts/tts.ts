import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ZEROConfig } from "../config/config.js";
import { logVerbose } from "../globals.js";
import {
  TtsResult,
  TtsTelephonyResult,
  TtsStatusEntry,
  TtsUserPrefs
} from "./tts.types.js";
import {
  normalizeTtsAutoMode,
  parseTtsDirectives,
  summarizeText,
  scheduleCleanup,
  resolveOutputFormat,
  resolveEdgeOutputFormat,
  isValidVoiceId,
  OPENAI_TTS_MODELS,
  OPENAI_TTS_VOICES
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
import { TtsProvider, TtsAutoMode } from "../config/types.tts.js";

let lastTtsAttempt: TtsStatusEntry | undefined;

export function setLastTtsAttempt(entry: TtsStatusEntry) {
  lastTtsAttempt = entry;
}

export function getLastTtsAttempt() {
  return lastTtsAttempt;
}

export function isTtsProviderConfigured(config: any, provider: TtsProvider): boolean {
  if (provider === "edge") return config.edge?.enabled !== false;
  if (provider === "openai") return !!resolveTtsApiKey(config, "openai");
  if (provider === "elevenlabs") return !!resolveTtsApiKey(config, "elevenlabs");
  return false;
}

export function resolveTtsApiKey(config: any, provider: TtsProvider): string | undefined {
  if (provider === "openai") return config.openai?.apiKey || process.env.OPENAI_API_KEY;
  if (provider === "elevenlabs") return config.elevenlabs?.apiKey || process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY;
  return undefined;
}

export function resolveTtsProviderOrder(primary: TtsProvider): TtsProvider[] {
  const all: TtsProvider[] = ["openai", "elevenlabs", "edge"];
  const filtered = all.filter(p => p !== primary);
  return [primary, ...filtered];
}

function readPrefs(prefsPath: string): TtsUserPrefs {
  if (!existsSync(prefsPath)) return {};
  try {
    return JSON.parse(readFileSync(prefsPath, "utf-8"));
  } catch {
    return {};
  }
}

function writePrefs(prefsPath: string, prefs: TtsUserPrefs) {
  try {
    writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
  } catch (err) {
    logVerbose(`Failed to write TTS prefs to ${prefsPath}: ${String(err)}`);
  }
}

export function getTtsMaxLength(prefsPath: string): number {
  const prefs = readPrefs(prefsPath);
  return prefs.tts?.maxLength ?? 4000;
}

export function setTtsMaxLength(prefsPath: string, limit: number) {
  const prefs = readPrefs(prefsPath);
  prefs.tts = { ...prefs.tts, maxLength: limit };
  writePrefs(prefsPath, prefs);
}

export function isSummarizationEnabled(prefsPath: string): boolean {
  const prefs = readPrefs(prefsPath);
  return prefs.tts?.summarize ?? true;
}

export function setSummarizationEnabled(prefsPath: string, enabled: boolean) {
  const prefs = readPrefs(prefsPath);
  prefs.tts = { ...prefs.tts, summarize: enabled };
  writePrefs(prefsPath, prefs);
}

export function setTtsProvider(prefsPath: string, provider: TtsProvider) {
  const prefs = readPrefs(prefsPath);
  prefs.tts = { ...prefs.tts, provider };
  writePrefs(prefsPath, prefs);
}

export function resolveTtsAutoMode(params: { config: any, prefsPath: string, sessionAuto?: TtsAutoMode }): TtsAutoMode {
  if (params.sessionAuto) return params.sessionAuto;
  const prefs = readPrefs(params.prefsPath);
  return prefs.tts?.auto ?? params.config.auto ?? "off";
}

export function isTtsEnabled(config: any): boolean {
  return config.auto !== "off";
}

export function setTtsEnabled(config: any, enabled: boolean) {
  // In v1.0, we prioritize the auto mode settings.
}

export async function textToSpeechTelephony(params: any): Promise<TtsTelephonyResult> {
  return { success: false, error: "Telephony TTS not implemented in this build" };
}

export function buildTtsSystemPromptHint(config: any): string {
  return "TTS is active. Keep responses suitable for voice output (avoid heavy markdown).";
}

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

    if (config.provider === "openai") {
      const buf = await openaiTTS({
        text: params.text,
        apiKey: resolveTtsApiKey(config, "openai") || "",
        model: config.openai.model,
        voice: config.openai.voice,
        responseFormat: "mp3",
        timeoutMs: config.timeoutMs
      });
      writeFileSync(audioPath, buf);
    } else if (config.provider === "elevenlabs") {
      const buf = await elevenLabsTTS({
        text: params.text,
        apiKey: resolveTtsApiKey(config, "elevenlabs") || "",
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
      voiceCompatible: true
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function maybeApplyTtsToPayload(params: any): Promise<any> {
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

export { getTtsProvider, resolveTtsConfig, normalizeTtsAutoMode, resolveTtsPrefsPath, OPENAI_TTS_MODELS, OPENAI_TTS_VOICES };

export const _test = {
  isValidVoiceId,
  parseTtsDirectives,
  summarizeText,
  resolveOutputFormat,
  resolveEdgeOutputFormat,
};
