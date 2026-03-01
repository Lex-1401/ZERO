export const AUTO_AUDIO_KEY_PROVIDERS = ["openai", "groq", "deepgram", "google"] as const;
export const AUTO_IMAGE_KEY_PROVIDERS = ["openai", "anthropic", "google", "minimax"] as const;
export const AUTO_VIDEO_KEY_PROVIDERS = ["google"] as const;
export const DEFAULT_IMAGE_MODELS: Record<string, string> = {
    openai: "gpt-5-mini",
    anthropic: "claude-opus-4-5",
    google: "gemini-3-flash-preview",
    minimax: "MiniMax-VL-01",
};
