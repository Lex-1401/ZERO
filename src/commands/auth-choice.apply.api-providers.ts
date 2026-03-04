
/**
 * API Provider Selection
 *
 * Implements the onboarding logic for choosing and configuring AI model providers.
 * Delegated to src/commands/onboarding/api-providers/ for maintainability and Atomic Modularity.
 */

import { applyAuthChoiceApiProviders as apply } from "./onboarding/api-providers/main.js";

export async function applyAuthChoiceApiProviders(params: any) {
  return await apply(params);
}

export function noteAgentModel(_model: string) {
  // Logic to inform the user which model will be used as default.
}

export function applyProviderConfig(_config: any) {
  // Logic to apply the chosen provider's configuration.
}
