import { html, nothing } from "lit";
import { formatAgo } from "../format";
import { icons } from "../icons";
import type { WhatsAppStatus } from "../types";
import type { ChannelsProps } from "./channels.types";
import { renderChannelConfigSection } from "./channels.config";

export function renderWhatsAppCard(params: {
    props: ChannelsProps;
    whatsapp?: WhatsAppStatus;
    accountCountLabel: unknown;
}) {
    const { props, whatsapp } = params;

    return html`
    <div class="animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
            <div>
                <div class="section-title" style="margin: 0;">WhatsApp Protocol</div>
                <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Gateway de comunicação neural para o ecossistema Meta.</div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn" title="Forçar Sondagem" @click=${() => props.onRefresh(true)}>${icons.activity} Sondar</button>
                <button class="btn danger" ?disabled=${props.whatsappBusy} @click=${() => props.onWhatsAppLogout()}>Logout</button>
            </div>
        </div>

        <div class="channels-layout">
            <div>
                <div class="section-title">Status da Conexão</div>
                <div class="group-list">
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Estado do Serviço</div>
                            <div class="group-desc">${whatsapp?.running ? "Operacional" : "Parado"}</div>
                        </div>
                        <div class="group-content">
                            <div class="status-orb ${whatsapp?.running ? "success" : "danger"}"></div>
                        </div>
                    </div>
                    <div class="group-item">
                        <div class="group-label"><div class="group-title">Sessão Vinculada</div></div>
                        <div class="group-content"><div class="badge ${whatsapp?.linked ? "active" : ""}">${whatsapp?.linked ? "SIM" : "NÃO"}</div></div>
                    </div>
                     <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Última Atividade</div>
                            <div class="group-desc">${whatsapp?.lastMessageAt ? formatAgo(whatsapp.lastMessageAt) : "Nenhuma mensagem recente."}</div>
                        </div>
                    </div>
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">Latência de Rede</div>
                            <div class="group-desc">${whatsapp?.connected ? "Conectado" : "Desconectado"}</div>
                        </div>
                    </div>
                </div>

                ${props.whatsappMessage ? html`
                    <div class="group-list" style="padding: 12px; border-color: var(--accent-blue); background: rgba(0, 122, 255, 0.05); margin-bottom: 24px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="color: var(--accent-blue);">${icons.info}</div>
                            <div style="font-size: 12px; font-weight: 600; color: var(--accent-blue);">Status do Sistema</div>
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; padding-left: 24px;">${props.whatsappMessage}</div>
                    </div>
                ` : nothing}

                ${renderChannelConfigSection({ channelId: "whatsapp", props })}
            </div>

            <div>
                <div class="section-title">Autenticação Visual</div>
                <div class="group-list" style="padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 16px; min-height: 320px; justify-content: center; position: relative;">
                    ${props.whatsappBusy && !props.whatsappQrDataUrl ? html`
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                            <div class="animate-spin" style="color: var(--accent-blue);">${icons.loader}</div>
                            <div style="font-size: 11px; color: var(--text-dim);">Requisitando novo par neural...</div>
                        </div>
                    ` : props.whatsappQrDataUrl ? html`
                        <div style="background: white; padding: 12px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
                            <img src="${props.whatsappQrDataUrl}" style="width: 200px; height: 200px; display: block;" />
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 13px; font-weight: 600; color: var(--text-main);">Escanear QR Code</div>
                            <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">Use o WhatsApp no seu celular para vincular.</div>
                        </div>
                        <button class="btn primary" style="width: 100%;" ?disabled=${props.whatsappBusy} @click=${() => props.onWhatsAppWait()}>
                            ${props.whatsappBusy ? html`<span class="animate-spin">${icons.loader}</span> Aguardando...` : "Já Escaneei"}
                        </button>
                    ` : html`
                        <div style="height: 120px; display: flex; align-items: center; justify-content: center; color: var(--text-dim); background: rgba(255,255,255,0.03); width: 100%; border-radius: 8px; border: 1px dashed var(--border-subtle);">
                            ${icons.camera}
                        </div>
                        <div style="text-align: center; margin: 12px 0;">
                            <div style="font-size: 11px; color: var(--text-dim);">Solicite um novo QR para iniciar uma sessão segura.</div>
                        </div>
                        <div class="qr-actions">
                             <button class="btn primary" style="height: 32px;" ?disabled=${props.whatsappBusy} @click=${() => props.onWhatsAppStart(false)}>
                                ${props.whatsappBusy ? html`<span class="animate-spin">${icons.loader}</span>` : "Gerar QR"}
                             </button>
                             <button class="btn" style="height: 32px;" title="Forçar re-vinculação se já existir sessão" ?disabled=${props.whatsappBusy} @click=${() => props.onWhatsAppStart(true)}>Forçar Link</button>
                        </div>
                    `}

                    ${props.whatsappConnected === true ? html`
                        <div class="animate-fade-in" style="position: absolute; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12px; border: 1px solid var(--success);">
                            <div style="color: var(--success); font-size: 32px; margin-bottom: 12px;">${icons.check}</div>
                            <div style="font-weight: 700; color: white;">CONECTADO</div>
                            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Sessão estabelecida.</div>
                            <button class="btn" style="margin-top: 16px;" @click=${() => props.onRefresh(false)}>Fechar</button>
                        </div>
                    ` : nothing}
                </div>
            </div>
        </div>
    </div>
  `;
}
