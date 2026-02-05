import fs from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { WebSocket } from "ws";
import {
  connectOk,
  installGatewayTestHooks,
  rpcReq,
  startServerWithClient,
  testState,
  writeSessionStore,
} from "./test-helpers.js";

installGatewayTestHooks({ scope: "suite" });

let server: Awaited<ReturnType<typeof startServerWithClient>>["server"];
let ws: WebSocket;

beforeAll(async () => {
  const started = await startServerWithClient();
  server = started.server;
  ws = started.ws;
  await connectOk(ws);
});

afterAll(async () => {
  ws.close();
  await server.close();
});

describe("gateway security", () => {
  test("chat.send prevents path traversal via idempotencyKey", async () => {
    // 1. Setup session store
    const rootDir = path.join(process.env.ZERO_STATE_DIR!, "sessions");
    await fs.mkdir(rootDir, { recursive: true });
    testState.sessionStorePath = path.join(rootDir, "sessions.json");

    await writeSessionStore({
      entries: {
        main: {
          sessionId: "sess-main",
          updatedAt: Date.now(),
        },
      },
    });

    // 2. Target file to write outside the session directory
    const targetFile = path.resolve(rootDir, "..", "pwned.jsonl");
    const relativeExploit = "../pwned"; // This will resolve to rootDir/../pwned.jsonl

    // 3. Mock getReplyFromConfig to return a reply
    const { getReplyFromConfig } = await import("./test-helpers.js");
    const spy = getReplyFromConfig as any;
    spy.mockResolvedValue({ text: "pwned!" });

    // 4. Trigger chat.send with malicious idempotencyKey
    const res = await rpcReq(ws, "chat.send", {
      sessionKey: "non-existent", // Load session will fail to find entry, use clientRunId as sessionId
      message: "hello security",
      idempotencyKey: relativeExploit,
    });

    expect(res.ok).toBe(true);

    // 5. Check if the file was created outside the intended directory
    let exists = false;
    let content = "";
    try {
      content = await fs.readFile(targetFile, "utf-8");
      exists = true;
    } catch {
      exists = false;
    }

    expect(
      exists,
      "File should NOT have been created outside session directory. Content: " + content,
    ).toBe(false);
  });
});
