/**
 * @module config/types.base
 * @deprecated Re-export shim — import directly from 'config/schemas/core-base.js' instead.
 */
export type {
  ReplyMode, TypingMode, SessionScope, DmScope, ReplyToMode,
  GroupPolicy, DmPolicy, MarkdownTableMode, MarkdownConfig,
  NativeCommandsSetting, ScopeMatchConfig, ScopeRuleConfig, ScopeConfig
} from "./schemas/core-base.js";

// Legacy aliases for backward compatibility
export type { ScopeConfig as SessionSendPolicyConfig } from "./schemas/core-base.js";
export type { ScopeMatchConfig as SessionSendPolicyMatch } from "./schemas/core-base.js";
export type { ScopeRuleConfig as SessionSendPolicyRule } from "./schemas/core-base.js";

export type { OutboundRetryConfig, HumanDelayConfig, BlockStreamingCoalesceConfig, BlockStreamingChunkConfig } from "./schemas/common.js";
export type { IdentityConfig } from "./schemas/identity.js";
export type { AgentElevatedAllowFromConfig } from "./schemas/tools.js";

// Types that were in types.base but not yet migrated to schemas
import type { NormalizedChatType } from "../channels/chat-type.js";
export type SessionSendPolicyAction = "allow" | "deny";
export type SessionResetMode = "daily" | "idle";
export type SessionResetConfig = {
  mode?: SessionResetMode;
  atHour?: number;
  idleMinutes?: number;
};
export type SessionResetByTypeConfig = {
  dm?: SessionResetConfig;
  group?: SessionResetConfig;
  thread?: SessionResetConfig;
};
export type SessionConfig = {
  scope?: "per-sender" | "global";
  dmScope?: "main" | "per-peer" | "per-channel-peer";
  identityLinks?: Record<string, string[]>;
  resetTriggers?: string[];
  idleMinutes?: number;
  reset?: SessionResetConfig;
  resetByType?: SessionResetByTypeConfig;
  resetByChannel?: Record<string, SessionResetConfig>;
  store?: string;
  typingIntervalSeconds?: number;
  typingMode?: "never" | "instant" | "thinking" | "message";
  mainKey?: string;
  sendPolicy?: { default?: SessionSendPolicyAction; rules?: Array<{ action: SessionSendPolicyAction; match?: { channel?: string; chatType?: NormalizedChatType; keyPrefix?: string } }> };
  agentToAgent?: { maxPingPongTurns?: number };
  encrypt?: boolean;
};
export type LoggingConfig = {
  level?: "silent" | "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  file?: string;
  consoleLevel?: "silent" | "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  consoleStyle?: "pretty" | "compact" | "json";
  redactSensitive?: "off" | "tools";
  redactPatterns?: string[];
};
export type DiagnosticsOtelConfig = {
  enabled?: boolean;
  endpoint?: string;
  protocol?: "http/protobuf" | "grpc";
  headers?: Record<string, string>;
  serviceName?: string;
  traces?: boolean;
  metrics?: boolean;
  logs?: boolean;
  sampleRate?: number;
  flushIntervalMs?: number;
};
export type DiagnosticsCacheTraceConfig = {
  enabled?: boolean;
  filePath?: string;
  includeMessages?: boolean;
  includePrompt?: boolean;
  includeSystem?: boolean;
};
export type DiagnosticsConfig = {
  enabled?: boolean;
  flags?: string[];
  otel?: DiagnosticsOtelConfig;
  cacheTrace?: DiagnosticsCacheTraceConfig;
};
export type WebReconnectConfig = {
  initialMs?: number;
  maxMs?: number;
  factor?: number;
  jitter?: number;
  maxAttempts?: number;
};
export type WebConfig = {
  enabled?: boolean;
  heartbeatSeconds?: number;
  reconnect?: WebReconnectConfig;
};
