import { html, nothing } from "lit";

import { formatPresenceAge, formatPresenceSummary } from "../presenter";
import type { PresenceEntry } from "../types";
import { icons } from "../icons";

export type InstancesProps = {
  loading: boolean;
  entries: PresenceEntry[];
  lastError: string | null;
  statusMessage: string | null;
  onRefresh: () => void;
};

export function renderInstances(props: InstancesProps) {
  return html`
    <div class="animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
            <div>
                <div class="section-title" style="margin: 0;">Frotas Ativas</div>
                <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Beacons de presença e telemetria de processos isolados.</div>
            </div>
            <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
                ${icons.rotateCcw} ${props.loading ? "Atualizando…" : "Atualizar"}
            </button>
        </div>

        ${props.lastError ? html`
            <div class="group-list" style="border-color: var(--danger); background: rgba(255, 59, 48, 0.05); margin-bottom: 24px; padding: 12px 16px;">
                <div style="color: var(--danger); font-size: 13px; font-weight: 600;">Erro de Presença</div>
                <div style="color: var(--text-muted); font-size: 12px; margin-top: 2px;">${props.lastError}</div>
            </div>
        ` : nothing}

        <div class="group-list">
            ${props.entries.length === 0 ? html`
                <div class="group-item" style="justify-content: center; padding: 48px; color: var(--text-dim);">
                    Nenhuma instância relatada no momento.
                </div>
            ` : props.entries.map((entry) => renderEntry(entry))}
        </div>
    </div>
  `;
}

function renderEntry(entry: PresenceEntry) {
  const lastInput = entry.lastInputSeconds != null ? `${entry.lastInputSeconds}s` : "n/d";
  const roles = Array.isArray(entry.roles) ? entry.roles.filter(Boolean) : [];

  return html`
    <div class="group-item">
      <div class="group-label">
        <div class="group-title" style="display: flex; align-items: center; gap: 8px;">
            <div class="status-orb success"></div>
            ${entry.host ?? "Dispositivo Desconhecido"}
        </div>
        <div class="group-desc">${formatPresenceSummary(entry)}</div>
        <div style="display: flex; gap: 4px; margin-top: 8px;">
            <span class="badge active">${entry.mode ?? "indeterminado"}</span>
            ${roles.map((role: string) => html`<span class="badge">${role}</span>`)}
            ${entry.platform ? html`<span class="badge">${entry.platform}</span>` : nothing}
            ${entry.version ? html`<span class="badge">v${entry.version}</span>` : nothing}
        </div>
      </div>
      <div class="group-content" style="text-align: right; flex-direction: column; align-items: flex-end; gap: 4px;">
        <div style="font-size: 12px; font-weight: 700; color: var(--text-main);">${formatPresenceAge(entry)}</div>
        <div style="font-size: 11px; color: var(--text-dim);">IO: <span class="mono">${lastInput}</span></div>
      </div>
    </div>
  `;
}
