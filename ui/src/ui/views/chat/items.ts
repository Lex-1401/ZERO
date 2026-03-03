import { t } from "../../i18n.js";
import type { ChatItem, MessageGroup } from "../../types/chat-types.js";
import { normalizeMessage, normalizeRoleForGrouping } from "../../chat/message-normalizer.js";

const CHAT_HISTORY_RENDER_LIMIT = 200;

export function buildChatItems(props: any): Array<ChatItem | MessageGroup> {
  const items: ChatItem[] = [];
  const history = Array.isArray(props.messages) ? props.messages : [];
  const tools = Array.isArray(props.toolMessages) ? props.toolMessages : [];
  const historyStart = Math.max(0, history.length - CHAT_HISTORY_RENDER_LIMIT);

  if (historyStart > 0) {
    items.push({
      kind: "message",
      key: "chat:history:notice",
      message: {
        role: "system",
        content: t("chat.history.limit" as any)
          .replace("{limit}", String(CHAT_HISTORY_RENDER_LIMIT))
          .replace("{hidden}", String(historyStart)),
        timestamp: Date.now(),
      },
    });
  }

  for (let i = historyStart; i < history.length; i++) {
    const msg = history[i];
    if (!props.showThinking && normalizeMessage(msg).role.toLowerCase() === "toolresult") continue;
    items.push({ kind: "message", key: messageKey(msg, i), message: msg });
  }

  if (props.showThinking) {
    for (let i = 0; i < tools.length; i++) {
      items.push({
        kind: "message",
        key: messageKey(tools[i], i + history.length),
        message: tools[i],
      });
    }
  }

  if (props.stream !== null) {
    const key = `stream:${props.sessionKey}:${props.streamStartedAt ?? "live"}`;
    if (props.stream.trim().length > 0)
      items.push({
        kind: "stream",
        key,
        text: props.stream,
        startedAt: props.streamStartedAt ?? Date.now(),
      });
    else items.push({ kind: "reading-indicator", key });
  } else if (props.sending)
    items.push({ kind: "reading-indicator", key: `pending:${props.sessionKey}:waiting` });

  return groupMessages(items);
}

function groupMessages(items: ChatItem[]): Array<ChatItem | MessageGroup> {
  const result: Array<ChatItem | MessageGroup> = [];
  let currentGroup: MessageGroup | null = null;
  for (const item of items) {
    if (item.kind !== "message") {
      if (currentGroup) result.push(currentGroup);
      currentGroup = null;
      result.push(item);
      continue;
    }
    const normalized = normalizeMessage(item.message);
    const role = normalizeRoleForGrouping(normalized.role);
    const timestamp = normalized.timestamp || Date.now();
    if (!currentGroup || currentGroup.role !== role) {
      if (currentGroup) result.push(currentGroup);
      currentGroup = {
        kind: "group",
        key: `group:${role}:${item.key}`,
        role,
        messages: [{ message: item.message, key: item.key }],
        timestamp,
        isStreaming: false,
      };
    } else currentGroup.messages.push({ message: item.message, key: item.key });
  }
  if (currentGroup) result.push(currentGroup);
  return result;
}

function messageKey(message: unknown, index: number): string {
  const m = message as Record<string, any>;
  if (m.toolCallId) return `tool:${m.toolCallId}`;
  if (m.id || m.messageId) return `msg:${m.id || m.messageId}`;
  return `msg:${m.role || "unknown"}:${m.timestamp || index}:${index}`;
}
