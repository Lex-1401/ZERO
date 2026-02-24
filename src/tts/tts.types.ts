import type {
    TtsAutoMode,
    TtsMode,
    TtsProvider
} from "../config/types.tts.js";

export type ResolvedTtsConfig = {
    auto: TtsAutoMode;
    mode: TtsMode;
    provider: TtsProvider;
    providerSource: "config" | "default";
    summaryModel?: string;
    modelOverrides: ResolvedTtsModelOverrides;
    elevenlabs: {
        apiKey?: string;
        baseUrl: string;
        voiceId: string;
        modelId: string;
        seed?: number;
        applyTextNormalization?: "auto" | "on" | "off";
        languageCode?: string;
        voiceSettings: {
            stability: number;
            similarityBoost: number;
            style: number;
            useSpeakerBoost: boolean;
            speed: number;
        };
    };
    openai: {
        apiKey?: string;
        model: string;
        voice: string;
    };
    edge: {
        enabled: boolean;
        voice: string;
        lang: string;
        outputFormat: string;
        outputFormatConfigured: boolean;
        pitch?: string;
        rate?: string;
        volume?: string;
        saveSubtitles: boolean;
        proxy?: string;
        timeoutMs?: number;
    };
    prefsPath?: string;
    maxTextLength: number;
    timeoutMs: number;
};

export type TtsUserPrefs = {
    tts?: {
        auto?: TtsAutoMode;
        enabled?: boolean;
        provider?: TtsProvider;
        maxLength?: number;
        summarize?: boolean;
    };
};

export type ResolvedTtsModelOverrides = {
    enabled: boolean;
    allowText: boolean;
    allowProvider: boolean;
    allowVoice: boolean;
    allowModelId: boolean;
    allowVoiceSettings: boolean;
    allowNormalization: boolean;
    allowSeed: boolean;
};

export type TtsDirectiveOverrides = {
    ttsText?: string;
    provider?: TtsProvider;
    openai?: {
        voice?: string;
        model?: string;
    };
    elevenlabs?: {
        voiceId?: string;
        modelId?: string;
        seed?: number;
        applyTextNormalization?: "auto" | "on" | "off";
        languageCode?: string;
        voiceSettings?: Partial<ResolvedTtsConfig["elevenlabs"]["voiceSettings"]>;
    };
};

export type TtsDirectiveParseResult = {
    cleanedText: string;
    ttsText?: string;
    hasDirective: boolean;
    overrides: TtsDirectiveOverrides;
    warnings: string[];
};

export type TtsResult = {
    success: boolean;
    audioPath?: string;
    error?: string;
    latencyMs?: number;
    provider?: string;
    outputFormat?: string;
    voiceCompatible?: boolean;
};

export type TtsTelephonyResult = {
    success: boolean;
    audioBuffer?: Buffer;
    error?: string;
    latencyMs?: number;
    provider?: string;
    outputFormat?: string;
    sampleRate?: number;
};

export type TtsStatusEntry = {
    timestamp: number;
    success: boolean;
    textLength: number;
    summarized: boolean;
    provider?: string;
    latencyMs?: number;
    error?: string;
};

export type SummarizeResult = {
    summary: string;
    latencyMs: number;
    inputLength: number;
    outputLength: number;
};
