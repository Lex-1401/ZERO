import { html, nothing } from "lit";

import type { AppViewState } from "../app-view-state";

function formatRemaining(ms: number): string {
  const remaining = Math.max(0, ms);
  const totalSeconds = Math.floor(remaining / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function renderMetaRow(label: string, value?: string | null) {
  if (!value) return nothing;
  return html`<div class="exec-approval-meta-row"><span>${label}</span><span>${value}</span></div>`;
}

export function renderExecApprovalPrompt(state: AppViewState) {
  const active = state.execApprovalQueue[0];
  if (!active) return nothing;
  const request = active.request;
  const remainingMs = active.expiresAtMs - Date.now();
  const remaining = remainingMs > 0 ? `expira em ${formatRemaining(remainingMs)}` : "expirado";
  const queueCount = state.execApprovalQueue.length;
  return html`
    <div class="exec-approval-overlay" role="dialog" aria-live="polite">
      <div class="exec-approval-card">
        <div class="exec-approval-header">
          <div>
            <div class="exec-approval-title">Aprovação de execução necessária</div>
            <div class="exec-approval-sub">${remaining}</div>
          </div>
          ${queueCount > 1
      ? html`<div class="exec-approval-queue">${queueCount} pendente(s)</div>`
      : nothing}
        </div>
        <div class="exec-approval-command mono">${request.command}</div>
        <div class="exec-approval-meta">
          ${renderMetaRow("Host", request.host)}
          ${renderMetaRow("Agente", request.agentId)}
          ${renderMetaRow("Sessão", request.sessionKey)}
          ${renderMetaRow("CWD", request.cwd)}
          ${renderMetaRow("Resolvido", request.resolvedPath)}
          ${renderMetaRow("Segurança", request.security)}
          ${renderMetaRow("Pedido", request.ask)}
        </div>
        ${state.execApprovalError
      ? html`<div class="exec-approval-error">${state.execApprovalError}</div>`
      : nothing}
        <div class="exec-approval-actions">
          <button
            class="btn primary"
            ?disabled=${state.execApprovalBusy}
            @click=${() => state.handleExecApprovalDecision("allow-once")}
          >
            Permitir uma vez
          </button>
          <button
            class="btn"
            ?disabled=${state.execApprovalBusy}
            @click=${() => state.handleExecApprovalDecision("allow-always")}
          >
            Sempre permitir
          </button>
          <button
            class="btn danger"
            ?disabled=${state.execApprovalBusy}
            @click=${() => state.handleExecApprovalDecision("deny")}
          >
            Negar
          </button>
        </div>
      </div>
    </div>
  `;
}
