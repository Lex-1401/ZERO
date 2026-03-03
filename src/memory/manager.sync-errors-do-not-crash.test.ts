import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MemoryIndexManager } from "./manager.js";
import { resolveMemorySearchConfig } from "../agents/memory-search.js";

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
        embedQuery: async () => [0, 0, 0],
        embedBatch: async () => {
          throw new Error("openai embeddings failed: 400 bad request");
        },
      },
    }),
  };
});

describe("memory manager sync failures", () => {
  let workspaceDir: string;
  let indexPath: string;
  let manager: MemoryIndexManager | null = null;

  beforeEach(async () => {
    vi.useFakeTimers();
    workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), "zero-mem-"));
    indexPath = path.join(workspaceDir, "index.sqlite");
    await fs.mkdir(path.join(workspaceDir, "memory"));
    await fs.writeFile(path.join(workspaceDir, "MEMORY.md"), "Hello");
  });

  afterEach(async () => {
    vi.useRealTimers();
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

  it("does not raise unhandledRejection when watch-triggered sync fails", async () => {
    const unhandled: unknown[] = [];
    const handler = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", handler);

    const cfg = {
      agents: {
        defaults: {
          workspace: workspaceDir,
          memorySearch: {
            provider: "openai" as const,
            model: "mock-embed",
            store: { path: indexPath, vector: { enabled: false } },
            sync: { watch: true, watchDebounceMs: 1, onSessionStart: false, onSearch: false },
          },
        },
        list: [{ id: "main", default: true }],
      },
    };

    manager = await MemoryIndexManager.get({ cfg: cfg as any, agentId: "main" });
    if (!manager) {
      const settings = resolveMemorySearchConfig(cfg as any, "main");
      console.error("MemorySearch settings:", settings);
    }
    expect(manager).not.toBeNull();
    if (!manager) throw new Error("manager missing");
    const syncSpy = vi.spyOn(manager, "sync");

    // Call the internal scheduler directly; it uses fire-and-forget sync.
    (manager as unknown as { scheduleWatchSync: () => void }).scheduleWatchSync();

    await vi.runOnlyPendingTimersAsync();
    const syncPromise = syncSpy.mock.results[0]?.value as Promise<void> | undefined;
    vi.useRealTimers();
    if (syncPromise) {
      await syncPromise.catch(() => undefined);
    }

    process.off("unhandledRejection", handler);
    expect(unhandled).toHaveLength(0);
  });
});
