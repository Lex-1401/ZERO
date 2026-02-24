import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import {
    TtsConfig,
    TtsAutoMode,
    TtsProvider,
    TtsModelOverrideConfig
} from "../config/types.tts.js";
import { ZEROConfig } from "../config/config.js";
import {
    ResolvedTtsConfig,
    ResolvedTtsModelOverrides
} from "./tts.types.js";
import { CONFIG_DIR, resolveUserPath } from "../utils.js";
import { normalizeTtsAutoMode } from "./tts.utils.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TEXT_LENGTH = 4000;
const DEFAULT_ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";
const DEFAULT_ELEVENLABS_VOICE_ID = "pMsXgVXv3BLzUgSXRplE";
const DEFAULT_ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini-tts";
const DEFAULT_OPENAI_VOICE = "alloy";
const DEFAULT_EDGE_VOICE = "en-US-MichelleNeural";
const DEFAULT_EDGE_LANG = "en-US";
const DEFAULT_EDGE_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

const DEFAULT_ELEVENLABS_VOICE_SETTINGS = {
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.0,
    useSpeakerBoost: true,
    speed: 1.0,
};

export function resolveModelOverridePolicy(overrides: TtsModelOverrideConfig | undefined): ResolvedTtsModelOverrides {
    const enabled = overrides?.enabled ?? true;
    if (!enabled) {
        return {
            enabled: false, allowText: false, allowProvider: false, allowVoice: false,
            allowModelId: false, allowVoiceSettings: false, allowNormalization: false, allowSeed: false,
        };
    }
    const allow = (v?: boolean) => v ?? true;
    return {
        enabled: true,
        allowText: allow(overrides?.allowText),
        allowProvider: allow(overrides?.allowProvider),
        allowVoice: allow(overrides?.allowVoice),
        allowModelId: allow(overrides?.allowModelId),
        allowVoiceSettings: allow(overrides?.allowVoiceSettings),
        allowNormalization: allow(overrides?.allowNormalization),
        allowSeed: allow(overrides?.allowSeed),
    };
}

export function resolveTtsConfig(cfg: ZEROConfig): ResolvedTtsConfig {
    const raw: TtsConfig = cfg.messages?.tts ?? {};
    return {
        auto: normalizeTtsAutoMode(raw.auto) ?? (raw.enabled ? "always" : "off"),
        mode: raw.mode ?? "final",
        provider: raw.provider ?? "edge",
        providerSource: raw.provider ? "config" : "default",
        summaryModel: raw.summaryModel?.trim() || undefined,
        modelOverrides: resolveModelOverridePolicy(raw.modelOverrides),
        elevenlabs: {
            apiKey: raw.elevenlabs?.apiKey,
            baseUrl: raw.elevenlabs?.baseUrl?.trim() || DEFAULT_ELEVENLABS_BASE_URL,
            voiceId: raw.elevenlabs?.voiceId ?? DEFAULT_ELEVENLABS_VOICE_ID,
            modelId: raw.elevenlabs?.modelId ?? DEFAULT_ELEVENLABS_MODEL_ID,
            voiceSettings: {
                stability: raw.elevenlabs?.voiceSettings?.stability ?? DEFAULT_ELEVENLABS_VOICE_SETTINGS.stability,
                similarityBoost: raw.elevenlabs?.voiceSettings?.similarityBoost ?? DEFAULT_ELEVENLABS_VOICE_SETTINGS.similarityBoost,
                style: raw.elevenlabs?.voiceSettings?.style ?? DEFAULT_ELEVENLABS_VOICE_SETTINGS.style,
                useSpeakerBoost: raw.elevenlabs?.voiceSettings?.useSpeakerBoost ?? DEFAULT_ELEVENLABS_VOICE_SETTINGS.useSpeakerBoost,
                speed: raw.elevenlabs?.voiceSettings?.speed ?? DEFAULT_ELEVENLABS_VOICE_SETTINGS.speed,
            },
        },
        openai: {
            apiKey: raw.openai?.apiKey,
            model: raw.openai?.model ?? DEFAULT_OPENAI_MODEL,
            voice: raw.openai?.voice ?? DEFAULT_OPENAI_VOICE,
        },
        edge: {
            enabled: raw.edge?.enabled ?? true,
            voice: raw.edge?.voice?.trim() || DEFAULT_EDGE_VOICE,
            lang: raw.edge?.lang?.trim() || DEFAULT_EDGE_LANG,
            outputFormat: raw.edge?.outputFormat?.trim() || DEFAULT_EDGE_OUTPUT_FORMAT,
            outputFormatConfigured: Boolean(raw.edge?.outputFormat),
            saveSubtitles: raw.edge?.saveSubtitles ?? false,
        },
        prefsPath: raw.prefsPath,
        maxTextLength: raw.maxTextLength ?? 4000,
        timeoutMs: raw.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    };
}

export function resolveTtsPrefsPath(config: ResolvedTtsConfig): string {
    if (config.prefsPath?.trim()) return resolveUserPath(config.prefsPath.trim());
    return path.join(CONFIG_DIR, "settings", "tts.json");
}

import { TtsUserPrefs } from "./tts.types.js";

export function getTtsProvider(config: ResolvedTtsConfig, prefsPath: string): TtsProvider {
    if (config.providerSource === "config") return config.provider;

    if (existsSync(prefsPath)) {
        try {
            const prefs = JSON.parse(readFileSync(prefsPath, "utf-8")) as TtsUserPrefs;
            if (prefs.tts?.provider) return prefs.tts.provider;
        } catch { /* ignore */ }
    }

    if (process.env.OPENAI_API_KEY) return "openai";
    if (process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY) return "elevenlabs";
    return "edge";
}
