import { html, nothing } from "lit";
import { formatAgo } from "../format";
import { icons } from "../icons";
import type { ChannelAccountSnapshot, TelegramStatus } from "../types";
import type { ChannelsProps } from "./channels.types";
import { renderChannelConfigSection } from "./channels.config";

export function renderTelegramCard(params: {
  props: ChannelsProps;
  telegram?: TelegramStatus;
  telegramAccounts: ChannelAccountSnapshot[];
  accountCountLabel: unknown;
}) {
  const { props, telegram, telegramAccounts } = params;
  const hasMultipleAccounts = telegramAccounts.length > 1;

  return html`
    <div class="animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
            <div>
                <div class="section-title" style="margin: 0;">Telegram Protocol</div>
                <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Integração rápida e segura via Bot API.</div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn" title="Forçar Sondagem" @click=${() => props.onRefresh(true)}>${icons.activity} Sondar</button>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 340px; gap: 40px; align-items: start;">
            <div>
                <div class="section-title">Status da Conexão</div>
                
                ${hasMultipleAccounts ? html`
                    <div class="group-list">
                        ${telegramAccounts.map(account => {
    const probe = account.probe as { bot?: { username?: string } } | undefined;
    const botUsername = probe?.bot?.username;
    const label = account.name || account.accountId;
    return html`
                                <div class="group-item">
                                    <div class="group-label">
                                        <div class="group-title">${botUsername ? `@${botUsername}` : label}</div>
                                        <div class="group-desc">ID: ${account.accountId}</div>
                                    </div>
                                    <div class="group-content" style="gap: 8px;">
                                        <span class="badge ${account.configured ? "active" : ""}">${account.configured ? "CONF" : "PEND"}</span>
                                        <div class="status-orb ${account.running ? "success" : "danger"}"></div>
                                    </div>
                                </div>
                            `;
  })}
                    </div>
                ` : html`
                    <div class="group-list">
                        <div class="group-item">
                            <div class="group-label">
                                <div class="group-title">Estado do Bot</div>
                                <div class="group-desc">${telegram?.running ? "Operacional" : "Parado"}</div>
                            </div>
                            <div class="group-content">
                                <div class="status-orb ${telegram?.running ? "success" : "danger"}"></div>
                            </div>
                        </div>
                        <div class="group-item">
                            <div class="group-label"><div class="group-title">Configurado</div></div>
                            <div class="group-content"><div class="badge ${telegram?.configured ? "active" : ""}">${telegram?.configured ? "SIM" : "NÃO"}</div></div>
                        </div>
                        <div class="group-item">
                            <div class="group-label">
                                <div class="group-title">Modo de Operação</div>
                                <div class="group-desc">${telegram?.mode ?? "Padrão"}</div>
                            </div>
                        </div>
                        <div class="group-item">
                            <div class="group-label">
                                <div class="group-title">Último Início</div>
                                <div class="group-desc">${telegram?.lastStartAt ? formatAgo(telegram.lastStartAt) : "Nunca iniciado."}</div>
                            </div>
                        </div>
                    </div>
                `}

                ${telegram?.lastError ? html`
                    <div class="group-list" style="border-color: var(--danger); background: rgba(255, 59, 48, 0.05); padding: 12px; margin-bottom: 24px;">
                        <div style="color: var(--danger); font-size: 12px; font-weight: 700;">Erro de Protocolo</div>
                        <div style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">${telegram.lastError}</div>
                    </div>
                ` : nothing}

                ${renderChannelConfigSection({ channelId: "telegram", props })}
            </div>

            <div>
                <div class="section-title">Diagnóstico de Rede</div>
                 <div class="group-list">
                    <div class="group-item" style="flex-direction: column; align-items: flex-start; gap: 12px; padding: 20px;">
                        <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: #229ED9; display: flex; align-items: center; justify-content: center; color: white;">
                                ${icons.send}
                            </div>
                            <div>
                                <div style="font-weight: 600; font-size: 13px; color: var(--text-main);">Telegram Bot API</div>
                                <div style="font-size: 11px; color: var(--text-dim);">Long Polling / Webhook</div>
                            </div>
                        </div>
                        
                        ${telegram?.probe ? html`
                             <div style="width: 100%; height: 1px; background: var(--border-subtle);"></div>
                             <div style="width: 100%;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                    <span style="font-size: 11px; color: var(--text-dim);">Resultado de Sondagem</span>
                                    <span class="badge ${telegram.probe.ok ? "success" : "danger"}">${telegram.probe.ok ? "OK" : "FALHA"}</span>
                                </div>
                                <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px;">
                                    ${telegram.probe.status ?? "Status desconhecido"}
                                    ${telegram.probe.error ? html`<br/><span style="color: var(--danger);">${telegram.probe.error}</span>` : ""}
                                </div>
                            </div>
                        ` : html`
                            <div style="text-align: center; color: var(--text-dim); font-size: 11px; width: 100%;">Nenhum diagnóstico recente.</div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;
}
