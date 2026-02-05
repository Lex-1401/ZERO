import { html, nothing } from "lit";
import { escapeHtml } from "../markdown";
import { formatAgo } from "../format";
import { formatSessionTokens } from "../presenter";
import { pathForTab } from "../navigation";
import { icons } from "../icons";
import type { GatewaySessionRow, SessionsListResult } from "../types";

export type SessionsProps = {
  loading: boolean;
  result: SessionsListResult | null;
  error: string | null;
  activeMinutes: string;
  limit: string;
  includeGlobal: boolean;
  includeUnknown: boolean;
  basePath: string;
  onFiltersChange: (next: {
    activeMinutes: string;
    limit: string;
    includeGlobal: boolean;
    includeUnknown: boolean;
  }) => void;
  onRefresh: () => void;
  onPatch: (
    key: string,
    patch: {
      label?: string | null;
      thinkingLevel?: string | null;
      verboseLevel?: string | null;
      reasoningLevel?: string | null;
    },
  ) => void;
  onDelete: (key: string) => void;
};

const THINK_LEVELS = ["", "off", "minimal", "low", "medium", "high"] as const;
const BINARY_THINK_LEVELS = ["", "off", "on"] as const;
const VERBOSE_LEVELS = [
  { value: "", label: "herdado" },
  { value: "off", label: "off" },
  { value: "on", label: "on" },
] as const;
const REASONING_LEVELS = ["", "off", "on", "stream"] as const;

function normalizeProviderId(provider?: string | null): string {
  if (!provider) return "";
  const normalized = provider.trim().toLowerCase();
  if (normalized === "z.ai" || normalized === "z-ai") return "zai";
  return normalized;
}

function isBinaryThinkingProvider(provider?: string | null): boolean {
  return normalizeProviderId(provider) === "zai";
}

function resolveThinkLevelOptions(provider?: string | null): readonly string[] {
  return isBinaryThinkingProvider(provider) ? BINARY_THINK_LEVELS : THINK_LEVELS;
}

function resolveThinkLevelDisplay(value: string, isBinary: boolean): string {
  if (!isBinary) return value;
  if (!value || value === "off") return value;
  return "on";
}

function resolveThinkLevelPatchValue(value: string, isBinary: boolean): string | null {
  if (!value) return null;
  if (!isBinary) return value;
  if (value === "on") return "low";
  return value;
}

export function renderSessions(props: SessionsProps) {
  const rows = props.result?.sessions ?? [];
  return html`
    <div class="animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
            <div>
                <div class="section-title" style="margin: 0;">Contextos Neurais</div>
                <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Persistência e fluxos de consciência armazenados.</div>
            </div>
            <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
                ${icons.rotateCcw} ${props.loading ? "Consultando…" : "Consultar"}
            </button>
        </div>

        <div class="section-title">Filtros de Busca</div>
        <div class="group-list">
            <div class="group-item" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                <div class="group-label">
                    <div class="group-title">Intervalo de Atividade</div>
                    <div class="group-desc">Minutos desde a última atualização.</div>
                </div>
                <div class="group-content">
                    <input class="input-native" style="width: 100%;" .value=${props.activeMinutes} @input=${(e: Event) => props.onFiltersChange({ ...props, activeMinutes: (e.target as HTMLInputElement).value })} />
                </div>
            </div>
            <div class="group-item" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                <div class="group-label">
                    <div class="group-title">Limite de Resultados</div>
                </div>
                <div class="group-content">
                    <input class="input-native" style="width: 100%;" .value=${props.limit} @input=${(e: Event) => props.onFiltersChange({ ...props, limit: (e.target as HTMLInputElement).value })} />
                </div>
            </div>
            <div class="group-item" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                <div class="group-label">
                    <div class="group-title">Abrangência Global</div>
                    <div class="group-desc">Incluir sessões de sistema e núcleo.</div>
                </div>
                <div class="group-content">
                    <label class="toggle-switch">
                        <input type="checkbox" .checked=${props.includeGlobal} @change=${(e: Event) => props.onFiltersChange({ ...props, includeGlobal: (e.target as HTMLInputElement).checked })} />
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <div class="section-title">Resultados</div>
        <div class="group-list">
             <div class="sessions-list-header">
                <div class="col-session">Sessão</div>
                <div class="col-label">Rótulo</div>
                <div class="col-updated">Atualização</div>
                <div class="col-tokens">Tokens</div>
                <div class="col-actions">Controles</div>
             </div>
             ${rows.length === 0 ? html`
                <div class="group-item" style="padding: 60px; justify-content: center; color: var(--text-dim);">
                    Nenhum registro encontrado.
                </div>
             ` : rows.map(row => renderRow(row, props.basePath, props.onPatch, props.onDelete, props.loading))}
        </div>
    </div>
  `;
}

function renderRow(row: GatewaySessionRow, basePath: string, onPatch: SessionsProps["onPatch"], onDelete: SessionsProps["onDelete"], disabled: boolean) {
  const updated = row.updatedAt ? formatAgo(row.updatedAt) : "n/d";
  const rawThinking = row.thinkingLevel ?? "";
  const isBinaryThinking = isBinaryThinkingProvider(row.modelProvider);
  const thinking = resolveThinkLevelDisplay(rawThinking, isBinaryThinking);
  const thinkLevels = resolveThinkLevelOptions(row.modelProvider);
  const verbose = row.verboseLevel ?? "";
  const reasoning = row.reasoningLevel ?? "";
  const displayName = row.displayName ?? row.key;
  const canLink = row.kind !== "global";
  const chatUrl = canLink ? `${pathForTab("chat", basePath)}?session=${encodeURIComponent(row.key)}` : null;

  return html`
    <div class="sessions-item">
      <div class="col-session">
        ${canLink ? html`<a href=${chatUrl} style="color: var(--accent-blue); text-decoration: none; font-weight: 600;">${escapeHtml(displayName)}</a>` : html`<span style="font-weight: 600;">${escapeHtml(displayName)}</span>`}
        <div style="font-size: 10px; color: var(--text-dim); margin-top: 2px;">${row.kind} • ${row.modelProvider || "local"}</div>
      </div>
      
      <div class="session-meta-row" style="display: contents;">
          <div class="col-updated">${updated}</div>
          <div class="col-tokens">${formatSessionTokens(row)}</div>
      </div>

      <div class="col-label">
        <input class="input-native" style="width: 90%; height: 24px;" .value=${row.label ?? ""} placeholder="---" @change=${(e: Event) => onPatch(row.key, { label: (e.target as HTMLInputElement).value || null })} />
      </div>

      <div class="col-actions">
        <select class="select-native" style="width: 60px; height: 24px; font-size: 10px;" .value=${thinking} @change=${(e: Event) => onPatch(row.key, { thinkingLevel: resolveThinkLevelPatchValue((e.target as HTMLSelectElement).value, isBinaryThinking) })}>
            ${thinkLevels.map(l => html`<option value=${l}>${l || "---"}</option>`)}
        </select>
        <select class="select-native" style="width: 60px; height: 24px; font-size: 10px;" .value=${verbose} @change=${(e: Event) => onPatch(row.key, { verboseLevel: (e.target as HTMLSelectElement).value || null })}>
            ${VERBOSE_LEVELS.map(l => html`<option value=${l.value}>${l.label}</option>`)}
        </select>
        <button class="btn btn--icon btn--sm danger btn-delete-mobile" @click=${() => onDelete(row.key)}>${icons.trash}</button>
      </div>
    </div>
  `;
}
