import type { GatewayBrowserClient } from "../gateway";
import { extractText } from "../chat/message-extract";
import { generateUUID } from "../uuid";

export type ChatState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  sessionKey: string;
  chatLoading: boolean;
  chatMessages: unknown[];
  chatThinkingLevel: string | null;
  chatSending: boolean;
  chatMessage: string;
  chatRunId: string | null;
  chatStream: string | null;
  chatStreamStartedAt: number | null;
  lastError: string | null;
};

export type ChatEventPayload = {
  runId: string;
  sessionKey: string;
  state: "delta" | "final" | "aborted" | "error";
  message?: unknown;
  errorMessage?: string;
};

export async function loadChatHistory(state: ChatState) {
  if (!state.client || !state.connected) {
    state.chatLoading = false;
    return;
  }

  // Check Predictive UX Cache
  const store = (state as any).chatStore;
  if (store && store.historyCache.has(state.sessionKey)) {
    const cached = store.historyCache.get(state.sessionKey);
    state.chatMessages = cached.messages;
    state.chatThinkingLevel = cached.thinkingLevel;
    // We still load in background to get the full history/latest updates
  }

  state.chatLoading = true;
  state.lastError = null;
  try {
    const res = (await state.client.request("chat.history", {
      sessionKey: state.sessionKey,
      limit: 200,
    })) as { messages?: unknown[]; thinkingLevel?: string | null };
    const messages = Array.isArray(res.messages) ? res.messages : [];
    const thinkingLevel = res.thinkingLevel ?? null;
    state.chatMessages = messages;
    state.chatThinkingLevel = thinkingLevel;

    // Update Cache
    if (store) {
      store.historyCache.set(state.sessionKey, { messages, thinkingLevel });
    }
  } catch (err) {
    state.lastError = String(err);
  } finally {
    state.chatLoading = false;
  }
}

export function resetChatState(state: ChatState) {
  state.chatLoading = false;
  state.chatSending = false;
  state.chatRunId = null;
  state.chatStream = null;
  state.chatStreamStartedAt = null;
}

export async function sendChatMessage(
  state: ChatState,
  message: string,
  attachments?: File[]
): Promise<boolean> {
  if (!state.client || !state.connected) return false;
  const msg = message.trim();
  const hasAttachments = attachments && attachments.length > 0;
  if (!msg && !hasAttachments) return false;

  const now = Date.now();
  const content: unknown[] = [];
  if (msg) content.push({ type: "text", text: msg });

  const attachmentPayloads: Array<{
    type?: string;
    mimeType: string;
    fileName: string;
    content: string;
  }> = [];

  if (hasAttachments) {
    for (const file of attachments!) {
      content.push({
        type: "file",
        name: file.name,
        size: file.size,
        mimeType: file.type,
      });
      try {
        const buffer = await file.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        attachmentPayloads.push({
          type: "file",
          mimeType: file.type || "application/octet-stream",
          fileName: file.name,
          content: base64,
        });
      } catch (err) {
        console.error("Failed to read attachment", file.name, err);
        state.lastError = `Failed to read ${file.name}`;
        return false;
      }
    }
  }

  state.chatMessages = [
    ...state.chatMessages,
    {
      role: "user",
      content,
      timestamp: now,
    },
  ];

  state.chatSending = true;
  state.lastError = null;
  const runId = generateUUID();
  state.chatRunId = runId;
  state.chatStream = "";
  state.chatStreamStartedAt = now;
  try {
    await state.client.request("chat.send", {
      sessionKey: state.sessionKey,
      message: msg || " ", // Ensure non-empty string for backend validation if strictly required, though protocol says message: string
      deliver: false,
      idempotencyKey: runId,
      attachments: attachmentPayloads.length > 0 ? attachmentPayloads : undefined,
    });
    return true;
  } catch (err) {
    const error = String(err);
    state.chatRunId = null;
    state.chatStream = null;
    state.chatStreamStartedAt = null;
    state.lastError = error;
    state.chatMessages = [
      ...state.chatMessages,
      {
        role: "assistant",
        content: [{ type: "text", text: "Error: " + error }],
        timestamp: Date.now(),
      },
    ];
    return false;
  } finally {
    state.chatSending = false;
  }
}

export async function abortChatRun(state: ChatState): Promise<boolean> {
  if (!state.client || !state.connected) return false;
  const runId = state.chatRunId;
  try {
    await state.client.request(
      "chat.abort",
      runId
        ? { sessionKey: state.sessionKey, runId }
        : { sessionKey: state.sessionKey },
    );
    return true;
  } catch (err) {
    state.lastError = String(err);
    return false;
  }
}

export function handleChatEvent(
  state: ChatState,
  payload?: ChatEventPayload,
) {
  if (!payload) return null;
  if (payload.sessionKey !== state.sessionKey) return null;
  if (payload.runId && state.chatRunId && payload.runId !== state.chatRunId)
    return null;

  if (payload.state === "delta") {
    const next = extractText(payload.message);
    if (typeof next === "string") {
      const current = state.chatStream ?? "";
      if (!current || next.length >= current.length) {
        state.chatStream = next;
      }
    }
    // Crabwalk logic: while in delta, the agent is actively 'thinking'/streaming
    if (!state.chatStreamStartedAt) {
      state.chatStreamStartedAt = Date.now();
    }
  } else if (payload.state === "final") {
    if (payload.message) {
      state.chatMessages = [...state.chatMessages, payload.message];
    }
    state.chatStream = null;
    state.chatRunId = null;
    state.chatStreamStartedAt = null;
  } else if (payload.state === "aborted") {
    state.chatStream = null;
    state.chatRunId = null;
    state.chatStreamStartedAt = null;
  } else if (payload.state === "error") {
    state.chatStream = null;
    state.chatRunId = null;
    state.chatStreamStartedAt = null;
    state.lastError = payload.errorMessage ?? "chat error";
  }
  return payload.state;
}
