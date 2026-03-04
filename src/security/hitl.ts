import crypto from "node:crypto";
import { getToolRisk, getShellCommandRisk } from "./guard/main.js";
import { callGatewayTool } from "../agents/tools/gateway.js";

export type HITLApprovalRequest = {
    toolName: string;
    args: any;
    risk: number;
    agentId?: string;
    sessionKey?: string;
};

export async function checkToolHITL(params: HITLApprovalRequest): Promise<{ approved: boolean; reason?: string }> {
    const { toolName, args, risk, agentId, sessionKey } = params;

    if (risk < 3) return { approved: true };

    const approvalId = crypto.randomUUID();

    // We reuse the existing exec approval infrastructure if possible, or create a generic one.
    // Since Altair expects a certain format, we'll try to match it.
    try {
        const response = await callGatewayTool(
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
        ) as any;

        // If the gateway tool returns immediately, it might be an async request.
        // We need the gateway to actually WAIT for user input if it's a tool execution pause.
        // But the current `exec.approval.request` in ZERO seems to be async.

        // Let's check how the gateway handles this.
        return { approved: false, reason: "PENDING_APPROVAL" };
    } catch (err) {
        return { approved: false, reason: `Approval system error: ${String(err)}` };
    }
}
