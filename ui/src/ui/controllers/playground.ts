import type { AppViewState } from "../app-view-state";

export async function runPlayground(state: AppViewState) {
    if (state.playgroundLoading) return;

    state.playgroundLoading = true;
    state.playgroundOutput = "";
    state.lastError = null;
    state.requestUpdate?.();

    try {
        const payload = {
            model: state.playgroundModel,
            messages: [
                { role: "system", content: state.playgroundSystemPrompt },
                { role: "user", content: state.playgroundUserPrompt }
            ],
            temperature: state.playgroundTemperature,
            max_tokens: state.playgroundMaxTokens,
            stream: true
        };

        const response = await fetch("/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${state.password}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Failed to run playground");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === "data: [DONE]") continue;

                if (trimmed.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(trimmed.slice(6));
                        const content = data.choices?.[0]?.delta?.content || "";
                        if (content) {
                            state.playgroundOutput += content;
                            state.requestUpdate?.();
                        }
                    } catch (e) {
                        console.error("Failed to parse SSE line", trimmed, e);
                    }
                }
            }
        }
    } catch (err) {
        state.playgroundOutput = `Error: ${String(err)}`;
    } finally {
        state.playgroundLoading = false;
        state.requestUpdate?.();
    }
}

export function updatePlayground(state: AppViewState, patch: Partial<{
    systemPrompt: string;
    userPrompt: string;
    model: string;
    temperature: number;
    maxTokens: number;
    output: string;
}>) {
    if (patch.systemPrompt !== undefined) state.playgroundSystemPrompt = patch.systemPrompt;
    if (patch.userPrompt !== undefined) state.playgroundUserPrompt = patch.userPrompt;
    if (patch.model !== undefined) state.playgroundModel = patch.model;
    if (patch.temperature !== undefined) state.playgroundTemperature = patch.temperature;
    if (patch.maxTokens !== undefined) state.playgroundMaxTokens = patch.maxTokens;
    if (patch.output !== undefined) state.playgroundOutput = patch.output;

    state.requestUpdate?.();
}
