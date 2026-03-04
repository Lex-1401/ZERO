
/**
 * Agent System Prompt Infrastructure
 *
 * Implements the system prompt generation for agents.
 * Delegated to src/agents/prompt/ for maintainability and Atomic Modularity.
 */

import { buildAgentSystemPrompt as buildPrompt } from "./prompt/builder.js";
import { type ThinkLevel, type ReasoningLevel } from "../auto-reply/thinking.js";

export function buildAgentSystemPrompt(params: {
  workspaceDir: string;
  defaultThinkLevel?: ThinkLevel;
  reasoningLevel?: ReasoningLevel;
  extraSystemPrompt?: string;
  ownerNumbers?: string[];
  reasoningTagHint?: boolean;
  toolNames?: string[];
  mode?: "minimal" | "none"; // Simplified
  memoryPreferences?: string;
}): string {
  return buildPrompt(params);
}

export function buildRuntimeLine(params: any): string {
  return `Runtime: ${params.agentId} on ${params.hostname}`;
}
