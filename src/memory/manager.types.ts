import type { DatabaseSync } from "node:sqlite";
import type { ZEROConfig } from "../config/config.js";
export type { ResolvedMemorySearchConfig } from "../agents/memory-search.js";
import type {
  EmbeddingProvider,
  GeminiEmbeddingClient,
  OpenAiEmbeddingClient,
} from "./embeddings.js";

export type MemorySource = "memory" | "sessions";

export type MemoryFileEntry = {
  path: string;
  absPath: string;
  mtimeMs: number;
  size: number;
  hash: string;
};

export type MemorySearchResult = {
  path: string;
  startLine: number;
  endLine: number;
  score: number;
  snippet: string;
  source: MemorySource;
};

export type MemoryIndexMeta = {
  model: string;
  provider: string;
  providerKey?: string;
  chunkTokens: number;
  chunkOverlap: number;
  vectorDims?: number;
};

export type SessionFileEntry = {
  path: string;
  absPath: string;
  mtimeMs: number;
  size: number;
  hash: string;
  content: string;
};

export type MemorySyncProgressUpdate = {
  completed: number;
  total: number;
  label?: string;
};

export type MemorySyncProgressState = {
  completed: number;
  total: number;
  label?: string;
  report: (update: MemorySyncProgressUpdate) => void;
};

export const META_KEY = "memory_index_meta_v1";
export const SNIPPET_MAX_CHARS = 700;
export const VECTOR_TABLE = "chunks_vec";
export const FTS_TABLE = "chunks_fts";
export const EMBEDDING_CACHE_TABLE = "embedding_cache";
export const SESSION_DIRTY_DEBOUNCE_MS = 5000;
export const EMBEDDING_BATCH_MAX_TOKENS = 8000;
export const EMBEDDING_APPROX_CHARS_PER_TOKEN = 1;
export const EMBEDDING_INDEX_CONCURRENCY = 4;
export const EMBEDDING_RETRY_MAX_ATTEMPTS = 3;
export const EMBEDDING_RETRY_BASE_DELAY_MS = 500;
export const EMBEDDING_RETRY_MAX_DELAY_MS = 8000;
export const BATCH_FAILURE_LIMIT = 2;
export const SESSION_DELTA_READ_CHUNK_BYTES = 64 * 1024;
export const VECTOR_LOAD_TIMEOUT_MS = 30_000;
export const EMBEDDING_QUERY_TIMEOUT_REMOTE_MS = 60_000;
export const EMBEDDING_QUERY_TIMEOUT_LOCAL_MS = 5 * 60_000;
export const EMBEDDING_BATCH_TIMEOUT_REMOTE_MS = 2 * 60_000;
export const EMBEDDING_BATCH_TIMEOUT_LOCAL_MS = 10 * 60_000;
