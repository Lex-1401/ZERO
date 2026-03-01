import { html, nothing } from "lit";
import { t } from "../../i18n.js";
import { icons } from "../../icons.js";

export type CompactionIndicatorStatus = {
  active: boolean;
  startedAt: number | null;
  completedAt: number | null;
};
const COMPACTION_TOAST_DURATION_MS = 5000;

export function renderCompactionIndicator(status: CompactionIndicatorStatus | null | undefined) {
  if (!status) return nothing;
  if (status.active) {
    return html`
      <div class="callout info compaction-indicator compaction-indicator--active" style="position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 100; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
        ${icons.loader} ${t("chat.compacting" as any)}
      </div>
    `;
  }
  if (status.completedAt && Date.now() - status.completedAt < COMPACTION_TOAST_DURATION_MS) {
    return html`
      <div class="callout success compaction-indicator compaction-indicator--complete" style="position: absolute; top: 16px; left: 50%; transform: translateX(-50%); z-index: 100; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
        ${icons.check} ${t("chat.compacted" as any)}
      </div>
    `;
  }
  return nothing;
}

export function renderChatStatusCallouts(params: {
  disabledReason: string | null;
  error: string | null;
  connected: boolean;
}) {
  const { disabledReason, error, connected } = params;
  return html`
    ${
      disabledReason
        ? html`
      <div class="callout warning callout--active">
        <div style="color: var(--warning);">${icons.plug}</div>
        <div style="font-size: 13px;">${disabledReason.includes("1006") || disabledReason.includes("disconnect") ? t("chat.status.reconnecting" as any) : disabledReason}</div>
      </div>`
        : nothing
    }
    ${error ? html`<div class="callout danger callout--active">${icons.bug} ${error}</div>` : nothing}
  `;
}
