/**
 * @module config/types
 * Barrel re-export for all configuration types.
 * 
 * @deprecated Prefer importing directly from the specific schema module
 * (e.g., `config/schemas/tools.js`) for better tree-shaking and clarity.
 */

// Focused modules that still exist
export * from "./types.agent-defaults.js";
export * from "./types.agents.js";
export * from "./types.approvals.js";
export * from "./types.base.js";
export * from "./types.channels.js";
export * from "./types.zero.js";
export * from "./types.discord.js";
export * from "./types.gateway.js";
export * from "./types.hooks.js";
export * from "./types.messages.js";
export * from "./types.models.js";
export * from "./types.plugins.js";
export * from "./types.slack.js";
export * from "./types.telegram.js";
export * from "./types.tts.js";

// Unified schemas (new canonical source)
export type {
    ToolsConfig, ToolsWebConfig, ToolsWebSearchConfig, ToolsWebFetchConfig,
    ExecToolConfig, AgentToolsConfig, ToolPolicyConfig, ToolProfileId,
    MediaToolsConfig, MediaUnderstandingConfig, MediaUnderstandingModelConfig,
    LinkToolsConfig, AgentElevatedAllowFromConfig,
    MediaUnderstandingScopeConfig,
} from "./schemas/tools.js";
export type { MemorySearchConfig } from "./schemas/memory.js";
