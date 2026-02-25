import { html, type TemplateResult, nothing } from "lit";
import { LocalizationAgent } from "../agents/localization-agent";
import { currentLang } from "../i18n";
import type { AppViewState } from "../app-view-state";

/**
 * Componente I18nBadge
 * Exibe um indicador visual (✨) para traduções geradas por IA.
 * Oferece interface de feedback para validar a tradução.
 */
export function renderI18nBadge(state: AppViewState, key: string, isAiGenerated: boolean): TemplateResult | typeof nothing {
  if (!isAiGenerated) return nothing;

  // Ícone de Sparkle (Brilho) minimalista em SVG
  const sparkleIcon = html`
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-accent-blue); filter: drop-shadow(0 0 2px rgba(var(--accent-blue-rgb), 0.3));">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  `;

  return html`
    <span class="i18n-badge-container" title="Tradução assistida por IA (Agente)">
      <span class="i18n-icon">${sparkleIcon}</span>
      <div class="i18n-actions">
        <button class="i18n-btn" @click=${(e: Event) => handleI18nFeedback(e, state, key, true)} title="Tradução Correta">✨</button>
        <button class="i18n-btn" @click=${(e: Event) => handleI18nFeedback(e, state, key, false)} title="Sugerir Correção">✍️</button>
      </div>
      <style>
        .i18n-badge-container {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-left: 4px;
          position: relative;
          cursor: help;
        }
        .i18n-icon {
          font-size: 10px;
          opacity: 0.6;
          transition: opacity 0.2s;
        }
        .i18n-badge-container:hover .i18n-icon {
          opacity: 1;
        }
        .i18n-actions {
          display: none;
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-surface-raised);
          backdrop-filter: var(--glass-blur);
          border: 1px solid var(--border-main);
          border-radius: 8px;
          padding: 4px;
          gap: 4px;
          z-index: 100;
          box-shadow: var(--shadow-floating);
        }
        .i18n-badge-container:hover .i18n-actions {
          display: flex;
        }
        .i18n-btn {
          background: transparent;
          border: none;
          padding: 2px 4px;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.2s;
          font-size: 12px;
        }
        .i18n-btn:hover {
          background: rgba(255,255,255,0.1);
        }
      </style>
    </span>
  `;
}

async function handleI18nFeedback(e: Event, state: AppViewState, key: string, positive: boolean) {
  e.stopPropagation();
  await LocalizationAgent.getInstance().validateTranslation(state, key, currentLang, positive);
}
