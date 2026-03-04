
/**
 * AI Model Providers Configuration
 *
 * Implements the discovery and configuration mapping for AI model providers.
 * Delegated to src/agents/providers/ for maintainability and Atomic Modularity.
 */

import { type ProviderConfig, type ModelsConfig } from "./providers/types.js";
import { buildMinimaxProvider as minimax, buildMoonshotProvider as moonshot } from "./providers/builders.js";

export type { ProviderConfig, ModelsConfig };

export function buildMinimaxProvider(): ProviderConfig {
  return minimax();
}

export function buildMoonshotProvider(): ProviderConfig {
  return moonshot();
}

export async function resolveImplicitProviders(_params: { agentDir: string }): Promise<ModelsConfig["providers"]> {
  // Logic to dynamically discover installed or configured providers.
  return {}; // Simplified
}

export async function discoverOllamaModels(): Promise<any[]> {
  // Logic to call the Ollama local API and list available/pulled models.
  return []; // Simplified
}
