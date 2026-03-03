import { html, nothing } from "lit";
import { icons } from "./icons";
import { t } from "./i18n";
import { TAB_GROUPS, type Tab } from "./navigation";
import { renderTab } from "./app-render.helpers";
import type { AppViewState } from "./app-view-state";

export function renderSidebar(state: AppViewState) {
  const isZen = state.uiStore.zenMode;

  return html`
    <aside class="nav" style="padding-top: 24px;">
      <div class="mascot-container">
        <div class="mascot-glow"></div>
        <div class="mascot-container-red" @click=${() => state.setTab(state.uiStore.tab === "chat" ? "overview" : "chat")} style="cursor: pointer;">
          <img src="logo.png?v=5" alt="Zero Mascot" class="mascot-img-red" />
          <span class="mascot-brand">ZERO</span>
        </div>
      </div>

      ${
        !isZen
          ? html`
        <div class="sidebar-search">
          <div class="search-icon" style="flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; color: var(--text-dim);">${icons.search}</div>
          <input type="text" .placeholder="${t("common.search_placeholder")}" .value=${state.uiStore.tab === "config" ? state.configStore.searchQuery : ""} @input=${(
            e: Event,
          ) => {
            const val = (e.target as HTMLInputElement).value;
            if (state.uiStore.tab === "config") state.configStore.searchQuery = val;
          }} />
        </div>
      `
          : nothing
      }

      <nav style="flex: 1; overflow-y: auto; padding-top: 8px;">
        ${TAB_GROUPS.map((group) => {
          const visibleTabs = isZen
            ? group.tabs.filter((t) => ["chat", "sessions", "skills", "config", "docs"].includes(t))
            : group.tabs;

          if (visibleTabs.length === 0) return nothing;

          return html`
            <div class="nav-group">
              <div class="nav-group-title">${group.label}</div>
              <div class="nav-group-items">
                ${visibleTabs.map((tab) => renderTab(state, tab as any))}
              </div>
            </div>
          `;
        })}
      </nav>
    </aside>
  `;
}
