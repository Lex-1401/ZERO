import { describe, expect, it, vi } from "vitest";

import type { runExec } from "../process/exec.js";
import type { RuntimeEnv } from "../runtime.js";
import { ensureBinary } from "./binaries.js";

describe("ensureBinary", () => {
  it("passes through when binary exists", async () => {
    const exec: typeof runExec = vi.fn().mockResolvedValue({
      stdout: "",
      stderr: "",
    });
    const runtime: RuntimeEnv = {
      log: vi.fn(),
      error: vi.fn(),
      exit: vi.fn() as unknown as (code: number) => never,
    };
    await ensureBinary("node", exec, runtime);
    const expectedCmd = process.platform === "win32" ? "where" : "which";
    expect(exec).toHaveBeenCalledWith(expectedCmd, ["node"]);
  });

  it("logs and exits when missing", async () => {
    const exec: typeof runExec = vi.fn().mockRejectedValue(new Error("missing"));
    const error = vi.fn();
    const exit = vi.fn((code: number) => {
      console.log(`Exit called with ${code}`);
      throw new Error("exit");
    }) as unknown as (code: number) => never;
    await expect(ensureBinary("ghost", exec, { log: vi.fn(), error, exit })).rejects.toThrow(
      "exit",
    );
    expect(error).toHaveBeenCalledWith("Missing required binary: ghost. Please install it.");
    expect(exit).toHaveBeenCalledWith(1);
  });
});
