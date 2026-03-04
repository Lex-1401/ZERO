
/**
 * Pi Embedded Runner - Execution Entry
 *
 * Implements the core execution loop for Pi agents.
 * Delegated to src/agents/pi-embedded-runner/run/ for maintainability and Atomic Modularity.
 */

import { type RunEmbeddedPiAgentParams } from "./run/params.js";
import { type EmbeddedPiRunResult } from "./types.js";
import { runEmbeddedPiAgent as runOrchestratedAgent } from "./run/orchestrator.js";

export async function runEmbeddedPiAgent(
  params: RunEmbeddedPiAgentParams,
): Promise<EmbeddedPiRunResult> {
  return runOrchestratedAgent(params);
}

export function scrubAnthropicRefusalMagic(prompt: string): string {
  return prompt.replace(/ANTHROPIC_MAGIC_STRING_TRIGGER_REFUSAL/g, "REDACTED");
}
