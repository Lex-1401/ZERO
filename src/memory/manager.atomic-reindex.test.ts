import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getMemorySearchManager, type MemoryIndexManager } from "./index.js";

let shouldFail = false;

vi.mock("chokidar", () => ({
  default: {
    watch: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      close: vi.fn(async () => undefined),
    })),
  },
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn(async () => undefined),
  })),
}));

vi.mock("./embeddings.js", () => {
  return {
    createEmbeddingProvider: async () => ({
      requestedProvider: "openai",
      provider: {
        id: "mock",
        model: "mock-embed",
        embedQuery: async () => [1, 0, 0],
        embedBatch: async (texts: string[]) => {
          if (shouldFail) {
            throw new Error("embedding failure");
          }
          return texts.map((_, index) => [index + 1, 0, 0]);
        },
      },
    }),
  };
});

describe("memory manager atomic reindex", () => {
  let workspaceDir: string;
  let indexPath: string;
  let manager: MemoryIndexManager | null = null;

  beforeEach(async () => {
    shouldFail = false;
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "zero-mem-"));
    indexPath = path.join(workspaceDir, "index.sqlite");
    await fs.mkdir(path.join(workspaceDir, "memory"));
    await fs.writeFile(path.join(workspaceDir, "MEMORY.md"), "Hello memory.");
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
        console.warn(`Attempt ${i + 1} to delete ${workspaceDir} failed: ${String(err)}`);
      }
    }
    if (!deleted) {
      console.error(`CRITICAL: Failed to delete workspaceDir ${workspaceDir} after 10 retries.`);
    }
  });

  it("keeps the prior index when a full reindex fails", async () => {
    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai" as const,
            model: "mock-embed",
            store: { path: indexPath, vector: { enabled: false } },
            cache: { enabled: false },
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

    await manager.sync({ force: true });
    const before = await manager.search("Hello");
    expect(before.length).toBeGreaterThan(0);

    shouldFail = true;
    await expect(manager.sync({ force: true })).rejects.toThrow("embedding failure");

    const after = await manager.search("Hello");
    expect(after.length).toBeGreaterThan(0);
  });
});
