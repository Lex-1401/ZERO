
import type { DatabaseSync } from "node:sqlite";
import { parseEmbedding } from "../internal.js";
import { EMBEDDING_CACHE_TABLE } from "../manager.types.js";
import type { EmbeddingProvider } from "../embeddings.js";

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
