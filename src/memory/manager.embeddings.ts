
import type { DatabaseSync } from "node:sqlite";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { hashText, type MemoryChunk } from "./internal.js";
import {
  type MemoryFileEntry,
  type SessionFileEntry,
  type MemorySource,
} from "./manager.types.js";
import type {
  EmbeddingProvider,
  GeminiEmbeddingClient,
  OpenAiEmbeddingClient,
} from "./embeddings.js";
import {
  OPENAI_BATCH_ENDPOINT,
  type OpenAiBatchRequest,
  runOpenAiEmbeddingBatches,
} from "./batch-openai.js";
import { runGeminiEmbeddingBatches, type GeminiBatchRequest } from "./batch-gemini.js";
import type { BatchManager } from "./manager.batch.js";

import {
  loadEmbeddingCache,
  upsertEmbeddingCache,
  pruneEmbeddingCacheIfNeeded,
} from "./embeddings/cache.js";

import {
  estimateEmbeddingTokens,
  buildEmbeddingBatches,
  computeProviderKey,
  resolveEmbeddingTimeout,
  withTimeout,
  runWithConcurrency,
  embedBatchWithRetry,
  embedQueryWithTimeout,
} from "./embeddings/utils.js";

const log = createSubsystemLogger("memory");

export {
  estimateEmbeddingTokens,
  buildEmbeddingBatches,
  computeProviderKey,
  resolveEmbeddingTimeout,
  embedQueryWithTimeout,
  withTimeout,
  runWithConcurrency,
  loadEmbeddingCache,
  upsertEmbeddingCache,
  pruneEmbeddingCacheIfNeeded,
  embedBatchWithRetry,
};

export async function embedChunksInBatches(params: {
  db: DatabaseSync;
  provider: EmbeddingProvider;
  providerKey: string;
  chunks: MemoryChunk[];
  entry: MemoryFileEntry | SessionFileEntry;
  source: MemorySource;
  batch: BatchManager;
  openAi?: OpenAiEmbeddingClient;
  gemini?: GeminiEmbeddingClient;
  agentId: string;
  cacheEnabled: boolean;
  batchWait: boolean;
  batchConcurrency: number;
}): Promise<number[][]> {
  if (params.chunks.length === 0) return [];
  if (params.batch.isEnabled()) {
    if (params.provider.id === "openai" && params.openAi) return embedChunksWithOpenAiBatch(params);
    if (params.provider.id === "gemini" && params.gemini) return embedChunksWithGeminiBatch(params);
  }
  return embedChunksInBatchesNonBatch(params);
}

async function embedChunksInBatchesNonBatch(params: {
  db: DatabaseSync;
  provider: EmbeddingProvider;
  providerKey: string;
  chunks: MemoryChunk[];
  cacheEnabled: boolean;
}): Promise<number[][]> {
  const cached = loadEmbeddingCache({
    db: params.db,
    provider: params.provider,
    providerKey: params.providerKey,
    hashes: params.chunks.map((c) => c.hash),
    enabled: params.cacheEnabled,
  });
  const embeddings: number[][] = Array.from({ length: params.chunks.length }, () => []);
  const missing: Array<{ index: number; chunk: MemoryChunk }> = [];
  for (let i = 0; i < params.chunks.length; i++) {
    const hit = params.chunks[i]?.hash ? cached.get(params.chunks[i].hash) : undefined;
    if (hit?.length) embeddings[i] = hit;
    else if (params.chunks[i]) missing.push({ index: i, chunk: params.chunks[i] });
  }
  if (missing.length === 0) return embeddings;
  const batches = buildEmbeddingBatches(missing.map((m) => m.chunk));
  const toCache: Array<{ hash: string; embedding: number[] }> = [];
  let cursor = 0;
  for (const batch of batches) {
    const batchEmbeddings = await embedBatchWithRetry({
      provider: params.provider,
      texts: batch.map((c) => c.text),
    });
    for (let i = 0; i < batch.length; i++) {
      const item = missing[cursor + i];
      if (item) {
        embeddings[item.index] = batchEmbeddings[i] ?? [];
        toCache.push({ hash: item.chunk.hash, embedding: embeddings[item.index] });
      }
    }
    cursor += batch.length;
  }
  upsertEmbeddingCache({
    db: params.db,
    provider: params.provider,
    providerKey: params.providerKey,
    entries: toCache,
    enabled: params.cacheEnabled,
  });
  return embeddings;
}

async function embedChunksWithOpenAiBatch(params: {
  db: DatabaseSync;
  provider: EmbeddingProvider;
  providerKey: string;
  chunks: MemoryChunk[];
  entry: MemoryFileEntry | SessionFileEntry;
  source: MemorySource;
  batch: BatchManager;
  openAi?: OpenAiEmbeddingClient;
  agentId: string;
  cacheEnabled: boolean;
  batchWait: boolean;
  batchConcurrency: number;
}): Promise<number[][]> {
  const openAi = params.openAi!;
  const cached = loadEmbeddingCache({
    db: params.db,
    provider: params.provider,
    providerKey: params.providerKey,
    hashes: params.chunks.map((c) => c.hash),
    enabled: params.cacheEnabled,
  });
  const embeddings: number[][] = Array.from({ length: params.chunks.length }, () => []);
  const missing: Array<{ index: number; chunk: MemoryChunk }> = [];
  for (let i = 0; i < params.chunks.length; i++) {
    const hit = params.chunks[i]?.hash ? cached.get(params.chunks[i].hash) : undefined;
    if (hit?.length) embeddings[i] = hit;
    else if (params.chunks[i]) missing.push({ index: i, chunk: params.chunks[i] });
  }
  if (missing.length === 0) return embeddings;

  const mapping = new Map<string, { index: number; hash: string }>();
  const requests: OpenAiBatchRequest[] = missing.map((item) => {
    const customId = hashText(
      `${params.source}:${params.entry.path}:${item.chunk.startLine}:${item.chunk.endLine}:${item.chunk.hash}:${item.index}`,
    );
    mapping.set(customId, { index: item.index, hash: item.chunk.hash });
    return {
      custom_id: customId,
      method: "POST",
      url: OPENAI_BATCH_ENDPOINT,
      body: { model: openAi.model, input: item.chunk.text },
    };
  });

  const batchResult = await params.batch.runWithFallback({
    provider: "openai",
    run: () =>
      runOpenAiEmbeddingBatches({
        openAi,
        agentId: params.agentId,
        requests,
        wait: params.batchWait,
        concurrency: params.batchConcurrency,
        pollIntervalMs: 2000,
        timeoutMs: 3600000,
        debug: (m, d) => log.debug(m, d),
      }),
    fallback: () => embedChunksInBatchesNonBatch(params),
  });

  if (Array.isArray(batchResult)) return batchResult;
  const toCache: Array<{ hash: string; embedding: number[] }> = [];
  for (const [cid, emb] of batchResult.entries()) {
    const m = mapping.get(cid);
    if (m) {
      embeddings[m.index] = emb;
      toCache.push({ hash: m.hash, embedding: emb });
    }
  }
  upsertEmbeddingCache({
    db: params.db,
    provider: params.provider,
    providerKey: params.providerKey,
    entries: toCache,
    enabled: params.cacheEnabled,
  });
  return embeddings;
}

async function embedChunksWithGeminiBatch(params: {
  db: DatabaseSync;
  provider: EmbeddingProvider;
  providerKey: string;
  chunks: MemoryChunk[];
  entry: MemoryFileEntry | SessionFileEntry;
  source: MemorySource;
  batch: BatchManager;
  gemini?: GeminiEmbeddingClient;
  agentId: string;
  cacheEnabled: boolean;
  batchWait: boolean;
  batchConcurrency: number;
}): Promise<number[][]> {
  const gemini = params.gemini!;
  const cached = loadEmbeddingCache({
    db: params.db,
    provider: params.provider,
    providerKey: params.providerKey,
    hashes: params.chunks.map((c) => c.hash),
    enabled: params.cacheEnabled,
  });
  const embeddings: number[][] = Array.from({ length: params.chunks.length }, () => []);
  const missing: Array<{ index: number; chunk: MemoryChunk }> = [];
  for (let i = 0; i < params.chunks.length; i++) {
    const hit = params.chunks[i]?.hash ? cached.get(params.chunks[i].hash) : undefined;
    if (hit?.length) embeddings[i] = hit;
    else if (params.chunks[i]) missing.push({ index: i, chunk: params.chunks[i] });
  }
  if (missing.length === 0) return embeddings;

  const mapping = new Map<string, { index: number; hash: string }>();
  const requests: GeminiBatchRequest[] = missing.map((item) => {
    const customId = hashText(
      `${params.source}:${params.entry.path}:${item.chunk.startLine}:${item.chunk.endLine}:${item.chunk.hash}:${item.index}`,
    );
    mapping.set(customId, { index: item.index, hash: item.chunk.hash });
    return {
      custom_id: customId,
      content: { parts: [{ text: item.chunk.text }] },
      taskType: "RETRIEVAL_DOCUMENT",
    };
  });

  const batchResult = await params.batch.runWithFallback({
    provider: "gemini",
    run: () =>
      runGeminiEmbeddingBatches({
        gemini,
        agentId: params.agentId,
        requests,
        wait: params.batchWait,
        concurrency: params.batchConcurrency,
        pollIntervalMs: 2000,
        timeoutMs: 3600000,
        debug: (m, d) => log.debug(m, d),
      }),
    fallback: () => embedChunksInBatchesNonBatch(params),
  });

  if (Array.isArray(batchResult)) return batchResult;
  const toCache: Array<{ hash: string; embedding: number[] }> = [];
  for (const [cid, emb] of batchResult.entries()) {
    const m = mapping.get(cid);
    if (m) {
      embeddings[m.index] = emb;
      toCache.push({ hash: m.hash, embedding: emb });
    }
  }
  upsertEmbeddingCache({
    db: params.db,
    provider: params.provider,
    providerKey: params.providerKey,
    entries: toCache,
    enabled: params.cacheEnabled,
  });
  return embeddings;
}
