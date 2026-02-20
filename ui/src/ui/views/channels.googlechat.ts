import { html, nothing } from "lit";

import { formatAgo } from "../format";
import type { GoogleChatStatus } from "../types";
import { renderChannelConfigSection } from "./channels.config";
import type { ChannelsProps } from "./channels.types";
import { icons } from "../icons";

export function renderGoogleChatCard(params: {
  props: ChannelsProps;
  googleChat?: GoogleChatStatus | null;
  accountCountLabel: unknown;
}) {
  const { props, googleChat } = params;

  return html`
    <div class="animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
            <div>
                <div class="section-title" style="margin: 0;">Google Chat Protocol</div>
                <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Ponte de comunicação para o serviço empresarial do Google Workspace.</div>
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
                            <div class="group-desc">${googleChat?.running ? "Operacional" : "Parado"}</div>
                        </div>
                        <div class="group-content">
                            <div class="status-orb ${googleChat?.running ? "success" : "danger"}"></div>
                        </div>
                    </div>
                    <div class="group-item">
                        <div class="group-label"><div class="group-title">Configurado</div></div>
                        <div class="group-content"><div class="badge ${googleChat?.configured ? "active" : ""}">${googleChat?.configured ? "SIM" : "NÃO"}</div></div>
                    </div>
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Fonte de Credencial</div>
                            <div class="group-desc">${googleChat?.credentialSource ?? "Sem credencial vinculada."}</div>
                        </div>
                    </div>
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Público (Audience)</div>
                            <div class="group-desc">${googleChat?.audienceType ?? "Padrão"} · ${googleChat?.audience ?? "Tudo"}</div>
                        </div>
                    </div>
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Última Sondagem</div>
                            <div class="group-desc">${googleChat?.lastProbeAt ? formatAgo(googleChat.lastProbeAt) : "Sem dados recentes."}</div>
                        </div>
                    </div>
                </div>

                ${googleChat?.lastError ? html`
                    <div class="group-list" style="border-color: var(--danger); background: rgba(255, 59, 48, 0.05); padding: 12px; margin-bottom: 24px;">
                        <div style="color: var(--danger); font-size: 12px; font-weight: 700;">Erro de Protocolo</div>
                        <div style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">${googleChat.lastError}</div>
                    </div>
                ` : nothing}

                ${renderChannelConfigSection({ channelId: "googlechat", props })}
            </div>

            <div>
                <div class="section-title">Diagnóstico de Rede</div>
                <div class="group-list">
                    <div class="group-item" style="flex-direction: column; align-items: flex-start; gap: 12px; padding: 20px;">
                        <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: #00897B; display: flex; align-items: center; justify-content: center; color: white;">
                                ${icons.plug}
                            </div>
                            <div>
                                <div style="font-weight: 600; font-size: 13px; color: var(--text-main);">Google Chat API</div>
                                <div style="font-size: 11px; color: var(--text-dim);">HTTPS over OAuth2</div>
                            </div>
                        </div>
                        
                        ${googleChat?.probe ? html`
                            <div style="width: 100%; height: 1px; background: var(--border-subtle);"></div>
                            <div style="width: 100%;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                    <span style="font-size: 11px; color: var(--text-dim);">Sondagem Manual</span>
                                    <span class="badge ${googleChat.probe.ok ? "active" : "danger"}">${googleChat.probe.ok ? "OK" : "FALHA"}</span>
                                </div>
                                <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px;">
                                    ${googleChat.probe.status ?? "Status nominal"}
                                    ${googleChat.probe.error ? html`<br/><span style="color: var(--danger);">${googleChat.probe.error}</span>` : ""}
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
