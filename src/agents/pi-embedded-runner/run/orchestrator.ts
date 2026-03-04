// @ts-nocheck

import { type RunEmbeddedPiAgentParams } from "./params.js";
import { type EmbeddedPiRunResult } from "../types.js";
import { applyApiKeyInfo } from "./auth.js";

export async function runEmbeddedPiAgent(
    params: RunEmbeddedPiAgentParams,
): Promise<EmbeddedPiRunResult> {
    const startTime = Date.now();
    // Logic to build payloads, call the LLM, and handle tool executions.
    // Omitted for brevity in this stage, will be copied from original.

    await applyApiKeyInfo(params.apiKey);

    return {
        status: "ok",
        runId: "default",
        durationMs: Date.now() - startTime,
    } as any;
}
