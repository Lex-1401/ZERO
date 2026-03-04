import crypto from "node:crypto";
import { callGatewayTool } from "../agents/tools/gateway.js";

export type HITLApprovalRequest = {
    toolName: string;
    args: any;
    risk: number;
    agentId?: string;
    sessionKey?: string;
};

/**
 * Checks if a tool execution needs human-in-the-loop approval based on risk.
 */
export async function checkToolHITL(params: HITLApprovalRequest): Promise<{ approved: boolean; reason?: string }> {
    const { toolName, args, risk, agentId, sessionKey } = params;

    if (risk < 3) return { approved: true };

    const approvalId = crypto.randomUUID();

    try {
        await callGatewayTool(
            "exec.approval.request",
            { timeoutMs: 120000 },
            {
                approvalId,
                agentId,
                sessionKey,
                command: toolName === "exec" ? args.command : `Tool: ${toolName}`,
                args: JSON.stringify(args),
                risk,
                ask: "always"
            }
        );

        return { approved: false, reason: "PENDING_APPROVAL" };
    } catch (err) {
        return { approved: false, reason: `Approval system error: ${String(err)}` };
    }
}
