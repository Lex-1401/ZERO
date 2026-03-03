import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { SessionManager } from "@mariozechner/pi-coding-agent";

import { getGlobalHookRunner } from "../plugins/hook-runner-global.js";
import { installSessionToolResultGuard } from "./session-tool-result-guard.js";
import { SecurityGuard } from "../security/guard.js";

export type GuardedSessionManager = SessionManager & {
  /** Flush any synthetic tool results for pending tool calls. Idempotent. */
  flushPendingToolResults?: () => void;
};

/**
 * Apply the tool-result guard to a SessionManager exactly once and expose
 * a flush method on the instance for easy teardown handling.
 */
export function guardSessionManager(
  sessionManager: SessionManager,
  opts?: {
    agentId?: string;
    sessionKey?: string;
    allowSyntheticToolResults?: boolean;
  },
): GuardedSessionManager {
  if (typeof (sessionManager as GuardedSessionManager).flushPendingToolResults === "function") {
    return sessionManager as GuardedSessionManager;
  }

  const hookRunner = getGlobalHookRunner();

  const transform = (
    message: AgentMessage,
    meta: { toolCallId?: string; toolName?: string; isSynthetic?: boolean },
  ) => {
    let msg = message;
    if (hookRunner?.hasHooks("tool_result_persist")) {
      const out = hookRunner.runToolResultPersist(
        {
          toolName: meta.toolName,
          toolCallId: meta.toolCallId,
          message,
          isSynthetic: meta.isSynthetic,
        },
        {
          agentId: opts?.agentId,
          sessionKey: opts?.sessionKey,
          toolName: meta.toolName,
          toolCallId: meta.toolCallId,
        },
      );
      msg = out?.message ?? message;
    }

    // Global Output Firewall (DLP): Redact sensitive data from tool results before brain processing
    if (msg.role === "toolResult" && Array.isArray(msg.content)) {
      msg.content = msg.content.map((block) => {
        if (
          block &&
          typeof block === "object" &&
          (block as { type?: unknown }).type === "text" &&
          typeof (block as { text?: unknown }).text === "string"
        ) {
          return {
            ...block,
            text: SecurityGuard.obfuscatePrompt((block as { text: string }).text),
          };
        }
        return block;
      });
    }

    return msg;
  };

  const guard = installSessionToolResultGuard(sessionManager, {
    transformToolResultForPersistence: transform,
    allowSyntheticToolResults: opts?.allowSyntheticToolResults,
  });
  (sessionManager as GuardedSessionManager).flushPendingToolResults = guard.flushPendingToolResults;
  return sessionManager as GuardedSessionManager;
}
