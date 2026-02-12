import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import chokidar, { type FSWatcher } from "chokidar";

import { resolveAgentDir, resolveAgentWorkspaceDir } from "../agents/agent-scope.js";
import { resolveMemorySearchConfig } from "../agents/memory-search.js";
import type { ZEROConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { onSessionTranscriptUpdate } from "../sessions/transcript-events.js";
import { resolveUserPath } from "../utils.js";
import {
  createEmbeddingProvider,
  type EmbeddingProvider,
  type EmbeddingProviderResult,
  type GeminiEmbeddingClient,
  type OpenAiEmbeddingClient,
} from "./embeddings.js";
import { buildFileEntry, listMemoryFiles, normalizeRelPath } from "./internal.js";
import { KnowledgeGraph } from "./graph.js";
import {
  BATCH_FAILURE_LIMIT,
  EMBEDDING_INDEX_CONCURRENCY,
  EMBEDDING_CACHE_TABLE,
  FTS_TABLE,
  VECTOR_LOAD_TIMEOUT_MS,
  VECTOR_TABLE,
  SESSION_DIRTY_DEBOUNCE_MS,
  type MemoryIndexMeta,
  type MemorySearchResult,
  type MemorySource,
  type MemorySyncProgressState,
  type MemorySyncProgressUpdate,
  type ResolvedMemorySearchConfig,
} from "./manager.types.js";
import {
  buildSourceFilter,
  ensureSchema,
  ensureVectorTable,
  loadVectorExtension,
  openDatabaseAtPath,
  readMeta,
  removeIndexFiles,
  seedEmbeddingCache,
  swapIndexFiles,
  writeMeta,
} from "./manager.db.js";
import {
  computeProviderKey,
  embedQueryWithTimeout,
  runWithConcurrency,
  withTimeout,
  pruneEmbeddingCacheIfNeeded,
  resolveEmbeddingTimeout,
} from "./manager.embeddings.js";
import {
  buildSessionEntry,
  listSessionFiles,
  updateSessionDelta,
  isSessionFileForAgent,
  sessionPathForFile,
} from "./manager.sessions.js";
import {
  createSyncProgress,
  shouldFallbackOnError,
  shouldSyncSessions,
  indexFile,
} from "./manager.sync.js";
import { BatchManager } from "./manager.batch.js";
import { mergeHybridCoord, searchKeywordCoord, searchVectorCoord } from "./manager.search.js";

const log = createSubsystemLogger("memory");
const INDEX_CACHE = new Map<string, MemoryIndexManager>();

export class MemoryIndexManager {
  private readonly cacheKey: string;
  private readonly cfg: ZEROConfig;
  private readonly agentId: string;
  private readonly workspaceDir: string;
  private readonly settings: ResolvedMemorySearchConfig;
  private provider: EmbeddingProvider;
  private openAi?: OpenAiEmbeddingClient;
  private gemini?: GeminiEmbeddingClient;
  private batch: BatchManager;
  private db: DatabaseSync;
  private readonly sources: Set<MemorySource>;
  private providerKey: string;
  private readonly cache: { enabled: boolean; maxEntries?: number };
  private readonly vector: {
    enabled: boolean;
    available: boolean | null;
    extensionPath?: string;
    loadError?: string;
    dims?: number;
  };
  private readonly fts: {
    enabled: boolean;
    available: boolean;
    loadError?: string;
  };
  private vectorReady: Promise<boolean> | null = null;
  private watcher: FSWatcher | null = null;
  private watchTimer: NodeJS.Timeout | null = null;
  private sessionWatchTimer: NodeJS.Timeout | null = null;
  private sessionPendingFiles = new Set<string>();
  private sessionUnsubscribe: (() => void) | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private closed = false;
  private dirty = false;
  private sessionsDirty = false;
  private sessionsDirtyFiles = new Set<string>();
  private sessionDeltas = new Map<
    string,
    { lastSize: number; pendingBytes: number; pendingMessages: number }
  >();
  private sessionWarm = new Set<string>();
  private syncing: Promise<void> | null = null;
  public readonly graph: KnowledgeGraph;

  static async get(params: {
    cfg: ZEROConfig;
    agentId: string;
  }): Promise<MemoryIndexManager | null> {
    const { cfg, agentId } = params;
    const settings = resolveMemorySearchConfig(cfg, agentId);
    if (!settings) return null;
    const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
    const key = `${agentId}:${workspaceDir}:${JSON.stringify(settings)}`;
    const existing = INDEX_CACHE.get(key);
    if (existing) return existing;
    const providerResult = await createEmbeddingProvider({
      config: cfg,
      agentDir: resolveAgentDir(cfg, agentId),
      provider: settings.provider,
      remote: settings.remote,
      model: settings.model,
      fallback: settings.fallback,
      local: settings.local,
    });
    const manager = new MemoryIndexManager({
      cacheKey: key,
      cfg,
      agentId,
      workspaceDir,
      settings,
      providerResult,
    });
    INDEX_CACHE.set(key, manager);
    return manager;
  }

  private constructor(params: {
    cacheKey: string;
    cfg: ZEROConfig;
    agentId: string;
    workspaceDir: string;
    settings: ResolvedMemorySearchConfig;
    providerResult: EmbeddingProviderResult;
  }) {
    this.cacheKey = params.cacheKey;
    this.cfg = params.cfg;
    this.agentId = params.agentId;
    this.workspaceDir = params.workspaceDir;
    this.settings = params.settings;
    this.provider = params.providerResult.provider;
    this.openAi = params.providerResult.openAi;
    this.gemini = params.providerResult.gemini;
    this.sources = new Set(params.settings.sources);
    this.db = openDatabaseAtPath({
      dbPath: resolveUserPath(params.settings.store.path),
      allowExtension: params.settings.store.vector.enabled,
    });
    this.providerKey = computeProviderKey(this.provider, this.openAi, this.gemini);
    this.cache = {
      enabled: params.settings.cache.enabled,
      maxEntries: params.settings.cache.maxEntries,
    };
    this.fts = { enabled: params.settings.query.hybrid.enabled, available: false };
    const schema = ensureSchema({ db: this.db, ftsEnabled: this.fts.enabled });
    this.fts.available = schema.ftsAvailable;
    this.fts.loadError = schema.ftsError;
    this.vector = {
      enabled: params.settings.store.vector.enabled,
      available: null,
      extensionPath: params.settings.store.vector.extensionPath,
    };
    const meta = readMeta(this.db);
    if (meta?.vectorDims) this.vector.dims = meta.vectorDims;
    this.ensureWatcher();
    this.ensureSessionListener();
    this.ensureIntervalSync();
    this.dirty = this.sources.has("memory");
    this.batch = new BatchManager(this.resolveBatchEnabled());
    this.graph = new KnowledgeGraph(this.db);
  }

  private resolveBatchEnabled(): boolean {
    const batch = this.settings.remote?.batch;
    return Boolean(
      batch?.enabled &&
      ((this.openAi && this.provider.id === "openai") ||
        (this.gemini && this.provider.id === "gemini")),
    );
  }

  async search(
    query: string,
    opts?: { maxResults?: number; minScore?: number; sessionKey?: string },
  ): Promise<MemorySearchResult[]> {
    void this.warmSession(opts?.sessionKey);
    if (this.settings.sync.onSearch && (this.dirty || this.sessionsDirty)) {
      void this.sync({ reason: "search" }).catch((err) =>
        log.warn(`memory sync failed (search): ${String(err)}`),
      );
    }
    const cleaned = query.trim();
    if (!cleaned) return [];
    const minScore = opts?.minScore ?? this.settings.query.minScore;
    const maxResults = opts?.maxResults ?? this.settings.query.maxResults;
    const hybrid = this.settings.query.hybrid;
    const candidates = Math.min(
      200,
      Math.max(1, Math.floor(maxResults * hybrid.candidateMultiplier)),
    );
    const keywordResults = hybrid.enabled
      ? await searchKeywordCoord({
          db: this.db,
          model: this.provider.model,
          query: cleaned,
          limit: candidates,
          sourceFilter: buildSourceFilter({ sources: this.sources }),
          ftsAvailable: this.fts.available,
        })
      : [];
    const queryVec = await embedQueryWithTimeout({
      provider: this.provider,
      text: cleaned,
      timeoutMs: resolveEmbeddingTimeout("query", this.provider.id),
    });
    const vectorResults = queryVec.some((v) => v !== 0)
      ? await searchVectorCoord({
          db: this.db,
          model: this.provider.model,
          queryVec,
          limit: candidates,
          ensureVectorReady: (dims) => this.ensureVectorReady(dims),
          sourceFilter: buildSourceFilter({ sources: this.sources, alias: "c" }),
          sourceFilterChunks: buildSourceFilter({ sources: this.sources }),
        })
      : [];
    if (!hybrid.enabled)
      return vectorResults.filter((r) => r.score >= minScore).slice(0, maxResults);
    const merged = mergeHybridCoord({
      vector: vectorResults,
      keyword: keywordResults,
      vectorWeight: hybrid.vectorWeight,
      textWeight: hybrid.textWeight,
    });
    return merged.filter((r) => r.score >= minScore).slice(0, maxResults);
  }

  private async warmSession(sessionKey?: string): Promise<void> {
    if (!this.settings.sync.onSessionStart) return;
    const key = sessionKey?.trim() || "";
    if (key && this.sessionWarm.has(key)) return;
    void this.sync({ reason: "session-start" }).catch((err) =>
      log.warn(`memory sync failed (session-start): ${String(err)}`),
    );
    if (key) this.sessionWarm.add(key);
  }

  async sync(params?: {
    reason?: string;
    force?: boolean;
    progress?: (update: MemorySyncProgressUpdate) => void;
  }): Promise<void> {
    if (this.syncing) return this.syncing;
    this.syncing = this.runSync(params).finally(() => {
      this.syncing = null;
    });
    return this.syncing;
  }

  private async runSync(params?: {
    reason?: string;
    force?: boolean;
    progress?: (update: MemorySyncProgressUpdate) => void;
  }) {
    const progress = params?.progress ? createSyncProgress(params.progress) : undefined;
    if (progress)
      progress.report({ completed: 0, total: 0, label: "Loading vector extension\u2026" });
    const vectorReady = await this.ensureVectorReady();
    const meta = readMeta(this.db);
    const needsFullReindex =
      params?.force ||
      !meta ||
      meta.model !== this.provider.model ||
      meta.provider !== this.provider.id ||
      meta.providerKey !== this.providerKey ||
      meta.chunkTokens !== this.settings.chunking.tokens ||
      meta.chunkOverlap !== this.settings.chunking.overlap ||
      (vectorReady && !meta?.vectorDims);
    try {
      if (needsFullReindex) {
        await this.runSafeReindex({
          reason: params?.reason,
          force: params?.force,
          progress: progress ?? undefined,
        });
        return;
      }
      if (this.sources.has("memory") && (params?.force || this.dirty)) {
        await this.syncMemoryFiles({ needsFullReindex: false, progress: progress ?? undefined });
        this.dirty = false;
      }
      if (
        shouldSyncSessions({
          sources: this.sources,
          reason: params?.reason,
          force: params?.force,
          needsFullReindex,
          sessionsDirty: this.sessionsDirty,
          sessionsDirtyFilesSize: this.sessionsDirtyFiles.size,
        })
      ) {
        await this.syncSessionFiles({ needsFullReindex: false, progress: progress ?? undefined });
        this.sessionsDirty = false;
        this.sessionsDirtyFiles.clear();
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      if (shouldFallbackOnError(reason) && (await this.activateFallbackProvider(reason))) {
        await this.runSafeReindex({
          reason: params?.reason ?? "fallback",
          force: true,
          progress: progress ?? undefined,
        });
        return;
      }
      throw err;
    }
  }

  private async activateFallbackProvider(reason: string): Promise<boolean> {
    const fallback = this.settings.fallback;
    if (!fallback || fallback === "none" || fallback === this.provider.id) return false;
    const fallbackModel =
      fallback === "gemini"
        ? this.settings.model.includes("embedding")
          ? this.settings.model
          : "models/embedding-001"
        : fallback === "openai"
          ? this.settings.model.includes("text-embedding")
            ? this.settings.model
            : "text-embedding-3-small"
          : this.settings.model;
    const fallbackResult = await createEmbeddingProvider({
      config: this.cfg,
      agentDir: resolveAgentDir(this.cfg, this.agentId),
      provider: fallback,
      remote: this.settings.remote,
      model: fallbackModel,
      fallback: "none",
      local: this.settings.local,
    });
    this.provider = fallbackResult.provider;
    this.openAi = fallbackResult.openAi;
    this.gemini = fallbackResult.gemini;
    this.providerKey = computeProviderKey(this.provider, this.openAi, this.gemini);
    this.batch = new BatchManager(this.resolveBatchEnabled());
    log.warn(`memory embeddings: switched to fallback provider (${fallback})`, { reason });
    return true;
  }

  private async runSafeReindex(params: {
    reason?: string;
    force?: boolean;
    progress?: MemorySyncProgressState;
  }) {
    const dbPath = resolveUserPath(this.settings.store.path);
    const tempDbPath = `${dbPath}.tmp-${randomUUID()}`;
    const tempDb = openDatabaseAtPath({
      dbPath: tempDbPath,
      allowExtension: this.settings.store.vector.enabled,
    });
    const originalDb = this.db;
    const originalState = { available: this.vector.available, dims: this.vector.dims };
    this.db = tempDb;
    this.vector.available = null;
    ensureSchema({ db: this.db, ftsEnabled: this.fts.enabled });
    try {
      seedEmbeddingCache({ targetDb: this.db, sourceDb: originalDb });
      if (this.sources.has("memory"))
        await this.syncMemoryFiles({ needsFullReindex: true, progress: params.progress });
      if (
        shouldSyncSessions({
          sources: this.sources,
          reason: params.reason,
          force: params.force,
          needsFullReindex: true,
          sessionsDirty: true,
          sessionsDirtyFilesSize: 1,
        })
      ) {
        await this.syncSessionFiles({ needsFullReindex: true, progress: params.progress });
      }
      const nextMeta: MemoryIndexMeta = {
        model: this.provider.model,
        provider: this.provider.id,
        providerKey: this.providerKey,
        chunkTokens: this.settings.chunking.tokens,
        chunkOverlap: this.settings.chunking.overlap,
      };
      if (this.vector.available && this.vector.dims) nextMeta.vectorDims = this.vector.dims;
      writeMeta(this.db, nextMeta);
      pruneEmbeddingCacheIfNeeded({
        db: this.db,
        maxEntries: this.cache.maxEntries,
        enabled: this.cache.enabled,
      });
      this.db.close();
      originalDb.close();
      await swapIndexFiles(dbPath, tempDbPath);
      this.db = openDatabaseAtPath({ dbPath, allowExtension: this.settings.store.vector.enabled });
      ensureSchema({ db: this.db, ftsEnabled: this.fts.enabled });
      this.vector.dims = nextMeta.vectorDims;
    } catch (err) {
      try {
        this.db.close();
      } catch {}
      await removeIndexFiles(tempDbPath);
      this.db = openDatabaseAtPath({ dbPath, allowExtension: this.settings.store.vector.enabled });
      this.vector.available = originalState.available;
      this.vector.dims = originalState.dims;
      throw err;
    }
  }

  private async ensureVectorReady(dimensions?: number): Promise<boolean> {
    if (!this.vector.enabled) {
      this.vector.available = false;
      return false;
    }
    if (!this.vectorReady) {
      this.vectorReady = withTimeout(
        loadVectorExtension({ db: this.db, extensionPath: this.vector.extensionPath }).then((r) => {
          this.vector.available = r.available;
          this.vector.extensionPath = r.extensionPath;
          this.vector.loadError = r.error;
          return r.available;
        }),
        VECTOR_LOAD_TIMEOUT_MS,
        `sqlite-vec load timed out`,
      );
    }
    const ready = await this.vectorReady;
    if (ready && dimensions) ensureVectorTable({ db: this.db, dimensions });
    return ready;
  }

  private async syncMemoryFiles(params: {
    needsFullReindex: boolean;
    progress?: MemorySyncProgressState;
  }) {
    const files = await listMemoryFiles(this.workspaceDir);
    const activePaths = new Set(
      files.map((f) => normalizeRelPath(path.relative(this.workspaceDir, f))),
    );
    if (params.progress) {
      params.progress.total += files.length;
      params.progress.label = this.batch.isEnabled()
        ? "Indexing memory files (batch)…"
        : "Indexing memory files…";
      params.progress.report(params.progress);
    }
    const tasks = files.map((f) => async () => {
      const entry = await buildFileEntry(f, this.workspaceDir);
      const record = this.db
        .prepare(`SELECT hash FROM files WHERE path = ? AND source = ?`)
        .get(entry.path, "memory") as { hash: string } | undefined;
      if (!params.needsFullReindex && record?.hash === entry.hash) {
        if (params.progress) {
          params.progress.completed++;
          params.progress.report(params.progress);
        }
        return;
      }
      await indexFile({
        db: this.db,
        provider: this.provider,
        providerKey: this.providerKey,
        entry,
        options: { source: "memory" },
        settings: this.settings,
        batch: this.batch,
        openAi: this.openAi,
        gemini: this.gemini,
        agentId: this.agentId,
        ensureVectorReady: (dims) => this.ensureVectorReady(dims),
        ftsAvailable: this.fts.available,
      });
      if (params.progress) {
        params.progress.completed++;
        params.progress.report(params.progress);
      }
    });
    await runWithConcurrency(tasks, this.getIndexConcurrency());
    const staleRows = this.db
      .prepare(`SELECT path FROM files WHERE source = ?`)
      .all("memory") as Array<{ path: string }>;
    for (const stale of staleRows) {
      if (activePaths.has(stale.path)) continue;
      this.db.prepare(`DELETE FROM files WHERE path = ? AND source = ?`).run(stale.path, "memory");
      try {
        this.db
          .prepare(
            `DELETE FROM ${VECTOR_TABLE} WHERE id IN (SELECT id FROM chunks WHERE path = ? AND source = ?)`,
          )
          .run(stale.path, "memory");
      } catch {}
      this.db.prepare(`DELETE FROM chunks WHERE path = ? AND source = ?`).run(stale.path, "memory");
      if (this.fts.available) {
        try {
          this.db
            .prepare(`DELETE FROM ${FTS_TABLE} WHERE path = ? AND source = ? AND model = ?`)
            .run(stale.path, "memory", this.provider.model);
        } catch {}
      }
    }
  }

  private async syncSessionFiles(params: {
    needsFullReindex: boolean;
    progress?: MemorySyncProgressState;
  }) {
    const files = await listSessionFiles(this.agentId);
    const activePaths = new Set(files.map((f) => sessionPathForFile(f)));
    if (params.progress) {
      params.progress.total += files.length;
      params.progress.label = this.batch.isEnabled()
        ? "Syncing sessions (batch)…"
        : "Syncing sessions…";
      params.progress.report(params.progress);
    }
    const tasks = files.map((f) => async () => {
      const entry = await buildSessionEntry(f);
      if (!entry) return;
      const record = this.db
        .prepare(`SELECT hash FROM files WHERE path = ? AND source = ?`)
        .get(entry.path, "sessions") as { hash: string } | undefined;
      if (!params.needsFullReindex && record?.hash === entry.hash) {
        if (params.progress) {
          params.progress.completed++;
          params.progress.report(params.progress);
        }
        return;
      }
      await indexFile({
        db: this.db,
        provider: this.provider,
        providerKey: this.providerKey,
        entry,
        options: { source: "sessions", content: entry.content },
        settings: this.settings,
        batch: this.batch,
        openAi: this.openAi,
        gemini: this.gemini,
        agentId: this.agentId,
        ensureVectorReady: (dims) => this.ensureVectorReady(dims),
        ftsAvailable: this.fts.available,
      });
      if (params.progress) {
        params.progress.completed++;
        params.progress.report(params.progress);
      }
    });
    await runWithConcurrency(tasks, this.getIndexConcurrency());
    const staleRows = this.db
      .prepare(`SELECT path FROM files WHERE source = ?`)
      .all("sessions") as Array<{ path: string }>;
    for (const stale of staleRows) {
      if (activePaths.has(stale.path)) continue;
      this.db
        .prepare(`DELETE FROM files WHERE path = ? AND source = ?`)
        .run(stale.path, "sessions");
      try {
        this.db
          .prepare(
            `DELETE FROM ${VECTOR_TABLE} WHERE id IN (SELECT id FROM chunks WHERE path = ? AND source = ?)`,
          )
          .run(stale.path, "sessions");
      } catch {}
      this.db
        .prepare(`DELETE FROM chunks WHERE path = ? AND source = ?`)
        .run(stale.path, "sessions");
      if (this.fts.available) {
        try {
          this.db
            .prepare(`DELETE FROM ${FTS_TABLE} WHERE path = ? AND source = ? AND model = ?`)
            .run(stale.path, "sessions", this.provider.model);
        } catch {}
      }
    }
  }

  private getIndexConcurrency(): number {
    return this.batch.isEnabled() ? 2 : EMBEDDING_INDEX_CONCURRENCY;
  }

  private ensureWatcher() {
    if (!this.sources.has("memory") || !this.settings.sync.watch || this.watcher) return;
    this.watcher = chokidar.watch(
      [path.join(this.workspaceDir, "MEMORY.md"), path.join(this.workspaceDir, "memory")],
      {
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: this.settings.sync.watchDebounceMs,
          pollInterval: 100,
        },
      },
    );
    const markDirty = () => {
      this.dirty = true;
      this.scheduleWatchSync();
    };
    this.watcher.on("add", markDirty).on("change", markDirty).on("unlink", markDirty);
  }

  private ensureSessionListener() {
    if (!this.sources.has("sessions") || this.sessionUnsubscribe) return;
    this.sessionUnsubscribe = onSessionTranscriptUpdate((update) => {
      if (this.closed) return;
      if (isSessionFileForAgent({ sessionFile: update.sessionFile, agentId: this.agentId }))
        this.scheduleSessionDirty(update.sessionFile);
    });
  }

  private scheduleSessionDirty(sessionFile: string) {
    this.sessionPendingFiles.add(sessionFile);
    if (!this.sessionWatchTimer)
      this.sessionWatchTimer = setTimeout(() => {
        this.sessionWatchTimer = null;
        void this.processSessionDeltaBatch().catch((err) =>
          log.warn(`memory session delta failed: ${String(err)}`),
        );
      }, SESSION_DIRTY_DEBOUNCE_MS);
  }

  private async processSessionDeltaBatch(): Promise<void> {
    if (this.sessionPendingFiles.size === 0) return;
    const pending = Array.from(this.sessionPendingFiles);
    this.sessionPendingFiles.clear();
    let shouldSync = false;
    for (const sessionFile of pending) {
      const delta = await updateSessionDelta({
        sessionFile,
        settings: this.settings,
        sessionDeltas: this.sessionDeltas,
      });
      if (!delta) continue;
      const hit =
        (delta.deltaBytes <= 0 ? delta.pendingBytes > 0 : delta.pendingBytes >= delta.deltaBytes) ||
        (delta.deltaMessages <= 0
          ? delta.pendingMessages > 0
          : delta.pendingMessages >= delta.deltaMessages);
      if (hit) {
        this.sessionsDirtyFiles.add(sessionFile);
        this.sessionsDirty = true;
        shouldSync = true;
      }
    }
    if (shouldSync)
      void this.sync({ reason: "session-delta" }).catch((err) =>
        log.warn(`memory sync failed (session-delta): ${String(err)}`),
      );
  }

  private ensureIntervalSync() {
    const min = this.settings.sync.intervalMinutes;
    if (!min || min <= 0 || this.intervalTimer) return;
    this.intervalTimer = setInterval(
      () => {
        void this.sync({ reason: "interval" }).catch((err) =>
          log.warn(`memory sync failed (interval): ${String(err)}`),
        );
      },
      min * 60 * 1000,
    );
  }

  private scheduleWatchSync() {
    if (!this.sources.has("memory") || !this.settings.sync.watch) return;
    if (this.watchTimer) clearTimeout(this.watchTimer);
    this.watchTimer = setTimeout(() => {
      this.watchTimer = null;
      void this.sync({ reason: "watch" }).catch((err) =>
        log.warn(`memory sync failed (watch): ${String(err)}`),
      );
    }, this.settings.sync.watchDebounceMs);
  }

  async close() {
    this.closed = true;
    if (this.watcher) await this.watcher.close();
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    if (this.sessionUnsubscribe) this.sessionUnsubscribe();
    this.db.close();
    INDEX_CACHE.delete(this.cacheKey);
  }

  public status() {
    const counts = this.db.prepare("SELECT COUNT(*) as c FROM files").get() as { c: number };
    const chunkCounts = this.db.prepare("SELECT COUNT(*) as c FROM chunks").get() as { c: number };
    const sourceCounts = this.db
      .prepare(
        "SELECT source, COUNT(DISTINCT path) as files, COUNT(*) as chunks FROM chunks GROUP BY source",
      )
      .all() as Array<{ source: string; files: number; chunks: number }>;
    const cacheEntries = this.db
      .prepare(`SELECT COUNT(*) as c FROM ${EMBEDDING_CACHE_TABLE}`)
      .get() as { c: number };

    return {
      agentId: this.agentId,
      workspaceDir: this.workspaceDir,
      dbPath: resolveUserPath(this.settings.store.path),
      provider: this.provider.id,
      requestedProvider: this.settings.provider,
      model: this.provider.model,
      sources: Array.from(this.sources),
      files: counts.c,
      chunks: chunkCounts.c,
      sourceCounts,
      dirty: this.dirty || this.sessionsDirty,
      active: INDEX_CACHE.has(this.cacheKey),
      vector: {
        enabled: this.vector.enabled,
        available: this.vector.available,
        dims: this.vector.dims,
        loadError: this.vector.loadError,
        extensionPath: this.vector.extensionPath,
      },
      fts: {
        enabled: this.fts.enabled,
        available: this.fts.available,
        error: this.fts.loadError,
      },
      cache: {
        enabled: this.cache.enabled,
        maxEntries: this.cache.maxEntries,
        entries: cacheEntries.c,
      },
      batch: {
        enabled: this.batch.isEnabled(),
        failures: this.batch.getFailures(),
        limit: BATCH_FAILURE_LIMIT,
        lastError: this.batch.getLastError(),
      },
      fallback:
        this.provider.id !== this.settings.provider
          ? { from: this.settings.provider, reason: "auto-fallback" }
          : undefined,
    };
  }

  public async readFile(params: { relPath: string }): Promise<{ text: string; path: string }> {
    const absPath = path.join(this.workspaceDir, params.relPath);
    const text = await fs.readFile(absPath, "utf-8");
    return { text, path: params.relPath };
  }

  public async probeEmbeddingAvailability(): Promise<{
    ok: boolean;
    error?: string;
  }> {
    try {
      await withTimeout(
        this.provider.embedQuery("test"),
        resolveEmbeddingTimeout("query", this.provider.id),
        "embedding probe timed out",
      );
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  public async probeVectorAvailability(): Promise<{
    available: boolean;
    error?: string;
  }> {
    const available = await this.ensureVectorReady();
    return { available, error: this.vector.loadError };
  }
}

export type { MemorySearchResult };
