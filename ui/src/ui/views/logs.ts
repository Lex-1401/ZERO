import { html, nothing } from "lit";
import { virtualize } from "@lit-labs/virtualizer/virtualize.js";
import { guard } from "lit/directives/guard.js";

import { icons } from "../icons";
import type { LogEntry, LogLevel } from "../types";

const LEVELS: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];

export type LogsProps = {
    loading: boolean;
    error: string | null;
    file: string | null;
    entries: LogEntry[];
    filterText: string;
    levelFilters: Record<LogLevel, boolean>;
    autoFollow: boolean;
    truncated: boolean;
    onFilterTextChange: (next: string) => void;
    onLevelToggle: (level: LogLevel, enabled: boolean) => void;
    onToggleAutoFollow: (next: boolean) => void;
    onRefresh: () => void;
    onExport: (lines: string[], label: string) => void;
    onScroll: (event: Event) => void;
};

function formatTime(value?: string | null) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
}

function matchesFilter(entry: LogEntry, needle: string) {
    if (!needle) return true;
    const haystack = [entry.message, entry.subsystem, entry.raw]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return haystack.includes(needle);
}

export function renderLogs(props: LogsProps) {
    const needle = props.filterText.trim().toLowerCase();
    const levelFiltered = LEVELS.some((level) => !props.levelFilters[level]);
    const filtered = props.entries.filter((entry) => {
        if (entry.level && !props.levelFilters[entry.level]) return false;
        return matchesFilter(entry, needle);
    });
    const exportLabel = needle || levelFiltered ? "filtrados" : "visíveis";

    return html`
    <div class="animate-fade-in" style="height: 100%; display: flex; flex-direction: column;">
        <div style="flex: 0 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
                <div>
                    <div class="section-title" style="margin: 0;">Registro de Eventos</div>
                    <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Auditoria de operações e trilhas de erro.</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
                        ${icons.rotateCcw} ${props.loading ? "Atualizando…" : "Atualizar"}
                    </button>
                    <button class="btn" ?disabled=${filtered.length === 0} @click=${() => props.onExport(filtered.map((entry) => entry.raw), exportLabel)}>
                        ${icons.download} Exportar
                    </button>
                </div>
            </div>

            <div class="group-list" style="padding: 12px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: center;">
                <div style="display: flex; gap: 16px; align-items: center;">
                    <div class="sidebar-search" style="margin: 0; padding: 0; height: 28px; width: 240px;">
                        <input class="input-native" style="width: 100%;" type="text" placeholder="Buscar na trilha…" .value=${props.filterText} @input=${(e: Event) => props.onFilterTextChange((e.target as HTMLInputElement).value)} />
                    </div>
                    
                    <div style="display: flex; gap: 4px; border-left: 1px solid var(--border-subtle); padding-left: 16px;">
                         ${LEVELS.map(level => html`
                            <label class="badge ${props.levelFilters[level] ? level : 'muted'}" style="cursor: pointer; opacity: ${props.levelFilters[level] ? '1' : '0.7'}; text-transform: uppercase; transition: var(--transition-fast);">
                                <input type="checkbox" style="display: none;" .checked=${props.levelFilters[level]} @change=${(e: Event) => props.onLevelToggle(level, (e.target as HTMLInputElement).checked)} />
                                ${level}
                            </label>
                         `)}
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 8px; padding-top: 2px;">
                    <span style="font-size: 11px; font-weight: 600; color: var(--text-dim);">Auto-scroll</span>
                    <label class="toggle-switch">
                        <input type="checkbox" .checked=${props.autoFollow} @change=${(e: Event) => props.onToggleAutoFollow((e.target as HTMLInputElement).checked)} />
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>

            ${props.error ? html`
                <div class="group-list" style="border-color: var(--danger); background: rgba(255, 59, 48, 0.05); padding: 12px; margin-bottom: 24px;">
                    <div style="color: var(--danger); font-size: 12px; font-weight: 700;">Erro de Leitura</div>
                    <div style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">${props.error}</div>
                </div>
            ` : nothing}
        </div>

        <div class="group-list" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; background: #0d0d0d; border: 1px solid #1f1f1f; border-radius: 8px;">
            <div class="log-stream" style="flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 2px;" @scroll=${props.onScroll}>
                ${filtered.length === 0 ? html`
                    <div style="padding: 40px; text-align: center; color: var(--text-dim); display: flex; flex-direction: column; align-items: center; gap: 12px; justify-content: center; height: 100%;">
                        <div style="font-size: 24px; opacity: 0.2;">${icons.scrollText}</div>
                        <div>Sem registros correspondentes.</div>
                    </div>
                ` : virtualize({
        items: filtered,
        scroller: true,
        renderItem: (entry) => html`
                    <div style="display: grid; grid-template-columns: 80px 50px 100px 1fr; gap: 12px; font-family: var(--font-mono); font-size: 11px; line-height: 1.5; align-items: start; padding: 2px 0;">
                        <div style="color: var(--text-dim); white-space: nowrap;">${formatTime(entry.time)}</div>
                        <div style="font-weight: 700; text-transform: uppercase; color: var(--text-${getLevelColor(entry.level ?? undefined)});">${entry.level?.substring(0, 4) ?? "UNK"}</div>
                        <div style="color: var(--accent-blue); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title=${entry.subsystem ?? ""}>${entry.subsystem ?? "-"}</div>
                        <div style="color: var(--text-main); word-break: break-all;">${entry.message ?? entry.raw}</div>
                    </div>
                `
    })}
            </div>
            ${props.truncated ? html`
                <div style="padding: 4px 12px; background: rgba(255, 159, 10, 0.1); border-top: 1px solid rgba(255, 159, 10, 0.2); color: var(--warning); font-size: 10px; text-align: center;">
                    Buffer truncado. Mostrando os ${filtered.length} eventos mais recentes.
                </div>
            ` : nothing}
        </div>
        
        ${props.file ? html`
            <div style="font-size: 10px; color: var(--text-dim); margin-top: 8px; text-align: right; font-family: var(--font-mono);">
                Origem: ${props.file}
            </div>
        ` : nothing}
    </div>
  `;
}

function getLevelColor(level?: string) {
    switch (level) {
        case 'error': case 'fatal': return 'danger';
        case 'warn': return 'warning';
        case 'info': return 'main';
        case 'debug': return 'dim';
        case 'trace': return 'muted';
        default: return 'muted';
    }
}
