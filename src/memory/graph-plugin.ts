
import { type PluginHookBeforeAgentStartResult } from "../plugins/types/hooks.js";
import { type ZEROConfig } from "../config/config.js";
import { MemoryIndexManager } from "./manager.js";
import { extractEntitiesFromText } from "./graph-extract.js";

/**
 * Automates Graph-RAG operations by hooking into the agent lifecycle.
 */
export class GraphRagPlugin {
    static async onBeforeAgentStart(params: {
        prompt: string;
        cfg: ZEROConfig;
        agentId: string;
    }): Promise<PluginHookBeforeAgentStartResult> {
        const manager = await MemoryIndexManager.get(params);
        if (!manager) return {};

        // 1. Simple entity detection (exact match in prompt)
        const entities = manager.graph.getWholeGraph();
        const mentionedEntities = entities.nodes
            .filter(node => params.prompt.toLowerCase().includes(node.name.toLowerCase()))
            .map(node => node.name);

        if (mentionedEntities.length === 0) return {};

        // 2. Fetch context for mentioned entities
        const graphContext = manager.graph.getGraphContext(mentionedEntities);

        if (!graphContext) return {};

        return {
            prependContext: `\n<knowledge-graph-context>\n${graphContext}\n</knowledge-graph-context>\n`
        };
    }

    static async onAgentEnd(params: {
        messages: any[];
        cfg: ZEROConfig;
        agentId: string;
    }): Promise<void> {
        // 1. Get the last turn of conversation
        const lastMessages = params.messages.slice(-2);
        const text = lastMessages.map(m => m.content).join("\n");
        if (!text.trim()) return;

        // 2. Extract entities and relations via LLM
        try {
            const extraction = await extractEntitiesFromText({
                text,
                cfg: params.cfg,
                agentId: params.agentId
            });

            if (extraction.entities.length === 0) return;

            // 3. Persist to KnowledgeGraph
            const manager = await MemoryIndexManager.get(params);
            if (!manager) return;

            for (const ent of extraction.entities) {
                manager.graph.addEntity(ent);
            }

            for (const rel of extraction.relations) {
                // Simple name-to-id resolution (upsert logic in KnowledgeGraph handles basic cases)
                const source = manager.graph.searchEntities(rel.source)[0];
                const target = manager.graph.searchEntities(rel.target)[0];

                if (source && target) {
                    manager.graph.addRelation({
                        source_id: source.id,
                        target_id: target.id,
                        relation: rel.relation,
                        description: rel.description
                    });
                }
            }
        } catch (err) {
            console.error("[GraphRagPlugin] failed to extract/persist knowledge:", err);
        }
    }
}
