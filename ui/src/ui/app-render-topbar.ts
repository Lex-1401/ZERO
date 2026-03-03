import { html, nothing } from "lit";
import { icons } from "./icons";
import { t } from "./i18n";
import { titleForTab } from "./navigation";
import type { AppViewState } from "./app-view-state";

export function renderTopbar(state: AppViewState) {
  const isZen = state.uiStore.zenMode;

  return html`
    <header class="topbar">
      <div class="topbar-nav">
        <button class="btn-mobile-menu" @click=${() => (state.uiStore.mobileNavOpen = !state.uiStore.mobileNavOpen)}>${icons.menu}</button>
        <button class="btn-nav-history" @click=${() => (state.uiStore.sidebarCollapsed = !state.uiStore.sidebarCollapsed)} title="Alternar Menu">
          ${icons.panelLeft}
        </button>
        ${
          !isZen
            ? html`
          <button class="btn-nav-history" @click=${() => window.history.back()}>${icons.chevronLeft}</button>
          <button class="btn-nav-history" @click=${() => window.history.forward()}>${icons.chevronRight}</button>
        `
            : nothing
        }
      </div>
      
      <div class="page-info" style="display: flex; align-items: center; gap: 8px; position: relative;">
        <h1 class="page-title">${titleForTab(state.uiStore.tab)}</h1>
        <div class="dropdown" style="display: inline-block;">
          <button class="btn-nav-history" style="padding: 4px; border-radius: 6px; background: rgba(255,255,255,0.03);" 
                  @click=${(e: Event) => {
                    e.stopPropagation();
                    state.uiStore.interfaceDropdownOpen = !state.uiStore.interfaceDropdownOpen;
                  }}>
            ${icons.chevronDown}
          </button>
          <div class="dropdown-menu" style="display: ${state.uiStore.interfaceDropdownOpen ? "block" : "none"}; position: absolute; top: calc(100% + 8px); left: 0; background: #111; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 8px; min-width: 180px; z-index: 1000; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.3); padding: 8px 12px; text-transform: uppercase; letter-spacing: 0.05em;">${t("app.select_interface" as any)}</div>
            <div class="dropdown-item" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 600; color: ${state.uiStore.tab === "chat" && !state.uiStore.zenMode ? "#fff" : "rgba(255,255,255,0.5)"};" 
                 @click=${() => {
                   state.uiStore.zenMode = false;
                   state.setTab("chat");
                   state.uiStore.interfaceDropdownOpen = false;
                 }}>
              <span style="width: 16px; height: 16px;">${icons.messageSquare}</span>
              <span>${t("app.full_chat" as any)}</span>
            </div>
            <div class="dropdown-item" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 600; color: ${state.uiStore.zenMode ? "#fff" : "rgba(255,255,255,0.5)"};" 
                 @click=${() => {
                   state.uiStore.zenMode = true;
                   state.uiStore.interfaceDropdownOpen = false;
                 }}>
              <span style="width: 16px; height: 16px;">${icons.maximize}</span>
              <span>${t("app.zen_mode" as any)}</span>
            </div>
            ${
              !isZen
                ? html`
              <div class="dropdown-item" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 600; color: ${state.uiStore.tab === "playground" ? "#fff" : "rgba(255,255,255,0.5)"};" 
                   @click=${() => {
                     state.setTab("playground");
                     state.uiStore.interfaceDropdownOpen = false;
                   }}>
                <span style="width: 16px; height: 16px;">${icons.sliders}</span>
                <span>Playground</span>
              </div>
              <div class="dropdown-item" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 600; color: ${state.uiStore.tab === "mission-control" ? "#fff" : "rgba(255,255,255,0.5)"};" 
                   @click=${() => {
                     state.setTab("mission-control");
                     state.uiStore.interfaceDropdownOpen = false;
                   }}>
                <span style="width: 16px; height: 16px;">${icons.activity}</span>
                <span>Mission Control</span>
              </div>
            `
                : nothing
            }
          </div>
        </div>
      </div>

      <div class="topbar-status">
        ${
          !isZen
            ? html`
          <div class="sentinel-badge" title="Zero Sentinel Active: Protecting your privacy">
            ${icons.shield}
            <span class="sentinel-text">${t("app.sentinel" as any)}</span>
          </div>
        `
            : nothing
        }
        <div style="display: flex; align-items: center; gap: 8px; margin-right: 12px; border-left: 1px solid var(--border-subtle); padding-left: 12px;">
          <div class="status-orb ${state.uiStore.connected ? "success" : "danger"}"></div>
          <span class="text-xs font-bold text-muted uppercase tracking-wider">${state.uiStore.connected ? t("app.online" as any) : t("app.offline" as any)}</span>
        </div>
        ${
          !isZen
            ? html`
          <button class="btn ${state.uiStore.hello?.isPanicMode ? "success" : "danger"} animate-pulse-slow" @click=${() => state.handlePanic()}>
            ${state.uiStore.hello?.isPanicMode ? t("mission.control.reset" as any) : t("app.panic" as any)}
          </button>
        `
            : nothing
        }
      </div>
    </header>
  `;
}
