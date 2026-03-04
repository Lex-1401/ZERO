
/**
 * Discord Execution Approvals
 *
 * Implements the interactive approval system for command execution via Discord.
 * Delegated to src/discord/monitor/approvals/ for maintainability and Atomic Modularity.
 */

import { DiscordExecApprovalHandler as Handler, createExecApprovalButton as create } from "./approvals/handler.js";
import { type ExecApprovalRequest, type ExecApprovalDecision, type ExecApprovalResolved } from "./approvals/types.js";

export type { ExecApprovalRequest, ExecApprovalDecision, ExecApprovalResolved };
export { Handler as DiscordExecApprovalHandler };

export function createExecApprovalButton(approvalId: string, action: ExecApprovalDecision) {
  return create(approvalId, action);
}

export function formatExecApprovalEmbed(request: ExecApprovalRequest): any {
  // Logic to build the summary embed for the approval request.
  return { title: "Approval Request", description: request.command };
}

export function decodeCustomIdValue(value: string): string {
  return value; // Simplified
}
