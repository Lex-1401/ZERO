import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { icons } from "../icons";
import { t } from "../i18n";

@customElement("zero-zen-dashboard")
export class ZeroZenDashboard extends LitElement {
  @property({ type: Object }) app: any;

  // We don't use Shadow DOM here to inherit the global styles (card--welcome, btn, etc.) 
  // and maintain absolute consistency with the main chat view.
  createRenderRoot() {
    return this;
  }

  render() {
    const zenItems = [
      { label: t("zen.config_persona" as any), desc: t("zen.config_persona_desc" as any), tab: "config", icon: icons.user },
      { label: t("tab.skills" as any), desc: t("zen.skills_desc" as any), tab: "skills", icon: icons.zap },
      { label: t("zen.new_chat" as any), desc: t("zen.new_chat_desc" as any), action: () => this.app.handleSendChat("/new"), icon: icons.messageSquare },
      { label: t("zen.settings" as any), desc: t("zen.settings_desc" as any), action: () => this.showSettings = true, icon: icons.settings },
    ];

    return html`
    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 1; min-height: 400px; padding: 40px; padding-bottom: 120px; width: 100%;">
      <div class="card--welcome" style="padding: 40px; text-align: center; max-width: 420px; border-radius: var(--radius-xl); width: 100%; box-sizing: border-box; position: relative;">
          <div style="width: 64px; height: 64px; border-radius: var(--radius-xl); background: var(--bg-input); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: var(--text-main); border: 1px solid var(--border-main);">
              ${icons.brain}
          </div>
          <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; color: var(--text-main); text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${t("zen.title" as any)}</h2>
          <p style="font-size: 14px; color: var(--text-muted); line-height: 1.5; margin-bottom: 32px; opacity: 0.8;">
              ${t("zen.description" as any)}
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${zenItems.map(item => html`
              <button 
                class="btn btn--chip hover-lift active-push" 
                style="justify-content: flex-start; padding: 12px 16px; height: auto; border-radius: var(--radius-lg); width: 100%;"
                @click=${() => item.tab ? this.app.setTab(item.tab) : item.action?.()}
              >
                <div style="display: flex; align-items: center; gap: 12px; text-align: left; width: 100%;">
                    <div style="color: var(--brand-primary); opacity: 0.9;">${item.icon}</div>
                    <div>
                        <div style="font-weight: 600; font-size: 13px; color: var(--text-main); margin-bottom: 1px;">${item.label}</div>
                        <div style="font-size: 11px; color: var(--text-muted); opacity: 0.7;">${item.desc}</div>
                    </div>
                </div>
              </button>
            `)}
          </div>
      </div>

      ${this.renderSettingsModal()}
    </div>
    `;
  }

  @state() showSettings = false;
  @state() apiKeyInput = "";

  renderSettingsModal() {
    if (!this.showSettings) return nothing;

    return html`
            <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;" @click=${(e: Event) => {
        if (e.target === e.currentTarget) this.showSettings = false;
      }}>
                <div class="card" style="width: 100%; max-width: 400px; padding: 24px; border-radius: var(--radius-xl); box-shadow: var(--shadow-deep); background: var(--bg-surface); border: 1px solid var(--border-subtle);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">${t("zen.settings_title" as any)}</h3>
                        <button class="btn btn--icon" @click=${() => this.showSettings = false}>${icons.x}</button>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 20px;">
                        <!-- Language -->
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px;">${t("zen.settings.lang_label" as any)}</label>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn" style="flex: 1;" @click=${async () => {
        const { setLanguage } = await import("../i18n");
        setLanguage("pt-BR");
      }}>🇧🇷 Português</button>
                                <button class="btn" style="flex: 1;" @click=${async () => {
        const { setLanguage } = await import("../i18n");
        setLanguage("en-US");
      }}>🇺🇸 English</button>
                            </div>
                        </div>

                        <!-- Theme -->
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px;">${t("zen.settings.theme_label" as any)}</label>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn ${this.app.settings.theme === 'light' ? 'primary' : ''}" style="flex: 1;" @click=${() => this.app.setTheme("light")}>${icons.sun}</button>
                                <button class="btn ${this.app.settings.theme === 'dark' ? 'primary' : ''}" style="flex: 1;" @click=${() => this.app.setTheme("dark")}>${icons.moon}</button>
                                <button class="btn ${this.app.settings.theme === 'system' ? 'primary' : ''}" style="flex: 1;" @click=${() => this.app.setTheme("system")}>${icons.monitor}</button>
                            </div>
                        </div>

                        <!-- API Key -->
                        <div>
                             <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px;">OpenAI API Key</label>
                             <div style="display: flex; gap: 8px;">
                                <input 
                                    type="password" 
                                    class="input" 
                                    placeholder="sk-..." 
                                    style="flex: 1; padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); background: var(--bg-input); color: var(--text-main);"
                                    .value=${this.apiKeyInput}
                                    @input=${(e: Event) => this.apiKeyInput = (e.target as HTMLInputElement).value}
                                />
                                <button class="btn primary" ?disabled=${!this.apiKeyInput} @click=${async () => {
        // Optimistic update
        await this.app.handleConfigFormUpdate(["models", "providers", "openai", "apiKey"], this.apiKeyInput);
        await this.app.handleConfigSave();
        this.apiKeyInput = "";
        this.showSettings = false;
        alert(t("zen.settings.success" as any));
      }}>${t("zen.settings.save" as any)}</button>
                             </div>
                             <p style="font-size: 11px; color: var(--text-muted); margin-top: 6px; line-height: 1.4;">
                                ${html([t("zen.settings.advanced" as any, { tab: `<strong>${t("nav.config" as any)}</strong>` })])}
                             </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }
}
