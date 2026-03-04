import { html } from "lit";
import { t } from "../../i18n.js";
import { icons } from "../../icons.js";

export function renderWelcomeStack(params: {
  zenMode?: boolean;
  app?: any;
  onSend: (prompt: string) => void;
}) {
  const { zenMode, app, onSend } = params;
  if (zenMode) {
    return html`<zero-zen-dashboard .app=${app || (window as any).app}></zero-zen-dashboard>`;
  }

  const starterChips = [
    {
      label: t("chat.starter.status.label" as any),
      prompt: t("chat.starter.status.prompt" as any),
    },
    {
      label: t("chat.starter.agents.label" as any),
      prompt: t("chat.starter.agents.prompt" as any),
    },
    { label: t("chat.starter.code.label" as any), prompt: t("chat.starter.code.prompt" as any) },
  ];

  return html`
    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 1; min-height: 400px; padding: 40px; padding-bottom: 180px;">
      <div class="card--welcome" style="padding: 40px; text-align: center; max-width: 420px; border-radius: var(--radius-xl);">
          <div style="width: 64px; height: 64px; border-radius: var(--radius-xl); background: var(--bg-input); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: var(--text-main); border: 1px solid var(--border-main);">
              ${icons.brain}
          </div>
          <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; color: var(--text-main); text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${t("chat.welcome.title" as any)}</h2>
          <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5; margin-bottom: 32px; opacity: 0.8;">
              ${t("chat.welcome.desc" as any)}
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${starterChips.map(
              (chip) => html`
              <button class="btn btn--chip hover-lift active-push" style="justify-content: flex-start; padding: 12px 16px; height: auto; border-radius: var(--radius-lg);" @click=${() => onSend(chip.prompt)}>
                <div style="text-align: left;">
                    <div style="font-weight: 600; font-size: 13px; color: var(--text-main); margin-bottom: 2px;">${chip.label}</div>
                </div>
              </button>
            `,
            )}
          </div>
      </div>
    </div>
  `;
}
