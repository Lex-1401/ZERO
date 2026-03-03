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
import { buildFileEntry, listMemoryFiles, normalizeRelPath, isMemoryPath } from "./internal.js";
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
  public closed = false;
  private dirty = false;
  private sessionsDirty = false;
  private sessionsDirtyFiles = new Set<string>();
  private sessionDeltas = new Map<
    string,
    { lastSize: number; pendingBytes: number; pendingMessages: number }
  >();
  private sessionWarm = new Set<string>();
  private syncing: Promise<void> | null = null;
  public graph: KnowledgeGraph;
  private readonly d2l: any;

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
    if (existing && !existing.closed) return existing;
    if (existing) INDEX_CACHE.delete(key);
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

    try {
      const { D2LEngine } = require("@zero/ratchet");
      this.d2l = new D2LEngine(100);
      this.generateSoulAdapter().catch((err) => log.error("D2L Soul Adapter failed", err as any));
    } catch {
      log.warn("D2LEngine native module not found, D2L features will be disabled.");
    }
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

    // Graph Extraction & RAG Enhancement
    const graphEntities = this.graph.searchEntities(cleaned, 3);
    const graphContext = this.graph.getGraphContext(graphEntities.map((e) => e.name));

    let combined: MemorySearchResult[] = [];
    if (!hybrid.enabled) {
      combined = vectorResults.filter((r) => r.score >= minScore);
    } else {
      combined = mergeHybridCoord({
        vector: vectorResults,
        keyword: keywordResults,
        vectorWeight: hybrid.vectorWeight,
        textWeight: hybrid.textWeight,
      });
    }

    if (graphContext) {
      combined.unshift({
        path: "KNOWLEDGE_GRAPH",
        source: "memory",
        score: 1.0,
        snippet: `[KNOWLEDGE GRAPH CONTEXT]\n${graphContext}`,
        startLine: 0,
        endLine: 0,
      } as MemorySearchResult);
    }

    // Doc-to-LoRA Internalization
    if (this.d2l && combined.length > 0) {
      const top = combined[0];
      if (top.snippet && top.snippet.length > 1000) {
        this.d2l.internalize_context(top.snippet).catch(() => {});
      }
    }

    return combined.filter((r) => r.score >= minScore).slice(0, maxResults);
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
        : "text-embedding-3-small";
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
    this.graph = new KnowledgeGraph(this.db);
    this.vector.available = null;
    ensureSchema({ db: this.db, ftsEnabled: this.fts.enabled });
    try {
      seedEmbeddingCache({ targetDb: this.db, sourceDb: originalDb });
      if (this.sources.has("memory"))
        await this.syncMemoryFiles({ needsFullReindex: true, progress: params.progress });
      if (
        shouldSyncSessions({
          ...params,
          needsFullReindex: true,
          sessionsDirty: true,
          sessionsDirtyFilesSize: 1,
          sources: this.sources,
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
      this.db.close();
      originalDb.close();
      await swapIndexFiles(dbPath, tempDbPath);
      this.db = openDatabaseAtPath({ dbPath, allowExtension: this.settings.store.vector.enabled });
      this.graph = new KnowledgeGraph(this.db);
      ensureSchema({ db: this.db, ftsEnabled: this.fts.enabled });
      this.vector.dims = nextMeta.vectorDims;
    } catch (err) {
      try {
        this.db.close();
      } catch {}
      await removeIndexFiles(tempDbPath);
      this.db = openDatabaseAtPath({ dbPath, allowExtension: this.settings.store.vector.enabled });
      this.graph = new KnowledgeGraph(this.db);
      this.vector.available = originalState.available;
      this.vector.dims = originalState.dims;
      throw err;
    }
  }

  private async ensureVectorReady(dimensions?: number): Promise<boolean> {
    if (!this.vector.enabled) return false;
    if (!this.vectorReady) {
      this.vectorReady = loadVectorExtension({
        db: this.db,
        extensionPath: this.vector.extensionPath,
      }).then((r) => {
        this.vector.available = r.available;
        this.vector.extensionPath = r.extensionPath;
        this.vector.loadError = r.error;
        return r.available;
      });
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
    const tasks = files.map((f) => async () => {
      const entry = await buildFileEntry(f, this.workspaceDir);
      const record = this.db
        .prepare(`SELECT hash FROM files WHERE path = ? AND source = ?`)
        .get(entry.path, "memory") as { hash: string } | undefined;
      if (!params.needsFullReindex && record?.hash === entry.hash) return;
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
    });
    await runWithConcurrency(tasks, this.getIndexConcurrency());
  }

  private async syncSessionFiles(params: {
    needsFullReindex: boolean;
    progress?: MemorySyncProgressState;
  }) {
    const files = await listSessionFiles(this.agentId);
    const tasks = files.map((f) => async () => {
      const entry = await buildSessionEntry(f);
      if (!entry) return;
      const record = this.db
        .prepare(`SELECT hash FROM files WHERE path = ? AND source = ?`)
        .get(entry.path, "sessions") as { hash: string } | undefined;
      if (!params.needsFullReindex && record?.hash === entry.hash) return;
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
    });
    await runWithConcurrency(tasks, this.getIndexConcurrency());
  }

  private getIndexConcurrency(): number {
    return this.batch.isEnabled() ? 2 : EMBEDDING_INDEX_CONCURRENCY;
  }

  private ensureWatcher() {
    if (!this.sources.has("memory") || !this.settings.sync.watch || this.watcher) return;
    this.watcher = chokidar.watch(
      [path.join(this.workspaceDir, "MEMORY.md"), path.join(this.workspaceDir, "memory")],
      { ignoreInitial: true },
    );
    this.watcher.on("all", () => {
      this.dirty = true;
      this.scheduleWatchSync();
    });
  }

  private ensureSessionListener() {
    if (!this.sources.has("sessions") || this.sessionUnsubscribe) return;
    this.sessionUnsubscribe = onSessionTranscriptUpdate((update) => {
      if (this.closed) return;
      if (isSessionFileForAgent({ sessionFile: update.sessionFile, agentId: this.agentId })) {
        this.sessionsDirty = true;
        this.scheduleWatchSync();
      }
    });
  }

  private scheduleWatchSync() {
    if (this.watchTimer) clearTimeout(this.watchTimer);
    this.watchTimer = setTimeout(() => {
      this.watchTimer = null;
      void this.sync({ reason: "watch" });
    }, 2000);
  }

  private ensureIntervalSync() {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(() => {
      void this.sync({ reason: "interval" });
    }, 300000);
  }

  async generateSoulAdapter(): Promise<void> {
    try {
      const workspaceDir = resolveAgentWorkspaceDir(this.cfg, this.agentId);
      const soulPath = path.join(workspaceDir, "SOUL.md");
      const content = await fs.readFile(soulPath, "utf-8").catch(() => null);
      if (content && this.d2l) await this.d2l.generate_personality_adapter("soul", content);
    } catch {}
  }

  public async probeVectorAvailability(): Promise<{ available: boolean; error?: string }> {
    const available = await this.ensureVectorReady();
    return { available, error: this.vector.loadError };
  }

  async close() {
    this.closed = true;
    INDEX_CACHE.delete(this.cacheKey);
    if (this.watcher) await this.watcher.close();
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    if (this.sessionUnsubscribe) this.sessionUnsubscribe();
    this.db.close();
  }

  public async readFile(params: string | { relPath: string }): Promise<string> {
    const relPath = typeof params === "string" ? params : params.relPath;
    if (!isMemoryPath(relPath)) {
      throw new Error(`no such file or directory (path ${relPath} is not a valid memory path)`);
    }
    const absPath = path.join(this.workspaceDir, relPath);
    return await fs.readFile(absPath, "utf-8");
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
      log.warn("embedding availability probe failed", { error: err as any });
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  public status(): any {
    const meta = readMeta(this.db);
    const sourceCounts: Array<{ source: MemorySource; files: number; chunks: number }> = [];
    let totalFiles = 0;
    let totalChunks = 0;

    for (const source of this.sources) {
      const fileCount = this.db
        .prepare(`SELECT count(*) as count FROM files WHERE source = ?`)
        .get(source) as { count: number };
      const chunkCount = this.db
        .prepare(`SELECT count(*) as count FROM chunks WHERE source = ?`)
        .get(source) as { count: number };
      sourceCounts.push({ source, files: fileCount.count, chunks: chunkCount.count });
      totalFiles += fileCount.count;
      totalChunks += chunkCount.count;
    }

    return {
      agentId: this.agentId,
      provider: this.provider.id,
      model: this.provider.model,
      requestedProvider: this.settings.provider,
      dbPath: this.settings.store.path,
      workspaceDir: this.workspaceDir,
      files: totalFiles,
      chunks: totalChunks,
      sourceCounts,
      dirty: this.dirty,
      vector: {
        ...this.vector,
        available: Boolean(this.vector.available),
      },
      fts: this.fts,
      activeAdapters: (this.d2l as any)?.get_active_adapters_count?.() ?? 0,
      batch: this.batch ? (this.batch as any).status?.() : undefined,
      sources: Array.from(this.sources),
    };
  }
}

export type { MemorySearchResult };
