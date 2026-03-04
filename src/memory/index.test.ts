import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getMemorySearchManager, type MemoryIndexManager } from "./index.js";

let embedBatchCalls = 0;
let failEmbeddings = false;

vi.mock("./embeddings.js", () => {
  const embedText = (text: string) => {
    const lower = text.toLowerCase();
    const alpha = lower.split("alpha").length - 1;
    const beta = lower.split("beta").length - 1;
    return [alpha, beta];
  };
  return {
    createEmbeddingProvider: async (options: { model?: string }) => ({
      requestedProvider: "openai",
      provider: {
        id: "mock",
        model: options.model ?? "mock-embed",
        embedQuery: async (text: string) => embedText(text),
        embedBatch: async (texts: string[]) => {
          embedBatchCalls += 1;
          if (failEmbeddings) {
            throw new Error("mock embeddings failed");
          }
          return texts.map(embedText);
        },
      },
    }),
  };
});

describe("memory index", () => {
  let workspaceDir: string;
  let indexPath: string;
  let manager: MemoryIndexManager | null = null;

  beforeEach(async () => {
    embedBatchCalls = 0;
    failEmbeddings = false;
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "zero-mem-"));
    indexPath = path.join(workspaceDir, "index.sqlite");
    await fs.mkdir(path.join(workspaceDir, "memory"));
    await fs.writeFile(
      path.join(workspaceDir, "memory", "2026-01-12.md"),
      "# Log\nAlpha memory line.\nZebra memory line.\nAnother line.",
    );
    await fs.writeFile(path.join(workspaceDir, "MEMORY.md"), "Beta knowledge base entry.");
  });

  afterEach(async () => {
    if (manager) {
      try {
        await manager.close();
      } catch (err) {
        console.error("Failed to close manager in afterEach", err);
      }
      manager = null;
    }
    // Windows CI stabilization: small delay to let handles settle
    if (process.platform === "win32") {
      await new Promise((r) => setTimeout(r, 100));
    }
    // Retry rm if EBUSY occurs
    let deleted = false;
    for (let i = 0; i < 10; i++) {
      try {
        await fs.rm(workspaceDir, { recursive: true, force: true });
        deleted = true;
        break;
      } catch (err) {
        if ((err as any).code === "EBUSY" && i < 9) {
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }
        // If it's another error, or we're at the last attempt, don't throw yet
        // just log and continue to next test to avoid breaking the CI run
        console.warn(`Attempt ${i + 1} to delete ${workspaceDir} failed: ${String(err)}`);
      }
    }
    if (!deleted) {
      console.error(
        `CRITICAL: Failed to delete workspaceDir ${workspaceDir} after 10 retries. This may cause EBUSY in subsequent tests.`,
      );
    }
  });

  it("indexes memory files and searches by vector", async () => {
    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai" as const,
            model: "mock-embed",
            store: { path: indexPath, vector: { enabled: false } },
            sync: { watch: false, onSessionStart: false, onSearch: true },
            query: { minScore: 0 },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };
    const result = await getMemorySearchManager({ cfg, agentId: "main" });
    expect(result.manager).not.toBeNull();
    if (!result.manager) throw new Error("manager missing");
    manager = result.manager;
    await result.manager.sync({ force: true });
    const results = await result.manager.search("alpha");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.path).toContain("memory/2026-01-12.md");
    const status = result.manager.status();
    expect(status.sourceCounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "memory",
          files: status.files,
          chunks: status.chunks,
        }),
      ]),
    );
  });

  it("reindexes when the embedding model changes", async () => {
    const base = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai" as const,
            store: { path: indexPath, vector: { enabled: false } },
            sync: { watch: false, onSessionStart: false, onSearch: true },
            query: { minScore: 0 },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };

    const first = await getMemorySearchManager({
      cfg: {
        ...base,
        agents: {
          ...base.agents,
          defaults: {
            ...base.agents.defaults,
            memorySearch: {
              ...base.agents.defaults.memorySearch,
              model: "mock-embed-v1",
            },
          },
        },
      },
      agentId: "main",
    });
    expect(first.manager).not.toBeNull();
    if (!first.manager) throw new Error("manager missing");
    await first.manager.sync({ force: true });
    await first.manager.close();

    const second = await getMemorySearchManager({
      cfg: {
        ...base,
        agents: {
          ...base.agents,
          defaults: {
            ...base.agents.defaults,
            memorySearch: {
              ...base.agents.defaults.memorySearch,
              model: "mock-embed-v2",
            },
          },
        },
      },
      agentId: "main",
    });
    expect(second.manager).not.toBeNull();
    if (!second.manager) throw new Error("manager missing");
    manager = second.manager;
    await second.manager.sync({ reason: "test" });
    const results = await second.manager.search("alpha");
    expect(results.length).toBeGreaterThan(0);
  });

  it("reuses cached embeddings on forced reindex", async () => {
    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai" as const,
            model: "mock-embed",
            store: { path: indexPath, vector: { enabled: false } },
            sync: { watch: false, onSessionStart: false, onSearch: false },
            query: { minScore: 0 },
            cache: { enabled: true },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };
    const result = await getMemorySearchManager({ cfg, agentId: "main" });
    expect(result.manager).not.toBeNull();
    if (!result.manager) throw new Error("manager missing");
    manager = result.manager;
    await manager.sync({ force: true });
    const afterFirst = embedBatchCalls;
    expect(afterFirst).toBeGreaterThan(0);

    await manager.sync({ force: true });
    expect(embedBatchCalls).toBe(afterFirst);
  });

  it("preserves existing index when forced reindex fails", async () => {
    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai" as const,
            model: "mock-embed",
            store: { path: indexPath, vector: { enabled: false } },
            sync: { watch: false, onSessionStart: false, onSearch: false },
            query: { minScore: 0 },
            cache: { enabled: false },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };
    const result = await getMemorySearchManager({ cfg, agentId: "main" });
    expect(result.manager).not.toBeNull();
    if (!result.manager) throw new Error("manager missing");
    manager = result.manager;

    await manager.sync({ force: true });
    const before = manager.status();
    expect(before.files).toBeGreaterThan(0);

    failEmbeddings = true;
    await expect(manager.sync({ force: true })).rejects.toThrow(/mock embeddings failed/i);

    const after = manager.status();
    expect(after.files).toBe(before.files);
    expect(after.chunks).toBe(before.chunks);

    const files = await fs.readdir(workspaceDir);
    expect(files.some((name) => name.includes(".tmp-"))).toBe(false);
  });

  it("finds keyword matches via hybrid search when query embedding is zero", async () => {
    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai" as const,
            model: "mock-embed",
            store: { path: indexPath, vector: { enabled: false } },
            sync: { watch: false, onSessionStart: false, onSearch: true },
            query: {
              minScore: 0,
              hybrid: { enabled: true, vectorWeight: 0, textWeight: 1 },
            },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };
    const result = await getMemorySearchManager({ cfg, agentId: "main" });
    expect(result.manager).not.toBeNull();
    if (!result.manager) throw new Error("manager missing");
    manager = result.manager;

    const status = manager.status();
    if (!status.fts?.available) return;

    await manager.sync({ force: true });
    const results = await manager.search("zebra");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.path).toContain("memory/2026-01-12.md");
  });

  it("hybrid weights can favor vector-only matches over keyword-only matches", async () => {
    const manyAlpha = Array.from({ length: 200 }, () => "Alpha").join(" ");
    await fs.writeFile(
      path.join(workspaceDir, "memory", "vector-only.md"),
      "Alpha beta. Alpha beta. Alpha beta. Alpha beta.",
    );
    await fs.writeFile(
      path.join(workspaceDir, "memory", "keyword-only.md"),
      `${manyAlpha} beta id123.`,
    );

    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai" as const,
            model: "mock-embed",
            store: { path: indexPath, vector: { enabled: false } },
            sync: { watch: false, onSessionStart: false, onSearch: true },
            query: {
              minScore: 0,
              maxResults: 200,
              hybrid: {
                enabled: true,
                vectorWeight: 0.99,
                textWeight: 0.01,
                candidateMultiplier: 10,
              },
            },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };
    const result = await getMemorySearchManager({ cfg, agentId: "main" });
    expect(result.manager).not.toBeNull();
    if (!result.manager) throw new Error("manager missing");
    manager = result.manager;

    const status = manager.status();
    if (!status.fts?.available) return;

    await manager.sync({ force: true });
    const results = await manager.search("alpha beta id123");
    expect(results.length).toBeGreaterThan(0);
    const paths = results.map((r) => r.path);
    expect(paths).toContain("memory/vector-only.md");
    expect(paths).toContain("memory/keyword-only.md");
    const vectorOnly = results.find((r) => r.path === "memory/vector-only.md");
    const keywordOnly = results.find((r) => r.path === "memory/keyword-only.md");
    expect((vectorOnly?.score ?? 0) > (keywordOnly?.score ?? 0)).toBe(true);
  });

  it("hybrid weights can favor keyword matches when text weight dominates", async () => {
    const manyAlpha = Array.from({ length: 200 }, () => "Alpha").join(" ");
    await fs.writeFile(
      path.join(workspaceDir, "memory", "vector-only.md"),
      "Alpha beta. Alpha beta. Alpha beta. Alpha beta.",
    );
    await fs.writeFile(
      path.join(workspaceDir, "memory", "keyword-only.md"),
      `${manyAlpha} beta id123.`,
    );

    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai" as const,
            model: "mock-embed",
            store: { path: indexPath, vector: { enabled: false } },
            sync: { watch: false, onSessionStart: false, onSearch: true },
            query: {
              minScore: 0,
              maxResults: 200,
              hybrid: {
                enabled: true,
                vectorWeight: 0.01,
                textWeight: 0.99,
                candidateMultiplier: 10,
              },
            },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };
    const result = await getMemorySearchManager({ cfg, agentId: "main" });
    expect(result.manager).not.toBeNull();
    if (!result.manager) throw new Error("manager missing");
    manager = result.manager;

    const status = manager.status();
    if (!status.fts?.available) return;

    await manager.sync({ force: true });
    const results = await manager.search("alpha beta id123");
    expect(results.length).toBeGreaterThan(0);
    const paths = results.map((r) => r.path);
    expect(paths).toContain("memory/vector-only.md");
    expect(paths).toContain("memory/keyword-only.md");
    const vectorOnly = results.find((r) => r.path === "memory/vector-only.md");
    const keywordOnly = results.find((r) => r.path === "memory/keyword-only.md");
    expect((keywordOnly?.score ?? 0) > (vectorOnly?.score ?? 0)).toBe(true);
  });

  it("reports vector availability after probe", async () => {
    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai" as const,
            model: "mock-embed",
            store: { path: indexPath, vector: { enabled: false } },
            sync: { watch: false, onSessionStart: false, onSearch: false },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };
    const result = await getMemorySearchManager({ cfg, agentId: "main" });
    expect(result.manager).not.toBeNull();
    if (!result.manager) throw new Error("manager missing");
    manager = result.manager;
    const available = await result.manager.probeVectorAvailability();
    const status = result.manager.status();
    expect(status.vector?.enabled).toBe(false);
    expect(typeof status.vector?.available).toBe("boolean");
    expect(status.vector?.available).toBe(available.available);
  });

  it("rejects reading non-memory paths", async () => {
    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai" as const,
            model: "mock-embed",
            store: { path: indexPath, vector: { enabled: false } },
            sync: { watch: false, onSessionStart: false, onSearch: true },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };
    const result = await getMemorySearchManager({ cfg, agentId: "main" });
    expect(result.manager).not.toBeNull();
    if (!result.manager) throw new Error("manager missing");
    manager = result.manager;
    await expect(result.manager.readFile({ relPath: "NOTES.md" })).rejects.toThrow(
      "no such file or directory",
    );
  });
});
