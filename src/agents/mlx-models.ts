import type { ModelDefinitionConfig } from "../config/types.models.js";

export const MLX_BASE_URL = "http://127.0.0.1:8080/v1";
const MLX_DEFAULT_CONTEXT_WINDOW = 32768;
const MLX_DEFAULT_MAX_TOKENS = 8192;
const MLX_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

export async function discoverMlxModels(): Promise<ModelDefinitionConfig[]> {
  // Skip MLX discovery in test environments
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return [];
  }
  try {
    // MLX compatible server usually has /v1/models
    const response = await fetch(`${MLX_BASE_URL}/models`, {
      signal: AbortSignal.timeout(2000), // Fast timeout for local check
    });
    if (!response.ok) return [];

    const data = (await response.json()) as any;
    // OpenAI format: { data: [{ id: "model-name", ... }] }
    const models = data.data || data.models || [];

    if (!Array.isArray(models) || models.length === 0) return [];

    return models.map((model: any) => {
      const modelId = model.id;
      return {
        id: modelId,
        name: `MLX: ${modelId}`,
        reasoning: false,
        input: ["text"],
        cost: MLX_DEFAULT_COST,
        contextWindow: MLX_DEFAULT_CONTEXT_WINDOW,
        maxTokens: MLX_DEFAULT_MAX_TOKENS,
      };
    });
  } catch {
    return [];
  }
}
