import { html, nothing } from "lit";
import { guard } from "lit/directives/guard.js";
import { repeat } from "lit/directives/repeat.js";
import type { SessionsListResult } from "../types";
import type { ChatQueueItem } from "../ui-types";
import type { ChatItem, MessageGroup } from "../types/chat-types";
import { icons } from "../icons";
import {
  normalizeMessage,
  normalizeRoleForGrouping,
} from "../chat/message-normalizer";
import {
  renderMessageGroup,
  renderReadingIndicatorGroup,
  renderStreamingGroup,
} from "../chat/grouped-render";
import { handleCodeCopyClick } from "../chat/code-copy";
import { renderMarkdownSidebar } from "./markdown-sidebar";
import "../components/resizable-divider";

export type CompactionIndicatorStatus = {
  active: boolean;
  startedAt: number | null;
  completedAt: number | null;
};

export type ChatProps = {
  sessionKey: string;
  onSessionKeyChange: (next: string) => void;
  thinkingLevel: string | null;
  showThinking: boolean;
  loading: boolean;
  sending: boolean;
  canAbort?: boolean;
  compactionStatus?: CompactionIndicatorStatus | null;
  messages: unknown[];
  toolMessages: unknown[];
  stream: string | null;
  streamStartedAt: number | null;
  assistantAvatarUrl?: string | null;
  draft: string;
  queue: ChatQueueItem[];
  connected: boolean;
  canSend: boolean;
  disabledReason: string | null;
  error: string | null;
  sessions: SessionsListResult | null;
  // Focus mode
  focusMode: boolean;
  // Sidebar state
  sidebarOpen?: boolean;
  sidebarContent?: string | null;
  sidebarError?: string | null;
  splitRatio?: number;
  assistantName: string;
  assistantAvatar: string | null;
  // Event handlers
  onRefresh: () => void;
  onToggleFocusMode: () => void;
  onDraftChange: (next: string) => void;
  onSend: (message?: string) => void;
  onAbort?: () => void;
  onQueueRemove: (id: string) => void;
  onNewSession: () => void;
  onOpenSidebar?: (content: string) => void;
  onCloseSidebar?: () => void;
  onSplitRatioChange?: (ratio: number) => void;
  onChatScroll?: (event: Event) => void;
};

const COMPACTION_TOAST_DURATION_MS = 5000;

function renderCompactionIndicator(status: CompactionIndicatorStatus | null | undefined) {
  if (!status) return nothing;

  // Show "compacting..." while active
  if (status.active) {
    return html`
      <div class="callout info compaction-indicator compaction-indicator--active" style="position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 100; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
        ${icons.loader} Compactando contexto...
      </div>
    `;
  }

  // Show "compaction complete" briefly after completion
  if (status.completedAt) {
    const elapsed = Date.now() - status.completedAt;
    if (elapsed < COMPACTION_TOAST_DURATION_MS) {
      return html`
        <div class="callout success compaction-indicator compaction-indicator--complete" style="position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 100; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
          ${icons.check} Contexto compactado
        </div>
      `;
    }
  }

  return nothing;
}

export function renderChat(props: ChatProps) {
  const canCompose = props.connected;
  const isBusy = props.sending || props.stream !== null;
  const canAbort = Boolean(props.canAbort && props.onAbort);
  const activeSession = props.sessions?.sessions?.find(
    (row) => row.key === props.sessionKey,
  );
  const reasoningLevel = activeSession?.reasoningLevel ?? "off";
  const showReasoning = props.showThinking && reasoningLevel !== "off";
  const assistantIdentity = {
    name: props.assistantName,
    avatar: props.assistantAvatar ?? props.assistantAvatarUrl ?? null,
  };

  const composePlaceholder = props.connected
    ? "Envie uma mensagem..."
    : "Conecte-se ao gateway para começar.";

  const splitRatio = props.splitRatio ?? 0.6;
  const sidebarOpen = Boolean(props.sidebarOpen && props.onCloseSidebar);
  const items = buildChatItems(props);
  const showWelcome = !props.loading && (items.length === 0 || (items.length === 1 && items[0].key === "chat:history:notice"));

  const starterChips = [
    { label: "Verificar status", prompt: "Verifique o status do sistema." },
    { label: "Listar agentes", prompt: "Quais agentes estão disponíveis?" },
    { label: "Escrever código", prompt: "Vamos escrever uma função em TypeScript." },
  ];

  const renderWelcomeStack = () => html`
    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 1; min-height: 400px; padding: 40px; padding-bottom: 180px;">
      <div class="card--welcome" style="padding: 40px; text-align: center; max-width: 420px; border-radius: 24px;">
          <div style="width: 64px; height: 64px; border-radius: 16px; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: var(--text-main); border: 1px solid rgba(255,255,255,0.1);">
              ${icons.brain}
          </div>
          <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; color: var(--text-main); text-shadow: 0 2px 4px rgba(0,0,0,0.5);">Consciência Ativa</h2>
          <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5; margin-bottom: 32px; opacity: 0.8;">
              O sistema está online e pronto para processar comandos complexos. Selecione uma tarefa inicial ou digite sua instrução.
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${starterChips.map(chip => html`
              <button 
                class="btn btn--chip" 
                style="justify-content: flex-start; padding: 12px 16px; height: auto; border-radius: 12px;"
                @click=${() => props.onSend(chip.prompt)}
              >
                <div style="text-align: left;">
                    <div style="font-weight: 600; font-size: 13px; color: var(--text-main); margin-bottom: 2px;">${chip.label}</div>
                </div>
              </button>
            `)}
          </div>
      </div>
    </div>
  `;

  const thread = html`
    <div
      class="chat-thread"
      role="log"
      aria-live="polite"
      @scroll=${props.onChatScroll}
      @click=${handleCodeCopyClick}
      style="background: var(--bg-main); padding: 0 0 180px 0;"
    >
      ${props.loading ? html`
        <div class="loading-overlay" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: ${items.length > 0 ? '80px' : '100%'}; color: var(--text-main); gap: 12px; transition: opacity 0.3s ease; padding: 40px;">
            <div class="animate-spin" style="color: var(--accent-blue); transform: scale(1.2);">${icons.loader}</div>
            <span style="font-size: 13px; font-weight: 600; letter-spacing: 0.05em; opacity: 1; text-shadow: 0 0 10px rgba(0, 122, 255, 0.3);">CARREGANDO HISTÓRICO NEURAL...</span>
        </div>
      ` : nothing}
      ${showWelcome ? renderWelcomeStack() : nothing}
      ${guard([props.messages, props.toolMessages, props.stream, props.showThinking, props.loading], () => repeat(items, (item) => item.key, (item) => {
    if (item.kind === "reading-indicator") {
      return renderReadingIndicatorGroup(assistantIdentity);
    }

    if (item.kind === "stream") {
      return renderStreamingGroup(
        item.text,
        item.startedAt,
        props.onOpenSidebar,
        assistantIdentity,
      );
    }

    if (item.kind === "group") {
      return renderMessageGroup(item, {
        onOpenSidebar: props.onOpenSidebar,
        showReasoning,
        assistantName: props.assistantName,
        assistantAvatar: assistantIdentity.avatar,
      });
    }

    return nothing;
  }))}
    </div>
  `;

  return html`
    <section class="card chat" style="border: none; border-radius: 0; background: var(--bg-main); position: relative;">
      ${props.disabledReason
      ? html`
        <div class="callout warning callout--active">
          <div style="color: var(--warning);">${icons.plug}</div>
          <div style="font-size: 13px;">
             ${props.disabledReason.includes("1006") || props.disabledReason.includes("disconnect")
          ? "Sinal do Gateway interrompido. Tentando restabelecer conexão neural..."
          : props.disabledReason}
          </div>
        </div>`
      : nothing}

      ${props.error
      ? html`<div class="callout danger callout--active">${icons.bug} ${props.error}</div>`
      : nothing}

      ${renderCompactionIndicator(props.compactionStatus)}

      <div
        class="chat-split-container ${sidebarOpen ? "chat-split-container--open" : ""}"
        style="height: 100%; display: flex;"
      >
        <div
          class="chat-main"
          style="flex: ${sidebarOpen ? `0 0 ${splitRatio * 100}%` : "1 1 100%"}; display: flex; flex-direction: column; position: relative;"
        >
          ${thread}
          
          <div class="chat-compose-wrapper" style="padding: 24px; position: absolute; bottom: 0; left: 0; right: 0; pointer-events: none; background: linear-gradient(to top, var(--bg-main) 80%, transparent);">
            <div class="chat-compose" style="pointer-events: auto; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 16px; box-shadow: var(--shadow-deep); padding: 8px; display: flex; flex-direction: column;">
                <div class="chat-compose__field">
                    <textarea
                        style="background: transparent; border: none; padding: 12px; font-size: 14px; line-height: 1.5; resize: none; width: 100%; outline: none; color: var(--text-main); font-family: var(--font-sans);"
                        rows="1"
                        .value=${props.draft}
                        ?disabled=${!props.connected}
                        @keydown=${(e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (canCompose) props.onSend();
      }
      // Auto-resize
      const target = e.target as HTMLTextAreaElement;
      target.style.height = "auto";
      target.style.height = Math.min(target.scrollHeight, 200) + "px";
    }}
                        @input=${(e: Event) => {
      props.onDraftChange((e.target as HTMLTextAreaElement).value);
      // Auto-resize
      const target = e.target as HTMLTextAreaElement;
      target.style.height = "auto";
      target.style.height = Math.min(target.scrollHeight, 200) + "px";
    }}
                        placeholder=${composePlaceholder}
                    ></textarea>
                </div>
                <div class="chat-compose__actions" style="display: flex; justify-content: space-between; padding: 0 8px 4px 8px;">
                     <button
                        class="btn btn--icon"
                        title="Nova Sessão"
                        ?disabled=${!props.connected || (!canAbort && props.sending)}
                        @click=${canAbort ? props.onAbort : props.onNewSession}
                        style="width: 32px; height: 32px; border-radius: 50%;"
                    >
                        ${canAbort ? icons.stop : icons.plus}
                    </button>
                    
                    <button
                        class="btn primary"
                        ?disabled=${!props.connected || !props.draft.trim()}
                        @click=${props.onSend}
                        style="border-radius: 20px; padding: 0 16px; height: 32px; font-size: 13px; font-weight: 600;"
                    >
                        ${isBusy ? "Enfileirar" : "Enviar"} ${icons.arrowUp}
                    </button>
                </div>
            </div>
            
             ${props.queue.length > 0 ? html`
                <div style="margin-top: 12px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px; pointer-events: auto; box-shadow: var(--shadow-vision);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <div style="font-size: 11px; font-weight: 700; color: var(--text-muted);">FILA DE AÇÃO (${props.queue.length})</div>
                      ${!isBusy ? html`<button class="btn primary btn--xs" style="height: 24px; padding: 0 8px; font-size: 10px;" @click=${() => props.onSend()}>Processar Fila</button>` : nothing}
                    </div>
                     ${props.queue.map(item => html`
                        <div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; background: rgba(255,255,255,0.03); margin-top: 4px; border: 1px solid rgba(255,255,255,0.02);">
                            <div style="flex: 1; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.8;">${item.text}</div>
                            <button class="btn btn--icon btn--xs" style="width: 20px; height: 20px; border: none; background: transparent;" @click=${() => props.onQueueRemove(item.id)} title="Cancelar">${icons.x}</button>
                        </div>
                     `)}
                </div>
             ` : nothing}
          </div>

        </div>

        ${sidebarOpen
      ? html`
              <resizable-divider
                .splitRatio=${splitRatio}
                @resize=${(e: CustomEvent) =>
          props.onSplitRatioChange?.(e.detail.splitRatio)}
              ></resizable-divider>
              <div class="chat-sidebar" style="background: var(--bg-surface); border-left: 1px solid var(--border-subtle);">
                ${renderMarkdownSidebar({
            content: props.sidebarContent ?? null,
            error: props.sidebarError ?? null,
            onClose: props.onCloseSidebar!,
            onViewRawText: () => {
              if (!props.sidebarContent || !props.onOpenSidebar) return;
              props.onOpenSidebar(`\`\`\`\n${props.sidebarContent}\n\`\`\``);
            },
          })}
              </div>
            `
      : nothing}
      </div>
    </section>
  `;
}

const CHAT_HISTORY_RENDER_LIMIT = 200;

function groupMessages(items: ChatItem[]): Array<ChatItem | MessageGroup> {
  const result: Array<ChatItem | MessageGroup> = [];
  let currentGroup: MessageGroup | null = null;

  for (const item of items) {
    if (item.kind !== "message") {
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
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
    } else {
      currentGroup.messages.push({ message: item.message, key: item.key });
    }
  }

  if (currentGroup) result.push(currentGroup);
  return result;
}

function buildChatItems(props: ChatProps): Array<ChatItem | MessageGroup> {
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
        content: `Exibindo as últimas ${CHAT_HISTORY_RENDER_LIMIT} mensagens (${historyStart} ocultas).`,
        timestamp: Date.now(),
      },
    });
  }
  for (let i = historyStart; i < history.length; i++) {
    const msg = history[i];
    const normalized = normalizeMessage(msg);

    if (!props.showThinking && normalized.role.toLowerCase() === "toolresult") {
      continue;
    }

    items.push({
      kind: "message",
      key: messageKey(msg, i),
      message: msg,
    });
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
    if (props.stream.trim().length > 0) {
      items.push({
        kind: "stream",
        key,
        text: props.stream,
        startedAt: props.streamStartedAt ?? Date.now(),
      });
    } else {
      items.push({ kind: "reading-indicator", key });
    }
  } else if (props.sending) {
    // Show reading indicator while waiting for stream start
    const key = `pending:${props.sessionKey}:waiting`;
    items.push({ kind: "reading-indicator", key });
  }

  return groupMessages(items);
}

function messageKey(message: unknown, index: number): string {
  const m = message as Record<string, unknown>;
  const toolCallId = typeof m.toolCallId === "string" ? m.toolCallId : "";
  if (toolCallId) return `tool:${toolCallId}`;
  const id = typeof m.id === "string" ? m.id : "";
  if (id) return `msg:${id}`;
  const messageId = typeof m.messageId === "string" ? m.messageId : "";
  if (messageId) return `msg:${messageId}`;
  const timestamp = typeof m.timestamp === "number" ? m.timestamp : null;
  const role = typeof m.role === "string" ? m.role : "unknown";
  if (timestamp != null) return `msg:${role}:${timestamp}:${index}`;
  return `msg:${role}:${index}`;
}
