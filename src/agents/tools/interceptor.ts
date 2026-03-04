import type { AnyAgentTool } from "./common.js";
import { getToolRisk, getShellCommandRisk } from "../../security/guard/main.js";
import { checkToolHITL } from "../../security/hitl.js";
import { detectAuthRequirement, buildAuthLink } from "../../security/auth-jit.js";
import { logInfo, logWarn } from "../../logger.js";
import { getPluginToolMeta } from "../../plugins/tools.js";

export function wrapToolWithInterceptors(tool: AnyAgentTool, context: any): AnyAgentTool {
    const originalExecute = tool.execute;
    if (!originalExecute) return tool;

    return {
        ...tool,
        execute: async (toolCallId, args, signal, onUpdate) => {
            const toolName = tool.name;
            const risk = toolName === "exec" || toolName === "bash"
                ? getShellCommandRisk(args.command || "")
                : getToolRisk(toolName, args);

            // 1. HITL Intercept
            if (risk >= 3) {
                logWarn(`HITL Intercept: Tool ${toolName} has high risk (${risk}). Checking for approval...`);
                const hitl = await checkToolHITL({
                    toolName,
                    args,
                    risk,
                    agentId: context.agentId,
                    sessionKey: context.sessionKey
                });

                if (!hitl.approved) {
                    if (hitl.reason === "PENDING_APPROVAL") {
                        return {
                            content: [{ type: "text", text: `⚠️ APROVAÇÃO NECESSÁRIA: Este comando (${toolName}) requer autorização manual devido ao alto risco. Por favor, verifique sua interface Altair ou console.` }],
                            details: { status: "pending_approval", risk }
                        };
                    }
                    throw new Error(`Execution denied: ${hitl.reason}`);
                }
            }

            // 2. Execute and 3. JIT Auth
            try {
                const result = await originalExecute(toolCallId, args, signal, onUpdate);
                return result;
            } catch (err) {
                const authLink = detectAuthRequirement(err);
                if (authLink) {
                    const meta = getPluginToolMeta(tool);
                    const pluginLabel = meta?.pluginId || toolName;
                    logInfo(`JIT Auth Triggered for tool ${toolName} (plugin: ${pluginLabel})`);
                    const link = buildAuthLink(pluginLabel);
                    return {
                        content: [{ type: "text", text: `🔑 AUTENTICAÇÃO NECESSÁRIA: Para usar esta ferramenta (${toolName}), você precisa autorizar o acesso.\n\nClique aqui: ${link}` }],
                        details: { status: "auth_required", pluginId: pluginLabel }
                    };
                }
                throw err;
            }
        }
    };
}
