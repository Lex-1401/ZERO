/**
 * @module config/types.tts
 * @deprecated Re-export shim — import directly from 'config/schemas/tts.js' instead.
 */
export type { TtsProvider, TtsMode, TtsAuto, TtsAutoMode, TtsConfig, TranscribeAudioConfig } from "./schemas/tts.js";

/** Legacy: TtsModelOverrideConfig was removed in schema unification. */
export type TtsModelOverrideConfig = {
  enabled?: boolean;
  allowText?: boolean;
  allowProvider?: boolean;
  allowVoice?: boolean;
  allowModelId?: boolean;
  allowVoiceSettings?: boolean;
  allowNormalization?: boolean;
  allowSeed?: boolean;
};
