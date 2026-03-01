import type { AgentMessage } from "@mariozechner/pi-agent-core";

export type PluginHookName =
  | "before_agent_start"
  | "agent_end"
  | "before_compaction"
  | "after_compaction"
  | "message_received"
  | "message_sending"
  | "message_sent"
  | "before_tool_call"
  | "after_tool_call"
  | "tool_result_persist"
  | "session_start"
  | "session_end"
  | "gateway_start"
  | "gateway_stop";

// Shared Contexts
export type PluginHookAgentContext = {
  agentId?: string;
  sessionKey?: string;
  workspaceDir?: string;
  messageProvider?: string;
};
export type PluginHookMessageContext = {
  channelId: string;
  accountId?: string;
  conversationId?: string;
};
export type PluginHookToolContext = { agentId?: string; sessionKey?: string; toolName: string };
export type PluginHookSessionContext = { agentId?: string; sessionId: string };
export type PluginHookGatewayContext = { port?: number };

// Events & Results
export type PluginHookBeforeAgentStartEvent = { prompt: string; messages?: unknown[] };
export type PluginHookBeforeAgentStartResult = { systemPrompt?: string; prependContext?: string };
export type PluginHookAgentEndEvent = {
  messages: unknown[];
  success: boolean;
  error?: string;
  durationMs?: number;
};
export type PluginHookBeforeCompactionEvent = { messageCount: number; tokenCount?: number };
export type PluginHookAfterCompactionEvent = {
  messageCount: number;
  tokenCount?: number;
  compactedCount: number;
};
export type PluginHookMessageReceivedEvent = {
  from: string;
  content: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
};
export type PluginHookMessageSendingEvent = {
  to: string;
  content: string;
  metadata?: Record<string, unknown>;
};
export type PluginHookMessageSendingResult = { content?: string; cancel?: boolean };
export type PluginHookMessageSentEvent = {
  to: string;
  content: string;
  success: boolean;
  error?: string;
};
export type PluginHookBeforeToolCallEvent = { toolName: string; params: Record<string, unknown> };
export type PluginHookBeforeToolCallResult = {
  params?: Record<string, unknown>;
  block?: boolean;
  blockReason?: string;
};
export type PluginHookAfterToolCallEvent = {
  toolName: string;
  params: Record<string, unknown>;
  result?: unknown;
  error?: string;
  durationMs?: number;
};
export type PluginHookToolResultPersistContext = {
  agentId?: string;
  sessionKey?: string;
  toolName?: string;
  toolCallId?: string;
};
export type PluginHookToolResultPersistEvent = {
  toolName?: string;
  toolCallId?: string;
  message: AgentMessage;
  isSynthetic?: boolean;
};
export type PluginHookToolResultPersistResult = { message?: AgentMessage };
export type PluginHookSessionStartEvent = { sessionId: string; resumedFrom?: string };
export type PluginHookSessionEndEvent = {
  sessionId: string;
  messageCount: number;
  durationMs?: number;
};
export type PluginHookGatewayStartEvent = { port: number };
export type PluginHookGatewayStopEvent = { reason?: string };
