
import { z } from "zod";

export const TtsProviderSchema = z.enum(["elevenlabs", "openai", "edge"]);
export type TtsProvider = z.infer<typeof TtsProviderSchema>;

export const TtsModeSchema = z.enum(["final", "all"]);
export type TtsMode = z.infer<typeof TtsModeSchema>;

export const TtsAutoSchema = z.enum(["off", "always", "inbound", "tagged"]);
export type TtsAuto = z.infer<typeof TtsAutoSchema>;
export type TtsAutoMode = TtsAuto;

export const TtsElevenLabsSettingsSchema = z
    .object({
        stability: z.number().min(0).max(1).optional(),
        similarityBoost: z.number().min(0).max(1).optional(),
        style: z.number().min(0).max(1).optional(),
        useSpeakerBoost: z.boolean().optional(),
        speed: z.number().min(0.5).max(2).optional(),
    })
    .strict();

export interface TtsModelOverrideConfig {
    enabled?: boolean;
    allowText?: boolean;
    allowProvider?: boolean;
    allowVoice?: boolean;
    allowModelId?: boolean;
    allowVoiceSettings?: boolean;
    allowNormalization?: boolean;
    allowSeed?: boolean;
}

export const TtsConfigSchema = z
    .object({
        auto: TtsAutoSchema.optional(),
        enabled: z.boolean().optional(),
        mode: TtsModeSchema.optional(),
        provider: TtsProviderSchema.optional(),
        summaryModel: z.string().optional(),
        modelOverrides: z.record(z.string(), z.string()).optional(),
        elevenlabs: z
            .object({
                apiKey: z.string().optional(),
                modelId: z.string().optional(),
                voiceId: z.string().optional(),
                settings: TtsElevenLabsSettingsSchema.optional(),
            })
            .strict()
            .optional(),
        openai: z
            .object({
                apiKey: z.string().optional(),
                model: z.string().optional(),
                voice: z.string().optional(),
            })
            .strict()
            .optional(),
        edge: z
            .object({
                voice: z.string().optional(),
            })
            .strict()
            .optional(),
        prefsPath: z.string().optional(),
        maxTextLength: z.number().int().min(1).optional(),
        timeoutMs: z.number().int().min(1000).max(120000).optional(),
    })
    .strict();

export type TtsConfig = z.infer<typeof TtsConfigSchema>;

export const TranscribeAudioSchema = z
    .object({
        command: z.array(z.string()).optional(),
        openai: z
            .object({
                apiKey: z.string().optional(),
                model: z.string().optional(),
            })
            .strict()
            .optional(),
        whisper: z
            .object({
                api: z
                    .object({
                        baseUrl: z.string().optional(),
                        apiKey: z.string().optional(),
                        keyPrefix: z.string().optional(),
                    })
                    .strict()
                    .optional(),
            })
            .strict()
            .optional(),
    })
    .strict();

export type TranscribeAudioConfig = z.infer<typeof TranscribeAudioSchema>;
