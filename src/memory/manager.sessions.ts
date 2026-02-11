import fs from "node:fs/promises";
import path from "node:path";
import { resolveSessionTranscriptsDirForAgent } from "../config/sessions/paths.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { hashText } from "./internal.js";
import {
  SESSION_DELTA_READ_CHUNK_BYTES,
  type SessionFileEntry,
  type ResolvedMemorySearchConfig,
} from "./manager.types.js";

const log = createSubsystemLogger("memory");

export async function listSessionFiles(agentId: string): Promise<string[]> {
  const dir = resolveSessionTranscriptsDirForAgent(agentId);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name.endsWith(".jsonl"))
      .map((name) => path.join(dir, name));
  } catch {
    return [];
  }
}

export function sessionPathForFile(absPath: string): string {
  return path.join("sessions", path.basename(absPath)).replace(/\\/g, "/");
}

export function normalizeSessionText(value: string): string {
  return value
    .replace(/\s*\n+\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractSessionText(content: unknown): string | null {
  if (typeof content === "string") {
    const normalized = normalizeSessionText(content);
    return normalized ? normalized : null;
  }
  if (!Array.isArray(content)) return null;
  const parts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const record = block as { type?: unknown; text?: unknown };
    if (record.type !== "text" || typeof record.text !== "string") continue;
    const normalized = normalizeSessionText(record.text);
    if (normalized) parts.push(normalized);
  }
  if (parts.length === 0) return null;
  return parts.join(" ");
}

export async function buildSessionEntry(absPath: string): Promise<SessionFileEntry | null> {
  try {
    const stat = await fs.stat(absPath);
    const raw = await fs.readFile(absPath, "utf-8");
    const lines = raw.split("\n");
    const collected: string[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      let record: unknown;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      if (
        !record ||
        typeof record !== "object" ||
        (record as { type?: unknown }).type !== "message"
      ) {
        continue;
      }
      const message = (record as { message?: unknown }).message as
        | { role?: unknown; content?: unknown }
        | undefined;
      if (!message || typeof message.role !== "string") continue;
      if (message.role !== "user" && message.role !== "assistant") continue;
      const text = extractSessionText(message.content);
      if (!text) continue;
      const label = message.role === "user" ? "User" : "Assistant";
      collected.push(`${label}: ${text}`);
    }
    const content = collected.join("\n");
    return {
      path: sessionPathForFile(absPath),
      absPath,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      hash: hashText(content),
      content,
    };
  } catch (err) {
    log.debug(`Failed reading session file ${absPath}: ${String(err)}`);
    return null;
  }
}

export async function countNewlines(absPath: string, start: number, end: number): Promise<number> {
  if (end <= start) return 0;
  const handle = await fs.open(absPath, "r");
  try {
    let offset = start;
    let count = 0;
    const buffer = Buffer.alloc(SESSION_DELTA_READ_CHUNK_BYTES);
    while (offset < end) {
      const toRead = Math.min(buffer.length, end - offset);
      const { bytesRead } = await handle.read(buffer, 0, toRead, offset);
      if (bytesRead <= 0) break;
      for (let i = 0; i < bytesRead; i += 1) {
        if (buffer[i] === 10) count += 1;
      }
      offset += bytesRead;
    }
    return count;
  } finally {
    await handle.close();
  }
}

export async function updateSessionDelta(params: {
  sessionFile: string;
  settings: ResolvedMemorySearchConfig;
  sessionDeltas: Map<string, { lastSize: number; pendingBytes: number; pendingMessages: number }>;
}): Promise<{
  deltaBytes: number;
  deltaMessages: number;
  pendingBytes: number;
  pendingMessages: number;
} | null> {
  const thresholds = params.settings.sync.sessions;
  if (!thresholds) return null;
  let stat: { size: number };
  try {
    stat = await fs.stat(params.sessionFile);
  } catch {
    return null;
  }
  const size = stat.size;
  let state = params.sessionDeltas.get(params.sessionFile);
  if (!state) {
    state = { lastSize: 0, pendingBytes: 0, pendingMessages: 0 };
    params.sessionDeltas.set(params.sessionFile, state);
  }
  const deltaBytes = Math.max(0, size - state.lastSize);
  if (deltaBytes === 0 && size === state.lastSize) {
    return {
      deltaBytes: thresholds.deltaBytes,
      deltaMessages: thresholds.deltaMessages,
      pendingBytes: state.pendingBytes,
      pendingMessages: state.pendingMessages,
    };
  }
  if (size < state.lastSize) {
    state.lastSize = size;
    state.pendingBytes += size;
    const shouldCountMessages =
      thresholds.deltaMessages > 0 &&
      (thresholds.deltaBytes <= 0 || state.pendingBytes < thresholds.deltaBytes);
    if (shouldCountMessages) {
      state.pendingMessages += await countNewlines(params.sessionFile, 0, size);
    }
  } else {
    state.pendingBytes += deltaBytes;
    const shouldCountMessages =
      thresholds.deltaMessages > 0 &&
      (thresholds.deltaBytes <= 0 || state.pendingBytes < thresholds.deltaBytes);
    if (shouldCountMessages) {
      state.pendingMessages += await countNewlines(params.sessionFile, state.lastSize, size);
    }
    state.lastSize = size;
  }
  params.sessionDeltas.set(params.sessionFile, state);
  return {
    deltaBytes: thresholds.deltaBytes,
    deltaMessages: thresholds.deltaMessages,
    pendingBytes: state.pendingBytes,
    pendingMessages: state.pendingMessages,
  };
}

export function isSessionFileForAgent(params: { sessionFile: string; agentId: string }): boolean {
  if (!params.sessionFile) return false;
  const sessionsDir = resolveSessionTranscriptsDirForAgent(params.agentId);
  const resolvedFile = path.resolve(params.sessionFile);
  const resolvedDir = path.resolve(sessionsDir);
  return resolvedFile.startsWith(`${resolvedDir}${path.sep}`);
}
