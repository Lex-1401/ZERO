
import { type ZEROConfig } from "../config/config.js";
import { resolveAgentConfig } from "../agents/agent-scope.js";
import { resolveApiKeyForProvider } from "../agents/model-auth.js";

export type GraphExtractionResult = {
    entities: Array<{
        name: string;
        type: string;
        description?: string;
    }>;
    relations: Array<{
        source: string;
        target: string;
        relation: string;
        description?: string;
    }>;
};

const EXTRACTION_PROMPT = `
Extract entities and their relationships from the provided text.
Return the result EXCLUSIVELY as a valid JSON object with the following structure:
{
  "entities": [
    { "name": "Entity Name", "type": "person|organization|project|concept|location|tool", "description": "Brief context" }
  ],
  "relations": [
    { "source": "Entity Name A", "target": "Entity Name B", "relation": "type of relationship", "description": "Context of the link" }
  ]
}

Focus on facts, preferences, and long-term relationships.
Text to analyze:
---
{TEXT}
---
`;

export async function extractEntitiesFromText(params: {
    text: string;
    cfg: ZEROConfig;
    agentId: string;
}): Promise<GraphExtractionResult> {
    const agentCfg = resolveAgentConfig(params.cfg, params.agentId);
    const model = agentCfg?.model;

    // Simplified model resolution logic for the extraction runner
    let provider = "openai";
    let modelName = "gpt-4o";

    if (typeof model === "string") {
        if (model.includes("gemini")) provider = "gemini";
        modelName = model;
    } else if (model?.primary) {
        if (model.primary.includes("gemini")) provider = "gemini";
        modelName = model.primary;
    }

    const auth = await resolveApiKeyForProvider({
        provider: provider as any,
        cfg: params.cfg,
        agentDir: agentCfg?.agentDir
    });

    const apiKey = typeof auth === "string" ? auth : (auth as any)?.key;

    if (!apiKey) {
        throw new Error(`No API key found for extraction provider: ${provider}`);
    }

    // Implementation of a minimal LLM call (assuming OpenAI-compatible or Gemini)
    // For production, this would use the centralized Runner system of the project.
    return await callLlmForExtraction({
        provider,
        model: modelName,
        apiKey,
        prompt: EXTRACTION_PROMPT.replace("{TEXT}", params.text)
    });
}

async function callLlmForExtraction(_params: {
    provider: string;
    model: string;
    apiKey: string;
    prompt: string;
}): Promise<GraphExtractionResult> {
    // Mocking the call since we don't have the full runner infrastructure imported here
    // In a real implementation, this would fetch from the configured gateway or direct API

    // Fallback to empty result if we can't make the call
    // This is a placeholder for the actual integration with the project's LLM runners
    return { entities: [], relations: [] };
}
