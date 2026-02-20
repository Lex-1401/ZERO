import { html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { repeat } from "lit/directives/repeat.js";
import { toSanitizedMarkdownHtml } from "../markdown";
import type { DocsState, DocEntry } from "../controllers/docs";
import { icons } from "../icons";

export function renderDocs(props: {
    state: DocsState;
    onSelect: (id: string) => void;
    onRefresh: () => void;
}) {
    const { state } = props;

    return html`
    <div class="docs-view" style="display: flex; height: 100%; background: var(--bg-app); overflow: hidden;">
      <!-- Sidebar de Documentos -->
      <aside class="docs-sidebar" style="width: 280px; border-right: 1px solid var(--border-subtle); display: flex; flex-direction: column; background: var(--bg-surface);">
        <header style="padding: 24px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-main);">Documentos</h2>
          <button class="btn btn--sm btn--icon" @click=${props.onRefresh} ?disabled=${state.docsLoading}>
            ${icons.loader}
          </button>
        </header>
        
        <nav style="flex: 1; overflow-y: auto; padding: 12px;">
          ${state.docsList.length > 0 ? html`
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${repeat(state.docsList, (doc) => doc.id, (doc) => html`
                <li 
                  style="margin-bottom: 4px; padding: 10px 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s; 
                         background: ${state.docsSelectedId === doc.id ? "rgba(var(--accent-blue-rgb), 0.1)" : "transparent"};
                         color: ${state.docsSelectedId === doc.id ? "var(--accent-blue)" : "var(--text-dim)"};"
                  @click=${() => props.onSelect(doc.id)}
                  class="docs-item ${state.docsSelectedId === doc.id ? "active" : ""}"
                >
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="opacity: 0.7;">${icons.fileText}</span>
                    <span style="font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${doc.name}
                    </span>
                  </div>
                </li>
              `)}
            </ul>
          ` : html`
            <div style="padding: 40px 20px; text-align: center; color: var(--text-dim); font-size: 13px;">
              ${state.docsLoading ? "Carregando documentos..." : "Nenhum documento encontrado."}
            </div>
          `}
        </nav>
      </aside>

      <!-- Área de Conteúdo -->
      <main class="docs-content" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-app);">
        ${state.docsSelectedId ? html`
          <article style="flex: 1; overflow-y: auto; padding: 48px; max-width: 900px; margin: 0 auto; width: 100%;">
            ${state.docsLoading && !state.docsContent ? html`
              <div style="display: flex; align-items: center; justify-content: center; height: 100%; flex-direction: column; gap: 16px; color: var(--text-dim);">
                <div class="spinner"></div>
                <span>Carregando ${state.docsSelectedId}...</span>
              </div>
            ` : html`
              <div class="chat-text markdown-body" style="color: var(--text-main); line-height: 1.6;">
                ${unsafeHTML(toSanitizedMarkdownHtml(state.docsContent || ""))}
              </div>
            `}
          </article>
        ` : html`
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 20px; color: var(--text-dim); opacity: 0.5;">
            <div style="font-size: 64px;">${icons.book}</div>
            <p>Selecione um documento para ler</p>
          </div>
        `}
      </main>
    </div>
  `;
}
