
import { type ClientToolDefinition } from "../../agents/pi-embedded-runner/run/params.js";

export function applyToolChoice(params: {
    tools: ClientToolDefinition[];
    toolChoice: any;
}): { tools: ClientToolDefinition[]; extraSystemPrompt?: string } {
    const { tools, toolChoice } = params;
    if (!toolChoice) return { tools };
    if (toolChoice === "none") return { tools: [] };
    if (toolChoice === "auto" || toolChoice === "required") return { tools };
    if (typeof toolChoice === "object" && toolChoice.type === "function") {
        const name = toolChoice.function?.name;
        const exists = tools.find((t) => t.function.name === name);
        if (exists) return { tools: [exists] };
    }
    return { tools, extraSystemPrompt: `Exclusively use the tool: ${JSON.stringify(toolChoice)}` };
}

export function buildAgentPrompt(input: any): {
    message: string;
    extraSystemPrompt?: string;
} {
    if (typeof input === "string") return { message: input };
    if (Array.isArray(input)) {
        const lastUser = input.filter((i: any) => i.role === "user").pop();
        const history = input.slice(0, input.length - 1);
        const message = lastUser ? lastUser.content?.toString() ?? "" : "";
        const historyPrompt = history.length > 0 ? `Conversation history:\n${JSON.stringify(history)}\n\n` : "";
        return {
            message,
            extraSystemPrompt: historyPrompt ? `${historyPrompt}\nFollow the history context above.` : undefined
        };
    }
    return { message: "" };
}
