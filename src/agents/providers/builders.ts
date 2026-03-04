
import { type ProviderConfig } from "./types.js";

export function buildMinimaxProvider(): ProviderConfig {
    return {
        baseUrl: "https://api.minimax.io/anthropic",
        models: ["MiniMax-M2.1", "MiniMax-VL-01"],
    };
}

export function buildMoonshotProvider(): ProviderConfig {
    return {
        baseUrl: "https://api.moonshot.cn/v1",
        models: ["moonshot-v1-8k", "moonshot-v1-32k"],
    };
}
