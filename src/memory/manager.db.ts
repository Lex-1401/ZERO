import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { resolveUserPath } from "../utils.js";
import { ensureDir } from "./internal.js";
import { requireNodeSqlite } from "./sqlite.js";
import { loadSqliteVecExtension } from "./sqlite-vec.js";
import { ensureMemoryIndexSchema } from "./memory-schema.js";
import {
  EMBEDDING_CACHE_TABLE,
  FTS_TABLE,
  META_KEY,
  VECTOR_TABLE,
  type MemoryIndexMeta,
  type MemorySource,
} from "./manager.types.js";

export async function loadVectorExtension(params: {
  db: DatabaseSync;
  extensionPath?: string;
}): Promise<{ available: boolean; extensionPath?: string; error?: string }> {
  try {
    const resolvedPath = params.extensionPath?.trim()
      ? resolveUserPath(params.extensionPath)
      : undefined;
    const loaded = await loadSqliteVecExtension({ db: params.db, extensionPath: resolvedPath });
    if (!loaded.ok)
      return { available: false, error: loaded.error ?? "unknown sqlite-vec load error" };
    return { available: true, extensionPath: loaded.extensionPath };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { available: false, error: message };
  }
}

export function ensureVectorTable(params: { db: DatabaseSync; dimensions: number }): void {
  params.db.exec(
    `CREATE VIRTUAL TABLE IF NOT EXISTS ${VECTOR_TABLE} USING vec0(\n` +
      `  id TEXT PRIMARY KEY,\n` +
      `  embedding FLOAT[${params.dimensions}]\n` +
      `)`,
  );
}

export function dropVectorTable(db: DatabaseSync): void {
  db.exec(`DROP TABLE IF EXISTS ${VECTOR_TABLE}`);
}

export function buildSourceFilter(params: { sources: Set<MemorySource>; alias?: string }): {
  sql: string;
  params: MemorySource[];
} {
  const sources = Array.from(params.sources);
  if (sources.length === 0) return { sql: "", params: [] };
  const column = params.alias ? `${params.alias}.source` : "source";
  const placeholders = sources.map(() => "?").join(", ");
  return { sql: ` AND ${column} IN (${placeholders})`, params: sources };
}

export function openDatabaseAtPath(params: {
  dbPath: string;
  allowExtension: boolean;
}): DatabaseSync {
  const dir = path.dirname(params.dbPath);
  ensureDir(dir);
  const { DatabaseSync } = requireNodeSqlite();
  return new DatabaseSync(params.dbPath, { allowExtension: params.allowExtension });
}

export function seedEmbeddingCache(params: {
  targetDb: DatabaseSync;
  sourceDb: DatabaseSync;
}): void {
  const rows = params.sourceDb
    .prepare(
      `SELECT provider, model, provider_key, hash, embedding, dims, updated_at FROM ${EMBEDDING_CACHE_TABLE}`,
    )
    .all() as Array<{
    provider: string;
    model: string;
    provider_key: string;
    hash: string;
    embedding: string;
    dims: number | null;
    updated_at: number;
  }>;
  if (!rows.length) return;
  const insert = params.targetDb.prepare(
    `INSERT INTO ${EMBEDDING_CACHE_TABLE} (provider, model, provider_key, hash, embedding, dims, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider, model, provider_key, hash) DO UPDATE SET
       embedding=excluded.embedding,
       dims=excluded.dims,
       updated_at=excluded.updated_at`,
  );
  params.targetDb.exec("BEGIN");
  for (const row of rows) {
    insert.run(
      row.provider,
      row.model,
      row.provider_key,
      row.hash,
      row.embedding,
      row.dims,
      row.updated_at,
    );
  }
  params.targetDb.exec("COMMIT");
}

export async function swapIndexFiles(targetPath: string, tempPath: string): Promise<void> {
  const backupPath = `${targetPath}.backup-${randomUUID()}`;
  await moveIndexFiles(targetPath, backupPath);
  try {
    await moveIndexFiles(tempPath, targetPath);
  } catch (err) {
    await moveIndexFiles(backupPath, targetPath);
    throw err;
  }
  await removeIndexFiles(backupPath);
}

export async function moveIndexFiles(sourceBase: string, targetBase: string): Promise<void> {
  const suffixes = ["", "-wal", "-shm"];
  for (const suffix of suffixes) {
    const source = `${sourceBase}${suffix}`;
    const target = `${targetBase}${suffix}`;
    try {
      await fs.rename(source, target);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  }
}

export async function removeIndexFiles(basePath: string): Promise<void> {
  const suffixes = ["", "-wal", "-shm"];
  await Promise.all(suffixes.map((suffix) => fs.rm(`${basePath}${suffix}`, { force: true })));
}

export function ensureSchema(params: { db: DatabaseSync; ftsEnabled: boolean }): {
  ftsAvailable: boolean;
  ftsError?: string;
} {
  const result = ensureMemoryIndexSchema({
    db: params.db,
    embeddingCacheTable: EMBEDDING_CACHE_TABLE,
    ftsTable: FTS_TABLE,
    ftsEnabled: params.ftsEnabled,
  });
  return { ftsAvailable: result.ftsAvailable, ftsError: result.ftsError };
}

export function readMeta(db: DatabaseSync): MemoryIndexMeta | null {
  const row = db.prepare(`SELECT value FROM meta WHERE key = ?`).get(META_KEY) as
    | { value: string }
    | undefined;
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value) as MemoryIndexMeta;
  } catch {
    return null;
  }
}

export function writeMeta(db: DatabaseSync, meta: MemoryIndexMeta) {
  const value = JSON.stringify(meta);
  db.prepare(
    `INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
  ).run(META_KEY, value);
}

export function vectorToBlob(embedding: number[]): Buffer {
  return Buffer.from(new Float32Array(embedding).buffer);
}
