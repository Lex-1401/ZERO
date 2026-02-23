import { html } from "lit";
import { icons } from "../icons";
import { t } from "../i18n";

export function renderNotFound(onNavigate: (route: string) => void) {
    return html`
    <div class="animate-fade-in" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-main);">
        <div style="font-size: 120px; font-weight: 900; line-height: 1; letter-spacing: -0.05em; background: linear-gradient(to bottom, var(--text-main), transparent); -webkit-background-clip: text; -webkit-text-fill-color: transparent; opacity: 0.2;">
            404
        </div>
        
        <div style="margin-top: -40px; margin-bottom: 32px; position: relative;">
            <div style="font-size: 24px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent-red);filter: drop-shadow(0 0 10px rgba(255, 59, 48, 0.4));">
                ${t("notfound.title" as any)}
            </div>
            <div style="font-size: 12px; color: var(--text-dim); margin-top: 8px; font-family: var(--font-mono);">
                ${t("notfound.desc" as any)}
            </div>
        </div>

        <button class="btn primary" style="height: 48px; padding: 0 32px; font-size: 14px;" @click=${() => onNavigate("overview")}>
            ${icons.arrowLeft} ${t("notfound.back" as any)}
        </button>

        <div style="margin-top: 64px; font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); opacity: 0.5;">
            ERRO_PROTOCOLO_NAV_0x04
        </div>
    </div>
    `;
}
