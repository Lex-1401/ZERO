import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { ZEROPluginApi, ZEROPluginToolContext } from "../../../src/plugins/types.js";
import { createVOIDTool } from "./void-tool.js";

async function writeFakeVOIDScript(scriptBody: string, prefix = "zero-void-plugin-") {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const isWindows = process.platform === "win32";

  if (isWindows) {
    const scriptPath = path.join(dir, "void.js");
    const cmdPath = path.join(dir, "void.cmd");
    await fs.writeFile(scriptPath, scriptBody, { encoding: "utf8" });
    const cmd = `@echo off\r\n"${process.execPath}" "${scriptPath}" %*\r\n`;
    await fs.writeFile(cmdPath, cmd, { encoding: "utf8" });
    return { dir, binPath: cmdPath };
  }

  const binPath = path.join(dir, "void");
  const file = `#!/usr/bin/env node\n${scriptBody}\n`;
  await fs.writeFile(binPath, file, { encoding: "utf8", mode: 0o755 });
  return { dir, binPath };
}

async function writeFakeVOID(params: { payload: unknown }) {
  const scriptBody =
    `const payload = ${JSON.stringify(params.payload)};\n` +
    `process.stdout.write(JSON.stringify(payload));\n`;
  return await writeFakeVOIDScript(scriptBody);
}

function fakeApi(): ZEROPluginApi {
  return {
    id: "void",
    name: "void",
    source: "test",
    config: {} as any,
    runtime: { version: "test" } as any,
    logger: { info() { }, warn() { }, error() { }, debug() { } },
    registerTool() { },
    registerHttpHandler() { },
    registerChannel() { },
    registerGatewayMethod() { },
    registerCli() { },
    registerService() { },
    registerProvider() { },
    registerHook() { },
    registerHttpRoute() { },
    registerCommand() { },
    on() { },
    resolvePath: (p: string) => p,
  };
}

function fakeCtx(overrides: Partial<ZEROPluginToolContext> = {}): ZEROPluginToolContext {
  return {
    config: {} as any,
    workspaceDir: "/tmp",
    agentDir: "/tmp",
    agentId: "main",
    sessionKey: "main",
    messageChannel: undefined,
    agentAccountId: undefined,
    sandboxed: false,
    ...overrides,
  };
}

describe("void plugin tool", () => {
  it("runs void and returns parsed envelope in details", async () => {
    const fake = await writeFakeVOID({
      payload: { ok: true, status: "ok", output: [{ hello: "world" }], requiresApproval: null },
    });

    const tool = createVOIDTool(fakeApi());
    const res = await tool.execute("call1", {
      action: "run",
      pipeline: "noop",
      voidPath: fake.binPath,
      timeoutMs: 5000,
    });

    expect(res.details).toMatchObject({ ok: true, status: "ok" });
  });

  it("requires absolute voidPath when provided", async () => {
    const tool = createVOIDTool(fakeApi());
    await expect(
      tool.execute("call2", {
        action: "run",
        pipeline: "noop",
        voidPath: "./void",
      }),
    ).rejects.toThrow(/absolute path/);
  });

  it("rejects invalid JSON from void", async () => {
    const { binPath } = await writeFakeVOIDScript(
      `process.stdout.write("nope");\n`,
      "zero-void-plugin-bad-",
    );

    const tool = createVOIDTool(fakeApi());
    await expect(
      tool.execute("call3", {
        action: "run",
        pipeline: "noop",
        voidPath: binPath,
      }),
    ).rejects.toThrow(/invalid JSON/);
  });

  it("can be gated off in sandboxed contexts", async () => {
    const api = fakeApi();
    const factoryTool = (ctx: ZEROPluginToolContext) => {
      if (ctx.sandboxed) return null;
      return createVOIDTool(api);
    };

    expect(factoryTool(fakeCtx({ sandboxed: true }))).toBeNull();
    expect(factoryTool(fakeCtx({ sandboxed: false }))?.name).toBe("void");
  });
});
