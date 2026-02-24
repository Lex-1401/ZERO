import { EdgeTTS } from "node-edge-tts";
import {
    ResolvedTtsConfig,
} from "./tts.types.js";
import {
    isValidVoiceId,
    isValidOpenAIModel,
    isValidOpenAIVoice
} from "./tts.utils.js";

const OPENAI_TTS_BASE_URL = (
    process.env.OPENAI_TTS_BASE_URL?.trim() || "https://api.openai.com/v1"
).replace(/\/+$/, "");
const isCustomOpenAIEndpoint = OPENAI_TTS_BASE_URL !== "https://api.openai.com/v1";

export async function elevenLabsTTS(params: {
    text: string;
    apiKey: string;
    baseUrl: string;
    voiceId: string;
    modelId: string;
    outputFormat: string;
    seed?: number;
    applyTextNormalization?: "auto" | "on" | "off";
    languageCode?: string;
    voiceSettings: ResolvedTtsConfig["elevenlabs"]["voiceSettings"];
    timeoutMs: number;
}): Promise<Buffer> {
    const { text, apiKey, baseUrl, voiceId, modelId, outputFormat, timeoutMs } = params;
    if (!isValidVoiceId(voiceId)) throw new Error("Invalid voiceId");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const url = new URL(`${baseUrl.replace(/\/$/, "")}/v1/text-to-speech/${voiceId}`);
        if (outputFormat) url.searchParams.set("output_format", outputFormat);

        const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text,
                model_id: modelId,
                voice_settings: params.voiceSettings,
            }),
            signal: controller.signal,
        });

        if (!response.ok) throw new Error(`ElevenLabs error: ${response.status}`);
        return Buffer.from(await response.arrayBuffer());
    } finally {
        clearTimeout(timeout);
    }
}

export async function openaiTTS(params: {
    text: string;
    apiKey: string;
    model: string;
    voice: string;
    responseFormat: "mp3" | "opus" | "pcm";
    timeoutMs: number;
}): Promise<Buffer> {
    const { text, apiKey, model, voice, responseFormat, timeoutMs } = params;
    if (!isValidOpenAIModel(model, isCustomOpenAIEndpoint)) throw new Error("Invalid model");
    if (!isValidOpenAIVoice(voice, isCustomOpenAIEndpoint)) throw new Error("Invalid voice");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(`${OPENAI_TTS_BASE_URL}/audio/speech`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ model, input: text, voice, response_format: responseFormat }),
            signal: controller.signal,
        });

        if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
        return Buffer.from(await response.arrayBuffer());
    } finally {
        clearTimeout(timeout);
    }
}

export async function edgeTTS(params: {
    text: string;
    outputPath: string;
    config: ResolvedTtsConfig["edge"];
    timeoutMs: number;
}): Promise<void> {
    const { text, outputPath, config, timeoutMs } = params;
    const tts = new EdgeTTS({
        voice: config.voice,
        lang: config.lang,
        outputFormat: config.outputFormat,
        saveSubtitles: config.saveSubtitles,
        proxy: config.proxy,
        rate: config.rate,
        pitch: config.pitch,
        volume: config.volume,
        timeout: config.timeoutMs ?? timeoutMs,
    });
    await tts.ttsPromise(text, outputPath);
}
