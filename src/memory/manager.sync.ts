import fs from "node:fs/promises";
import type { DatabaseSync } from "node:sqlite";
import { SecurityGuard } from "../security/guard.js";
import { chunkMarkdown, hashText } from "./internal.js";
import {
  FTS_TABLE,
  VECTOR_TABLE,
  type MemoryFileEntry,
  type SessionFileEntry,
  type MemorySource,
  type MemorySyncProgressState,
  type MemorySyncProgressUpdate,
  type ResolvedMemorySearchConfig,
} from "./manager.types.js";
import { vectorToBlob } from "./manager.db.js";
import { embedChunksInBatches } from "./manager.embeddings.js";
import type {
  EmbeddingProvider,
  GeminiEmbeddingClient,
  OpenAiEmbeddingClient,
} from "./embeddings.js";
import type { BatchManager } from "./manager.batch.js";

export function shouldSyncSessions(params: {
  sources: Set<MemorySource>;
  reason?: string;
  force?: boolean;
  needsFullReindex: boolean;
  sessionsDirty: boolean;
  sessionsDirtyFilesSize: number;
}): boolean {
  if (!params.sources.has("sessions")) return false;
  if (params.force) return true;
  const reason = params.reason;
  if (reason === "session-start" || reason === "watch") return false;
  if (params.needsFullReindex) return true;
  return params.sessionsDirty && params.sessionsDirtyFilesSize > 0;
}

export function createSyncProgress(
  onProgress: (update: MemorySyncProgressUpdate) => void,
): MemorySyncProgressState {
  const state: MemorySyncProgressState = {
    completed: 0,
    total: 0,
    label: undefined,
    report: (update) => {
      if (update.label) state.label = update.label;
      const label =
        update.total > 0 && state.label
          ? `${state.label} ${update.completed}/${update.total}`
          : state.label;
      onProgress({
        completed: update.completed,
        total: update.total,
        label,
      });
    },
  };
  return state;
}

export function shouldFallbackOnError(message: string): boolean {
  return /embedding|embeddings|batch/i.test(message);
}

export async function indexFile(params: {
  db: DatabaseSync;
  provider: EmbeddingProvider;
  providerKey: string;
  entry: MemoryFileEntry | SessionFileEntry;
  options: { source: MemorySource; content?: string };
  settings: ResolvedMemorySearchConfig;
  batch: BatchManager;
  openAi?: OpenAiEmbeddingClient;
  gemini?: GeminiEmbeddingClient;
  agentId: string;
  ensureVectorReady: (dimensions: number) => Promise<boolean>;
  ftsAvailable: boolean;
}): Promise<void> {
  const rawContent = params.options.content ?? (await fs.readFile(params.entry.absPath, "utf-8"));
  const content = SecurityGuard.sanitizeRagContent(rawContent);
  const chunks = chunkMarkdown(content, params.settings.chunking).filter(
    (chunk) => chunk.text.trim().length > 0,
  );
  const embeddings = await embedChunksInBatches({
    db: params.db,
    provider: params.provider,
    providerKey: params.providerKey,
    chunks,
    entry: params.entry,
    source: params.options.source,
    batch: params.batch,
    openAi: params.openAi,
    gemini: params.gemini,
    agentId: params.agentId,
    cacheEnabled: params.settings.cache.enabled,
    batchWait: params.settings.remote?.batch?.wait ?? true,
    batchConcurrency: Math.max(1, params.settings.remote?.batch?.concurrency ?? 2),
  });
  const sample = embeddings.find((e) => e.length > 0);
  const vectorReady = sample ? await params.ensureVectorReady(sample.length) : false;
  const now = Date.now();

  if (vectorReady) {
    try {
      params.db
        .prepare(
          `DELETE FROM ${VECTOR_TABLE} WHERE id IN (SELECT id FROM chunks WHERE path = ? AND source = ?)`,
        )
        .run(params.entry.path, params.options.source);
    } catch {}
  }
  if (params.ftsAvailable) {
    try {
      params.db
        .prepare(`DELETE FROM ${FTS_TABLE} WHERE path = ? AND source = ? AND model = ?`)
        .run(params.entry.path, params.options.source, params.provider.model);
    } catch {}
  }
  params.db
    .prepare(`DELETE FROM chunks WHERE path = ? AND source = ?`)
    .run(params.entry.path, params.options.source);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i] ?? [];
    const id = hashText(
      `${params.options.source}:${params.entry.path}:${chunk.startLine}:${chunk.endLine}:${chunk.hash}:${params.provider.model}`,
    );
    params.db
      .prepare(
        `INSERT INTO chunks (id, path, source, start_line, end_line, hash, model, text, embedding, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET hash=excluded.hash, model=excluded.model, text=excluded.text, embedding=excluded.embedding, updated_at=excluded.updated_at`,
      )
      .run(
        id,
        params.entry.path,
        params.options.source,
        chunk.startLine,
        chunk.endLine,
        chunk.hash,
        params.provider.model,
        chunk.text,
        JSON.stringify(embedding),
        now,
      );
    if (vectorReady && embedding.length > 0) {
      try {
        params.db.prepare(`DELETE FROM ${VECTOR_TABLE} WHERE id = ?`).run(id);
      } catch {}
      params.db
        .prepare(`INSERT INTO ${VECTOR_TABLE} (id, embedding) VALUES (?, ?)`)
        .run(id, vectorToBlob(embedding));
    }
    if (params.ftsAvailable) {
      params.db
        .prepare(
          `INSERT INTO ${FTS_TABLE} (text, id, path, source, model, start_line, end_line) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          chunk.text,
          id,
          params.entry.path,
          params.options.source,
          params.provider.model,
          chunk.startLine,
          chunk.endLine,
        );
    }
  }
  params.db
    .prepare(
      `INSERT INTO files (path, source, hash, mtime, size) VALUES (?, ?, ?, ?, ?) ON CONFLICT(path) DO UPDATE SET source=excluded.source, hash=excluded.hash, mtime=excluded.mtime, size=excluded.size`,
    )
    .run(
      params.entry.path,
      params.options.source,
      params.entry.hash,
      params.entry.mtimeMs,
      params.entry.size,
    );
}
