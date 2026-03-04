
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { hashText, type MemoryChunk } from "../internal.js";
import {
    EMBEDDING_APPROX_CHARS_PER_TOKEN,
    EMBEDDING_BATCH_MAX_TOKENS,
    EMBEDDING_RETRY_BASE_DELAY_MS,
    EMBEDDING_RETRY_MAX_DELAY_MS,
    EMBEDDING_RETRY_MAX_ATTEMPTS,
    EMBEDDING_QUERY_TIMEOUT_LOCAL_MS,
    EMBEDDING_QUERY_TIMEOUT_REMOTE_MS,
    EMBEDDING_BATCH_TIMEOUT_LOCAL_MS,
    EMBEDDING_BATCH_TIMEOUT_REMOTE_MS,
} from "../manager.types.js";
import type {
    EmbeddingProvider,
    GeminiEmbeddingClient,
    OpenAiEmbeddingClient,
} from "../embeddings.js";

const log = createSubsystemLogger("memory");

export function estimateEmbeddingTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / EMBEDDING_APPROX_CHARS_PER_TOKEN);
}

export function buildEmbeddingBatches(chunks: MemoryChunk[]): MemoryChunk[][] {
    const batches: MemoryChunk[][] = [];
    let current: MemoryChunk[] = [];
    let currentTokens = 0;

    for (const chunk of chunks) {
        const estimate = estimateEmbeddingTokens(chunk.text);
        const wouldExceed = current.length > 0 && currentTokens + estimate > EMBEDDING_BATCH_MAX_TOKENS;
        if (wouldExceed) {
            batches.push(current);
            current = [];
            currentTokens = 0;
        }
        if (current.length === 0 && estimate > EMBEDDING_BATCH_MAX_TOKENS) {
            batches.push([chunk]);
            continue;
        }
        current.push(chunk);
        currentTokens += estimate;
    }

    if (current.length > 0) {
        batches.push(current);
    }
    return batches;
}

export function computeProviderKey(
    provider: EmbeddingProvider,
    openAi?: OpenAiEmbeddingClient,
    gemini?: GeminiEmbeddingClient,
): string {
    if (provider.id === "openai" && openAi) {
        const entries = Object.entries(openAi.headers)
            .filter(([key]) => key.toLowerCase() !== "authorization")
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => [key, value]);
        return hashText(
            JSON.stringify({
                provider: "openai",
                baseUrl: openAi.baseUrl,
                model: openAi.model,
                headers: entries,
            }),
        );
    }
    if (provider.id === "gemini" && gemini) {
        const entries = Object.entries(gemini.headers)
            .filter(([key]) => {
                const lower = key.toLowerCase();
                return lower !== "authorization" && lower !== "x-goog-api-key";
            })
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => [key, value]);
        return hashText(
            JSON.stringify({
                provider: "gemini",
                baseUrl: gemini.baseUrl,
                model: gemini.model,
                headers: entries,
            }),
        );
    }
    return hashText(JSON.stringify({ provider: provider.id, model: provider.model }));
}

export function resolveEmbeddingTimeout(kind: "query" | "batch", providerId: string): number {
    const isLocal = providerId === "local";
    if (kind === "query") {
        return isLocal ? EMBEDDING_QUERY_TIMEOUT_LOCAL_MS : EMBEDDING_QUERY_TIMEOUT_REMOTE_MS;
    }
    return isLocal ? EMBEDDING_BATCH_TIMEOUT_LOCAL_MS : EMBEDDING_BATCH_TIMEOUT_REMOTE_MS;
}

export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    message: string,
): Promise<T> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return await promise;
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    try {
        return (await Promise.race([promise, timeoutPromise])) as T;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

export async function runWithConcurrency<T>(
    tasks: Array<() => Promise<T>>,
    limit: number,
): Promise<T[]> {
    if (tasks.length === 0) return [];
    const resolvedLimit = Math.max(1, Math.min(limit, tasks.length));
    const results: T[] = Array.from({ length: tasks.length });
    let next = 0;
    let firstError: unknown = null;

    const workers = Array.from({ length: resolvedLimit }, async () => {
        while (true) {
            if (firstError) return;
            const index = next;
            next += 1;
            if (index >= tasks.length) return;
            try {
                results[index] = await tasks[index]();
            } catch (err) {
                firstError = err;
                return;
            }
        }
    });

    await Promise.allSettled(workers);
    if (firstError) throw firstError;
    return results;
}

export function isRetryableEmbeddingError(message: string): boolean {
    return /(rate[_ ]limit|too many requests|429|resource has been exhausted|5\d\d|cloudflare)/i.test(
        message,
    );
}

export async function embedBatchWithRetry(params: {
    provider: EmbeddingProvider;
    texts: string[];
}): Promise<number[][]> {
    if (params.texts.length === 0) return [];
    let attempt = 0;
    let delayMs = EMBEDDING_RETRY_BASE_DELAY_MS;
    const timeoutMs = resolveEmbeddingTimeout("batch", params.provider.id);
    while (true) {
        try {
            return await withTimeout(
                params.provider.embedBatch(params.texts),
                timeoutMs,
                `memory embeddings batch timed out after ${Math.round(timeoutMs / 1000)}s`,
            );
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (!isRetryableEmbeddingError(message) || attempt >= EMBEDDING_RETRY_MAX_ATTEMPTS) throw err;
            const waitMs = Math.min(
                EMBEDDING_RETRY_MAX_DELAY_MS,
                Math.round(delayMs * (1 + Math.random() * 0.2)),
            );
            log.warn(`memory embeddings rate limited; retrying in ${waitMs}ms`);
            await new Promise((r) => setTimeout(r, waitMs));
            delayMs *= 2;
            attempt++;
        }
    }
}

export async function embedQueryWithTimeout(params: {
    provider: EmbeddingProvider;
    text: string;
    timeoutMs: number;
}): Promise<number[]> {
    log.debug("memory embeddings: query start", {
        provider: params.provider.id,
        timeoutMs: params.timeoutMs,
    });
    return await withTimeout(
        params.provider.embedQuery(params.text),
        params.timeoutMs,
        `memory embeddings query timed out after ${Math.round(params.timeoutMs / 1000)}s`,
    );
}
