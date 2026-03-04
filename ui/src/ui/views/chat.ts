import { html, nothing } from "lit";
import { guard } from "lit/directives/guard.js";
import { repeat } from "lit/directives/repeat.js";
import {
  renderMessageGroup,
  renderReadingIndicatorGroup,
  renderStreamingGroup,
} from "../chat/grouped-render.js";
import { handleCodeCopyClick } from "../chat/code-copy.js";
import { renderMarkdownSidebar } from "./markdown-sidebar.js";
import "../components/resizable-divider.js";
import "../components/model-selector.js";

import { renderWelcomeStack } from "./chat/welcome.js";
import { renderChatComposer } from "./chat/composer.js";
import { renderCompactionIndicator, renderChatStatusCallouts } from "./chat/indicators.js";
import { buildChatItems } from "./chat/items.js";

export type ChatProps = any;

export function renderChat(props: ChatProps) {
  const sidebarOpen = Boolean(props.sidebarOpen && props.onCloseSidebar);
  const items = buildChatItems(props);
  const showWelcome =
    !props.loading &&
    (items.length === 0 || (items.length === 1 && items[0].key === "chat:history:notice"));
  const assistantIdentity = {
    name: props.assistantName,
    avatar: props.assistantAvatar ?? props.assistantAvatarUrl ?? null,
  };

  return html`
    <section class="card chat" style="border: none; border-radius: 0; background: var(--bg-main); position: relative;">
      ${renderChatStatusCallouts(props)}
      ${renderCompactionIndicator(props.compactionStatus)}

      <div class="chat-split-container ${sidebarOpen ? "chat-split-container--open" : ""}" style="height: 100%; display: flex;">
        <div class="chat-main" style="flex: ${sidebarOpen ? `0 0 ${props.splitRatio ?? 0.6 * 100}%` : "1 1 100%"}; display: flex; flex-direction: column; position: relative;">
          <div class="chat-thread" role="log" aria-live="polite" @scroll=${props.onChatScroll} @click=${handleCodeCopyClick} style="background: var(--bg-main); padding: 0 0 180px 0;">
            ${showWelcome ? renderWelcomeStack({ zenMode: props.zenMode, app: props.app, onSend: props.onSend }) : nothing}
            ${guard(
              [props.messages, props.toolMessages, props.stream, props.showThinking, props.loading],
              () =>
                repeat(
                  items,
                  (item) => item.key,
                  (item) => {
                    if (item.kind === "reading-indicator")
                      return renderReadingIndicatorGroup(assistantIdentity);
                    if (item.kind === "stream")
                      return renderStreamingGroup(
                        item.text,
                        item.startedAt,
                        props.onOpenSidebar,
                        assistantIdentity,
                      );
                    if (item.kind === "group")
                      return renderMessageGroup(item, {
                        onOpenSidebar: props.onOpenSidebar,
                        showReasoning:
                          props.showThinking &&
                          props.sessions?.sessions?.find((r: any) => r.key === props.sessionKey)
                            ?.reasoningLevel !== "off",
                        assistantName: props.assistantName,
                        assistantAvatar: assistantIdentity.avatar,
                      });
                    return nothing;
                  },
                ),
            )}
          </div>
          ${renderChatComposer(props)}
        </div>

        ${
          sidebarOpen
            ? html`
          <resizable-divider .splitRatio=${props.splitRatio ?? 0.6} @resize=${(e: any) => props.onSplitRatioChange?.(e.detail.splitRatio)}></resizable-divider>
          <div class="chat-sidebar" style="background: var(--bg-surface); border-left: 1px solid var(--border-subtle);">
            ${renderMarkdownSidebar({
              content: props.sidebarContent ?? null,
              error: props.sidebarError ?? null,
              onClose: props.onCloseSidebar!,
              onViewRawText: () => {
                if (props.sidebarContent && props.onOpenSidebar)
                  props.onOpenSidebar("```\\n" + props.sidebarContent + "\\n```");
              },
            })}
          </div>`
            : nothing
        }
      </div>
    </section>
      `;
}
