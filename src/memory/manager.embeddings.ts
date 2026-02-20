import type { DatabaseSync } from "node:sqlite";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { hashText, parseEmbedding, type MemoryChunk } from "./internal.js";
import {
  EMBEDDING_APPROX_CHARS_PER_TOKEN,
  EMBEDDING_BATCH_MAX_TOKENS,
  EMBEDDING_CACHE_TABLE,
  EMBEDDING_RETRY_BASE_DELAY_MS,
  EMBEDDING_RETRY_MAX_DELAY_MS,
  EMBEDDING_RETRY_MAX_ATTEMPTS,
  EMBEDDING_QUERY_TIMEOUT_LOCAL_MS,
  EMBEDDING_QUERY_TIMEOUT_REMOTE_MS,
  EMBEDDING_BATCH_TIMEOUT_LOCAL_MS,
  EMBEDDING_BATCH_TIMEOUT_REMOTE_MS,
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

export function loadEmbeddingCache(params: {
  db: DatabaseSync;
  provider: EmbeddingProvider;
  providerKey: string;
  hashes: string[];
  enabled: boolean;
}): Map<string, number[]> {
  if (!params.enabled || params.hashes.length === 0) return new Map();
  const unique = Array.from(new Set(params.hashes.filter((h) => h)));
  if (unique.length === 0) return new Map();

  const out = new Map<string, number[]>();
  const baseParams = [params.provider.id, params.provider.model, params.providerKey];
  const batchSize = 400;
  for (let start = 0; start < unique.length; start += batchSize) {
    const batch = unique.slice(start, start + batchSize);
    const placeholders = batch.map(() => "?").join(", ");
    const rows = params.db
      .prepare(
        `SELECT hash, embedding FROM ${EMBEDDING_CACHE_TABLE}\n` +
          ` WHERE provider = ? AND model = ? AND provider_key = ? AND hash IN (${placeholders})`,
      )
      .all(...baseParams, ...batch) as Array<{ hash: string; embedding: string }>;
    for (const row of rows) {
      out.set(row.hash, parseEmbedding(row.embedding));
    }
  }
  return out;
}

export function upsertEmbeddingCache(params: {
  db: DatabaseSync;
  provider: EmbeddingProvider;
  providerKey: string;
  entries: Array<{ hash: string; embedding: number[] }>;
  enabled: boolean;
}): void {
  if (!params.enabled || params.entries.length === 0) return;
  const now = Date.now();
  const stmt = params.db.prepare(
    `INSERT INTO ${EMBEDDING_CACHE_TABLE} (provider, model, provider_key, hash, embedding, dims, updated_at)\n` +
      ` VALUES (?, ?, ?, ?, ?, ?, ?)\n` +
      ` ON CONFLICT(provider, model, provider_key, hash) DO UPDATE SET\n` +
      `   embedding=excluded.embedding,\n` +
      `   dims=excluded.dims,\n` +
      `   updated_at=excluded.updated_at`,
  );
  for (const entry of params.entries) {
    const embedding = entry.embedding ?? [];
    stmt.run(
      params.provider.id,
      params.provider.model,
      params.providerKey,
      entry.hash,
      JSON.stringify(embedding),
      embedding.length,
      now,
    );
  }
}

export function pruneEmbeddingCacheIfNeeded(params: {
  db: DatabaseSync;
  maxEntries?: number;
  enabled: boolean;
}): void {
  if (!params.enabled || !params.maxEntries || params.maxEntries <= 0) return;
  const row = params.db.prepare(`SELECT COUNT(*) as c FROM ${EMBEDDING_CACHE_TABLE}`).get() as
    | { c: number }
    | undefined;
  if ((row?.c ?? 0) <= params.maxEntries) return;
  params.db
    .prepare(
      `DELETE FROM ${EMBEDDING_CACHE_TABLE}\n` +
        ` WHERE rowid IN (\n` +
        `   SELECT rowid FROM ${EMBEDDING_CACHE_TABLE}\n` +
        `   ORDER BY updated_at ASC\n` +
        `   LIMIT ?\n` +
        ` )`,
    )
    .run((row?.c ?? 0) - params.maxEntries);
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

function isRetryableEmbeddingError(message: string): boolean {
  return /(rate[_ ]limit|too many requests|429|resource has been exhausted|5\d\d|cloudflare)/i.test(
    message,
  );
}

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
  const requests = missing.map((item) => {
    const customId = hashText(
      `${params.source}:${params.entry.path}:${item.chunk.startLine}:${item.chunk.endLine}:${item.chunk.hash}:${item.index}`,
    );
    mapping.set(customId, { index: item.index, hash: item.chunk.hash });
    return {
      custom_id: customId,
      method: "POST",
      url: OPENAI_BATCH_ENDPOINT,
      body: { model: openAi.model, input: item.chunk.text },
    } as OpenAiBatchRequest;
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
  const requests = missing.map((item) => {
    const customId = hashText(
      `${params.source}:${params.entry.path}:${item.chunk.startLine}:${item.chunk.endLine}:${item.chunk.hash}:${item.index}`,
    );
    mapping.set(customId, { index: item.index, hash: item.chunk.hash });
    return {
      custom_id: customId,
      content: { parts: [{ text: item.chunk.text }] },
      taskType: "RETRIEVAL_DOCUMENT",
    } as GeminiBatchRequest;
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
