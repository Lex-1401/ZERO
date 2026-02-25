import { abortChatRun, loadChatHistory, sendChatMessage } from "./controllers/chat";
import { loadSessions } from "./controllers/sessions";
import { generateUUID } from "./uuid";
import { resetToolStream } from "./app-tool-stream";
import { scheduleChatScroll } from "./app-scroll";
import { setLastActiveSessionKey } from "./app-settings";
import { normalizeBasePath } from "./navigation";
import type { GatewayHelloOk } from "./gateway";
import { parseAgentSessionKey } from "../../../src/sessions/session-key-utils.js";
import type { ZEROApp } from "./app";
import { HapticService } from "./services/haptic-service";

type ChatHost = {
  connected: boolean;
  chatMessage: string;
  chatQueue: Array<{ id: string; text: string; createdAt: number }>;
  chatRunId: string | null;
  chatSending: boolean;
  sessionKey: string;
  basePath: string;
  hello: GatewayHelloOk | null;
  chatAvatarUrl: string | null;
  chatAttachments?: File[];
};

export function isChatBusy(host: ChatHost) {
  return host.chatSending || Boolean(host.chatRunId);
}

export function isChatStopCommand(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const normalized = trimmed.toLowerCase();
  if (normalized === "/stop") return true;
  return (
    normalized === "stop" ||
    normalized === "esc" ||
    normalized === "abort" ||
    normalized === "wait" ||
    normalized === "exit"
  );
}

export async function handleAbortChat(host: ChatHost) {
  if (!host.connected) return;
  host.chatMessage = "";
  await abortChatRun(host as unknown as ZEROApp);
}

function enqueueChatMessage(host: ChatHost, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  host.chatQueue = [
    ...host.chatQueue,
    {
      id: generateUUID(),
      text: trimmed,
      createdAt: Date.now(),
    },
  ];
}

async function sendChatMessageNow(
  host: ChatHost,
  message: string,
  opts?: { previousDraft?: string; restoreDraft?: boolean, attachments?: File[] },
) {
  resetToolStream(host as unknown as Parameters<typeof resetToolStream>[0]);
  const ok = await sendChatMessage(host as unknown as ZEROApp, message, opts?.attachments);
  if (!ok && opts?.previousDraft != null) {
    host.chatMessage = opts.previousDraft;
    // Restore attachments if failed? 
    // Usually host.chatAttachments is already cleared. 
    // If we want to restore, we need to pass them back or store them in opts.
    if (opts.attachments) {
      host.chatAttachments = opts.attachments;
    }
  }
  if (ok) {
    HapticService.success();
    setLastActiveSessionKey(host as unknown as Parameters<typeof setLastActiveSessionKey>[0], host.sessionKey);
  }
  if (ok && opts?.restoreDraft && opts.previousDraft?.trim()) {
    host.chatMessage = opts.previousDraft;
  }
  scheduleChatScroll(host as unknown as Parameters<typeof scheduleChatScroll>[0]);
  if (ok && !host.chatRunId) {
    void flushChatQueue(host);
  }
  return ok;
}

async function flushChatQueue(host: ChatHost) {
  if (!host.connected || isChatBusy(host)) return;
  const [next, ...rest] = host.chatQueue;
  if (!next) return;
  host.chatQueue = rest;
  const ok = await sendChatMessageNow(host, next.text);
  if (!ok) {
    host.chatQueue = [next, ...host.chatQueue];
  }
}

export function removeQueuedMessage(host: ChatHost, id: string) {
  host.chatQueue = host.chatQueue.filter((item) => item.id !== id);
}

export async function handleSendChat(
  host: ChatHost,
  messageOverride?: string,
  opts?: { restoreDraft?: boolean },
) {
  if (!host.connected) return;
  const previousDraft = host.chatMessage;
  const message = (messageOverride ?? host.chatMessage).trim();
  const attachments = host.chatAttachments ? [...host.chatAttachments] : undefined;

  if (!message && (!attachments || attachments.length === 0)) return;

  if (isChatStopCommand(message)) {
    await handleAbortChat(host);
    return;
  }

  if (messageOverride == null) {
    host.chatMessage = "";
    host.chatAttachments = [];
  }

  if (isChatBusy(host)) {
    // Preserve attachments in host state so they are not silently lost.
    // The message is enqueued; attachments remain staged until the queue flushes.
    if (attachments && attachments.length > 0) {
      // Re-stage attachments so the user can still see them as pending.
      host.chatAttachments = attachments;
      // Enqueue the text portion — attachments will be picked up on next send.
      if (message) enqueueChatMessage(host, message);
      return;
    }
    enqueueChatMessage(host, message);
    return;
  }

  await sendChatMessageNow(host, message, {
    previousDraft: messageOverride == null ? previousDraft : undefined,
    restoreDraft: Boolean(messageOverride && opts?.restoreDraft),
    attachments
  });
}

export async function refreshChat(host: ChatHost) {
  await Promise.all([
    loadChatHistory(host as unknown as ZEROApp),
    loadSessions(host as unknown as ZEROApp),
    refreshChatAvatar(host),
  ]);
  scheduleChatScroll(host as unknown as Parameters<typeof scheduleChatScroll>[0], true);
}

export async function predictivePrefetchChat(host: ZEROApp, sessionKey: string) {
  if (!host.connected) return;
  const store = host.chatStore;
  if (store.historyCache.has(sessionKey)) return;
  try {
    const res = (await host.client?.request("chat.history", {
      sessionKey,
      limit: 50,
    })) as { messages?: unknown[]; thinkingLevel?: string | null };
    if (Array.isArray(res.messages)) {
      store.historyCache.set(sessionKey, {
        messages: res.messages,
        thinkingLevel: res.thinkingLevel ?? null,
      });
    }
  } catch {
    /* ignore */
  }
}

export const flushChatQueueForEvent = flushChatQueue;

type SessionDefaultsSnapshot = {
  defaultAgentId?: string;
};

function resolveAgentIdForSession(host: ChatHost): string | null {
  const parsed = parseAgentSessionKey(host.sessionKey);
  if (parsed?.agentId) return parsed.agentId;
  const snapshot = host.hello?.snapshot as { sessionDefaults?: SessionDefaultsSnapshot } | undefined;
  const fallback = snapshot?.sessionDefaults?.defaultAgentId?.trim();
  return fallback || "main";
}

function buildAvatarMetaUrl(basePath: string, agentId: string): string {
  const base = normalizeBasePath(basePath);
  const encoded = encodeURIComponent(agentId);
  return base ? `${base}/avatar/${encoded}?meta=1` : `/avatar/${encoded}?meta=1`;
}

export async function refreshChatAvatar(host: ChatHost) {
  if (!host.connected) {
    host.chatAvatarUrl = null;
    return;
  }
  const agentId = resolveAgentIdForSession(host);
  if (!agentId) {
    host.chatAvatarUrl = null;
    return;
  }
  host.chatAvatarUrl = null;
  const url = buildAvatarMetaUrl(host.basePath, agentId);
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      host.chatAvatarUrl = null;
      return;
    }
    const data = (await res.json()) as { avatarUrl?: unknown };
    const avatarUrl = typeof data.avatarUrl === "string" ? data.avatarUrl.trim() : "";
    host.chatAvatarUrl = avatarUrl || null;
  } catch {
    host.chatAvatarUrl = null;
  }
}
