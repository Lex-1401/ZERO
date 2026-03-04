
import { GraphRagPlugin } from "../../src/memory/graph-plugin.js";

export default function register(api: any) {
    const config = api.pluginConfig || { autoExtract: true, injectContext: true };

    if (config.injectContext) {
        api.on("before_agent_start", async (params: any) => {
            return await GraphRagPlugin.onBeforeAgentStart({
                prompt: params.prompt,
                cfg: api.config,
                agentId: api.id
            });
        });
    }

    if (config.autoExtract) {
        api.on("agent_end", async (params: any) => {
            await GraphRagPlugin.onAgentEnd({
                messages: params.messages,
                cfg: api.config,
                agentId: api.id
            });
        });
    }

    api.logger.info("Graph-RAG plugin registered and active.");
}
