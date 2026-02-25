import { html, type TemplateResult, nothing } from "lit";
import { t, isAiTranslated, currentLang } from "./i18n";
import { renderI18nBadge } from "./components/i18n-badge";
import { LocalizationAgent } from "./agents/localization-agent";
import type { AppViewState } from "./app-view-state";

/**
 * renderT
 * Wrapper para a função 't' que retorna um TemplateResult com o Badge ✨
 * se a tradução for via IA. Também dispara a tradução On-Demand se necessário.
 */
export function renderT(state: AppViewState, key: string, params?: Record<string, string | number>): TemplateResult {
    const text = t(key, params);
    const isAi = isAiTranslated(key, currentLang);

    // Se a tradução for igual à chave (não encontrada) e não estivermos em pt-BR, dispara o agente
    if (text === key && currentLang !== "pt-BR") {
        LocalizationAgent.getInstance().translateBatch(state, [key], currentLang);
        return html`<span class="i18n-loading-shimmer">${text}</span>`;
    }

    return html`${text}${renderI18nBadge(state, key, isAi)}`;
}

// Estilo para o Shimmer de tradução pendente
export const i18nStyles = html`
<style>
    @keyframes i18n-shimmer {
        0% { opacity: 0.5; }
        50% { opacity: 1; }
        100% { opacity: 0.5; }
    }
    .i18n-loading-shimmer {
        animation: i18n-shimmer 1.5s infinite;
        font-style: italic;
        opacity: 0.7;
    }
</style>
`;
