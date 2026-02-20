import { html, nothing } from "lit";

import { formatAgo } from "../format";
import type { SignalStatus } from "../types";
import type { ChannelsProps } from "./channels.types";
import { renderChannelConfigSection } from "./channels.config";
import { icons } from "../icons";

export function renderSignalCard(params: {
  props: ChannelsProps;
  signal?: SignalStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, signal } = params;

  return html`
    <div class="animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
            <div>
                <div class="section-title" style="margin: 0;">Signal Protocol</div>
                <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Ponte de comunicação privada via sinalização criptografada ponta-a-ponta.</div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn" title="Sondagem" @click=${() => props.onRefresh(true)}>${icons.activity} Sondar</button>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 340px; gap: 40px; align-items: start;">
            <div>
                <div class="section-title">Status da Conexão</div>
                <div class="group-list">
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Estado do Serviço</div>
                            <div class="group-desc">${signal?.running ? "Operacional" : "Parado"}</div>
                        </div>
                        <div class="group-content">
                            <div class="status-orb ${signal?.running ? "success" : "danger"}"></div>
                        </div>
                    </div>
                    <div class="group-item">
                        <div class="group-label"><div class="group-title">Configurado</div></div>
                        <div class="group-content"><div class="badge ${signal?.configured ? "active" : ""}">${signal?.configured ? "SIM" : "NÃO"}</div></div>
                    </div>
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Localização da Ponte</div>
                            <div class="group-desc">${signal?.baseUrl ?? "n/a"}</div>
                        </div>
                    </div>
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Último Início</div>
                            <div class="group-desc">${signal?.lastStartAt ? formatAgo(signal.lastStartAt) : "Nunca iniciado."}</div>
                        </div>
                    </div>
                </div>

                ${signal?.lastError ? html`
                    <div class="group-list" style="border-color: var(--danger); background: rgba(255, 59, 48, 0.05); padding: 12px; margin-bottom: 24px;">
                        <div style="color: var(--danger); font-size: 12px; font-weight: 700;">Erro de Protocolo</div>
                        <div style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">${signal.lastError}</div>
                    </div>
                ` : nothing}

                ${renderChannelConfigSection({ channelId: "signal", props })}
            </div>

            <div>
                <div class="section-title">Diagnóstico de Rede</div>
                <div class="group-list">
                    <div class="group-item" style="flex-direction: column; align-items: flex-start; gap: 12px; padding: 20px;">
                        <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: #3a76f0; display: flex; align-items: center; justify-content: center; color: white;">
                                ${icons.plug}
                            </div>
                            <div>
                                <div style="font-weight: 600; font-size: 13px; color: var(--text-main);">Signal Messenger</div>
                                <div style="font-size: 11px; color: var(--text-dim);">signal-cli / signal-rest-api</div>
                            </div>
                        </div>
                        
                        ${signal?.probe ? html`
                            <div style="width: 100%; height: 1px; background: var(--border-subtle);"></div>
                            <div style="width: 100%;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                    <span style="font-size: 11px; color: var(--text-dim);">Sondagem Manual</span>
                                    <span class="badge ${signal.probe.ok ? "active" : "danger"}">${signal.probe.ok ? "OK" : "FALHA"}</span>
                                </div>
                                <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px;">
                                    ${signal.probe.status ?? "Status nominal"}
                                    ${signal.probe.error ? html`<br/><span style="color: var(--danger);">${signal.probe.error}</span>` : ""}
                                </div>
                            </div>
                        ` : html`
                            <div style="text-align: center; color: var(--text-dim); font-size: 11px; width: 100%;">Nenhum diagnóstico pendente.</div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;
}
