import type { DatabaseSync } from "node:sqlite";
import { bm25RankToScore, buildFtsQuery, mergeHybridResults } from "./hybrid.js";
import { searchKeyword, searchVector } from "./manager-search.js";
import {
  FTS_TABLE,
  SNIPPET_MAX_CHARS,
  VECTOR_TABLE,
  type MemorySource,
  type MemorySearchResult,
} from "./manager.types.js";

export async function searchVectorCoord(params: {
  db: DatabaseSync;
  model: string;
  queryVec: number[];
  limit: number;
  ensureVectorReady: (dimensions: number) => Promise<boolean>;
  sourceFilter: { sql: string; params: MemorySource[] };
  sourceFilterChunks: { sql: string; params: MemorySource[] };
}): Promise<Array<MemorySearchResult & { id: string }>> {
  const results = await searchVector({
    db: params.db,
    vectorTable: VECTOR_TABLE,
    providerModel: params.model,
    queryVec: params.queryVec,
    limit: params.limit,
    snippetMaxChars: SNIPPET_MAX_CHARS,
    ensureVectorReady: params.ensureVectorReady,
    sourceFilterVec: params.sourceFilter,
    sourceFilterChunks: params.sourceFilterChunks,
  });
  return results.map((entry) => entry as MemorySearchResult & { id: string });
}

export async function searchKeywordCoord(params: {
  db: DatabaseSync;
  model: string;
  query: string;
  limit: number;
  sourceFilter: { sql: string; params: MemorySource[] };
  ftsAvailable: boolean;
}): Promise<Array<MemorySearchResult & { id: string; textScore: number }>> {
  if (!params.ftsAvailable) return [];
  const results = await searchKeyword({
    db: params.db,
    ftsTable: FTS_TABLE,
    providerModel: params.model,
    query: params.query,
    limit: params.limit,
    snippetMaxChars: SNIPPET_MAX_CHARS,
    sourceFilter: params.sourceFilter,
    buildFtsQuery: (raw) => buildFtsQuery(raw),
    bm25RankToScore,
  });
  return results.map((entry) => entry as MemorySearchResult & { id: string; textScore: number });
}

export function mergeHybridCoord(params: {
  vector: Array<MemorySearchResult & { id: string }>;
  keyword: Array<MemorySearchResult & { id: string; textScore: number }>;
  vectorWeight: number;
  textWeight: number;
}): MemorySearchResult[] {
  const merged = mergeHybridResults({
    vector: params.vector.map((r) => ({
      id: r.id,
      path: r.path,
      startLine: r.startLine,
      endLine: r.endLine,
      source: r.source,
      snippet: r.snippet,
      vectorScore: r.score,
    })),
    keyword: params.keyword.map((r) => ({
      id: r.id,
      path: r.path,
      startLine: r.startLine,
      endLine: r.endLine,
      source: r.source,
      snippet: r.snippet,
      textScore: r.textScore,
    })),
    vectorWeight: params.vectorWeight,
    textWeight: params.textWeight,
  });
  return merged.map((entry) => entry as MemorySearchResult);
}
