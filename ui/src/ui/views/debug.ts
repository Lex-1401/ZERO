import { html, nothing } from "lit";
import { formatEventPayload } from "../presenter";
import type { EventLogEntry } from "../app-events";
import { icons } from "../icons";
import { t } from "../i18n";

export type DebugProps = {
    loading: boolean;
    status: Record<string, unknown> | null;
    health: Record<string, unknown> | null;
    models: unknown[];
    heartbeat: unknown;
    eventLog: EventLogEntry[];
    callMethod: string;
    callParams: string;
    callResult: string | null;
    callError: string | null;
    onCallMethodChange: (next: string) => void;
    onCallParamsChange: (next: string) => void;
    onRefresh: () => void;
    onCall: () => void;
    onStressTest?: () => void;
};


function sanitizeDebugData(data: unknown): unknown {
    if (!data) return data;
    if (typeof data === "string") {
        // Basic heuristics for file paths
        if (data.includes("/Users/") || data.includes("/home/") || data.match(/^[a-zA-Z]:\\/)) {
            // Redact only the prefix to keep context if needed, or full path
            return data.replace(/(\/Users\/[^/]+|\/home\/[^/]+|[a-zA-Z]:\\[^\\]+)/g, "[REDACTED_PATH]");
        }
        return data;
    }
    if (Array.isArray(data)) {
        return data.map(sanitizeDebugData);
    }
    if (typeof data === "object") {
        const copy: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
            copy[key] = sanitizeDebugData(val);
        }
        return copy;
    }
    return data;
}

function renderJsonBlock(data: unknown, style = "") {
    const sanitized = sanitizeDebugData(data);
    const isEmpty = !sanitized || (typeof sanitized === 'object' && Object.keys(sanitized).length === 0) || (Array.isArray(sanitized) && sanitized.length === 0);
    if (isEmpty) {
        return html`<div style="color: var(--text-dim); font-size: 11px; font-style: italic; padding: 12px;">${t("debug.data.unavailable" as any)}</div>`;
    }
    return html`<pre class="code-block" style="width: 100%; border-radius: 6px; padding: 12px; font-size: 11px; ${style}">${JSON.stringify(sanitized, null, 2)}</pre>`;
}

export function renderDebug(props: DebugProps) {
    return html`
    <div class="animate-fade-in">
        
        <div class="debug-grid">
            
            <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
                    <div class="section-title" style="margin: 0;">${t("debug.title" as any)}</div>
                    <button class="btn btn--sm" ?disabled=${props.loading} @click=${props.onRefresh}>
                        ${icons.rotateCcw} ${t("debug.refresh" as any)}
                    </button>
                </div>
                <div class="group-list">
                    <div class="group-item" style="flex-direction: column; align-items: start; gap: 8px;">
                        <div class="group-title">${t("debug.status.gateway" as any)}</div>
                        ${renderJsonBlock(props.status)}
                    </div>
                    <div class="group-item" style="flex-direction: column; align-items: start; gap: 8px;">
                        <div class="group-title">${t("debug.status.health" as any)}</div>
                        ${renderJsonBlock(props.health)}
                    </div>
                    <div class="group-item" style="flex-direction: column; align-items: start; gap: 8px;">
                        <div class="group-title">${t("debug.status.heartbeat" as any)}</div>
                        ${renderJsonBlock(props.heartbeat)}
                    </div>
                </div>

                <div class="section-title">${t("debug.models.title" as any)}</div>
                <div class="group-list">
                    <div class="group-item" style="padding: 0; border-bottom: none;">
                        ${renderJsonBlock(props.models, "border: none; border-radius: 0; max-height: 400px;")}
                    </div>
                </div>

                <!-- Agentic Localization Debug -->
                <div class="section-title">Localização Agêntica ✨</div>
                <div class="group-list">
                    <div class="group-item" style="flex-direction: column; align-items: start; gap: 8px;">
                        <div class="group-title">Teste de Estresse (Auto-Chunking)</div>
                        <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 4px;">Ativa a tradução em massa de chaves do núcleo para testar a fragmentação de pacotes.</div>
                        <button class="btn" style="width: 100%; justify-content: center; gap: 8px;" @click=${props.onStressTest}>
                            ${icons.sparkles} Disparar Teste de Estresse
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <div class="section-title">${t("debug.rpc.title" as any)}</div>
                <div class="group-list">
                    <div class="group-item">
                        <div class="group-label"><div class="group-title">${t("debug.rpc.method" as any)}</div></div>
                        <div class="group-content">
                            <input class="input-native" style="width: 240px;" .value=${props.callMethod} @input=${(e: Event) => props.onCallMethodChange((e.target as HTMLInputElement).value)} placeholder="system.info" />
                        </div>
                    </div>
                    <div class="group-item" style="flex-direction: column; align-items: start; gap: 8px;">
                        <div class="group-title">${t("debug.rpc.params" as any)}</div>
                        <textarea class="textarea-native" style="width: 100%; min-height: 120px;" .value=${props.callParams} @input=${(e: Event) => props.onCallParamsChange((e.target as HTMLTextAreaElement).value)}></textarea>
                    </div>
                </div>
                <button class="btn primary" style="width: 100%; margin-top: 12px;" @click=${props.onCall}>${t("debug.rpc.execute" as any)}</button>

                ${props.callError ? html`
                    <div class="group-list" style="margin-top: 24px; border-color: var(--danger); background: rgba(255, 59, 48, 0.05); padding: 12px;">
                        <div style="color: var(--danger); font-size: 12px; font-weight: 700;">${t("debug.rpc.error" as any)}</div>
                        <div style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">${props.callError}</div>
                    </div>
                ` : nothing}

                ${props.callResult ? html`
                    <div class="section-title">${t("debug.rpc.result" as any)}</div>
                    <div class="group-list">
                        <div class="group-item" style="padding: 0; border-bottom: none;">
                            <pre class="code-block" style="width: 100%; border: none; border-radius: 0; font-size: 11px;">${props.callResult}</pre>
                        </div>
                    </div>
                ` : nothing}

                <div class="section-title">${t("debug.events.title" as any)}</div>
                <div class="group-list">
                    ${props.eventLog.length === 0 ? html`
                        <div class="group-item" style="padding: 40px; justify-content: center; color: var(--text-dim);">${t("debug.events.empty" as any)}</div>
                    ` : props.eventLog.map(evt => html`
                        <div class="group-item" style="flex-direction: column; align-items: start; gap: 6px;">
                            <div style="display: flex; justify-content: space-between; width: 100%;">
                                <div style="font-size: 12px; font-weight: 700; color: var(--accent-blue); text-transform: uppercase;">${evt.event}</div>
                                <div style="font-size: 10px; color: var(--text-dim);">${new Date(evt.ts).toLocaleTimeString()}</div>
                            </div>
                            <pre class="code-block" style="width: 100%; font-size: 10px; padding: 8px; background: rgba(0,0,0,0.2);">${formatEventPayload(evt.payload)}</pre>
                        </div>
                    `)}
                </div>
            </div>

        </div>

    </div>
  `;
}
