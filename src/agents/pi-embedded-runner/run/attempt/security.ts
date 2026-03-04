// @ts-nocheck

import { SecurityGuard } from "../../../../security/guard.js";
import { MemoryIndexManager } from "../../../../memory/manager.js";
import { loadRoleDefinition, syncRoleCronJobs } from "../../../../roles/manager.js";
import { log } from "../logger.js";
import { type EmbeddedRunAttemptParams } from "../types.js";

export async function performSecurityAndMemorySetup(params: EmbeddedRunAttemptParams, sessionAgentId: string) {
    // LLM01: Prompt Injection Guard
    const injection = SecurityGuard.detectPromptInjection(params.prompt);
    if (injection) {
        log.warn(`Blocked prompt injection attempt: ${injection.details}`);
        throw new Error(`Security Violation: ${injection.details}`);
    }

    // LLM06: PII Redaction Middleware (Input)
    const obfuscatedPrompt = SecurityGuard.obfuscatePrompt(params.prompt);
    if (obfuscatedPrompt !== params.prompt) {
        log.info(`SecurityGuard: Obfuscated PII in user prompt`);
        params.prompt = obfuscatedPrompt;
    }

    // Auto-Recall: Inject relevant memories into system prompt
    let memoryContextString = "";
    if (params.prompt && params.prompt.length > 5) {
        try {
            const memoryManager = await MemoryIndexManager.get({
                cfg: params.config ?? {},
                agentId: sessionAgentId,
            });

            if (memoryManager) {
                const memories = await memoryManager.search(params.prompt, {
                    maxResults: 5,
                    minScore: 0.6,
                    sessionKey: params.sessionKey,
                });

                if (memories.length > 0) {
                    memoryContextString = [
                        "",
                        "## Memórias Relevantes (Auto-Recall)",
                        "Informações recuperadas da memória de longo prazo que podem ser relevantes:",
                        ...memories.map((m) => `- ${m.snippet} (Confidence: ${m.score.toFixed(2)})`),
                        "",
                    ].join("\n");
                    log.debug(`Auto-recalled ${memories.length} memories for prompt: "${params.prompt.substring(0, 50)}..."`);
                }
            }
        } catch (err) {
            log.warn(`Auto-recall failed: ${String(err)}`);
        }
    }

    const roleDef = params.role ? await loadRoleDefinition(params.role) : null;
    if (params.role && !roleDef) {
        log.warn(`Role definition not found for: ${params.role}`);
    }
    if (roleDef) {
        await syncRoleCronJobs(roleDef);
    }

    return { memoryContextString, roleDef };
}
