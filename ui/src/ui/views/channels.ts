import { html, nothing } from "lit";

import { formatAgo } from "../format";
import type {
  ChannelAccountSnapshot,
  ChannelUiMetaEntry,
  ChannelsStatusSnapshot,
  DiscordStatus,
  GoogleChatStatus,
  IMessageStatus,

  SignalStatus,
  SlackStatus,
  TelegramStatus,
  WhatsAppStatus,
} from "../types";
import type {
  ChannelKey,
  ChannelsChannelData,
  ChannelsProps,
} from "./channels.types";
import { channelEnabled, renderChannelAccountCount } from "./channels.shared";
import { renderChannelConfigSection } from "./channels.config";
import { renderDiscordCard } from "./channels.discord";
import { renderGoogleChatCard } from "./channels.googlechat";
import { renderIMessageCard } from "./channels.imessage";

import { renderSignalCard } from "./channels.signal";
import { renderSlackCard } from "./channels.slack";
import { renderTelegramCard } from "./channels.telegram";
import { renderWhatsAppCard } from "./channels.whatsapp";
import { icons } from "../icons";
import { t } from "../i18n";

export function renderChannels(props: ChannelsProps) {
  const channels = props.snapshot?.channels as Record<string, unknown> | null;
  const whatsapp = (channels?.whatsapp ?? undefined) as
    | WhatsAppStatus
    | undefined;
  const telegram = (channels?.telegram ?? undefined) as
    | TelegramStatus
    | undefined;
  const discord = (channels?.discord ?? null) as DiscordStatus | null;
  const googlechat = (channels?.googlechat ?? null) as GoogleChatStatus | null;
  const slack = (channels?.slack ?? null) as SlackStatus | null;
  const signal = (channels?.signal ?? null) as SignalStatus | null;
  const imessage = (channels?.imessage ?? null) as IMessageStatus | null;

  const channelOrder = resolveChannelOrder(props.snapshot);
  const orderedChannels = channelOrder
    .map((key, index) => ({
      key,
      enabled: channelEnabled(key, props),
      order: index,
    }))
    .sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return a.order - b.order;
    });

  return html`
    <div class="animate-fade-in" style="display: flex; flex-direction: column; gap: 60px; padding-bottom: 60px;">
      
      ${orderedChannels.map((channel, index) => html`
        ${index > 0 ? html`<div style="height: 1px; background: var(--border-subtle); margin: 0 20px;"></div>` : nothing}
        <section class="channel-section" style="${!channel.enabled ? "opacity: 0.6; grayscale: 1;" : ""}">
            ${renderChannel(channel.key, props, {
    whatsapp,
    telegram,
    discord,
    googleChat: googlechat,
    slack,
    signal,
    imessage,

    channelAccounts: props.snapshot?.channelAccounts ?? null,
  })}
        </section>
      `)}

      <div style="height: 1px; background: var(--border-subtle); margin: 0 20px;"></div>

      <section style="padding: 0 20px;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px;">
          <div>
            <div class="section-title">${t("channels.health.title" as any)}</div>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">${t("channels.health.desc" as any)}</div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim);">
            ${t("channels.health.signal" as any)}: ${props.lastSuccessAt ? formatAgo(props.lastSuccessAt) : t("channels.health.waiting" as any)}
          </div>
        </div>
        
        ${props.lastError ? html`
             <div class="group-list" style="border-color: var(--danger); background: rgba(255, 59, 48, 0.05); padding: 12px; margin-bottom: 24px;">
                <div style="color: var(--danger); font-size: 12px; font-weight: 700;">${t("channels.health.error.title" as any)}</div>
                <div style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">${props.lastError}</div>
            </div>
        ` : nothing}
        
        <div class="group-list">
             <div class="group-item" style="padding: 0;">
                <textarea class="code-block" style="width: 100%; height: 300px; border: none; background: transparent; padding: 20px; font-size: 11px; resize: vertical;" readonly>${props.snapshot ? JSON.stringify(props.snapshot, null, 2) : t("channels.health.telemetry.loading" as any)}</textarea>
            </div>
        </div>
      </section>
    </div>
  `;
}

function resolveChannelOrder(snapshot: ChannelsStatusSnapshot | null): ChannelKey[] {
  if (snapshot?.channelMeta?.length) {
    return snapshot.channelMeta.map((entry) => entry.id) as ChannelKey[];
  }
  if (snapshot?.channelOrder?.length) {
    return snapshot.channelOrder;
  }
  return [
    "whatsapp",
    "discord",
    "telegram",
    "slack",
    "googlechat",
    "signal",
    "imessage",

  ];
}

function renderChannel(
  key: ChannelKey,
  props: ChannelsProps,
  data: ChannelsChannelData,
) {
  const accountCountLabel = renderChannelAccountCount(
    key,
    data.channelAccounts,
  );
  switch (key) {
    case "whatsapp":
      return renderWhatsAppCard({
        props,
        whatsapp: data.whatsapp,
        accountCountLabel,
      });
    case "telegram":
      return renderTelegramCard({
        props,
        telegram: data.telegram,
        telegramAccounts: data.channelAccounts?.telegram ?? [],
        accountCountLabel,
      });
    case "discord":
      return renderDiscordCard({
        props,
        discord: data.discord,
        accountCountLabel,
      });
    case "googlechat":
      return renderGoogleChatCard({
        props,
        googleChat: data.googleChat,
        accountCountLabel,
      });
    case "slack":
      return renderSlackCard({
        props,
        slack: data.slack,
        accountCountLabel,
      });
    case "signal":
      return renderSignalCard({
        props,
        signal: data.signal,
        accountCountLabel,
      });
    case "imessage":
      return renderIMessageCard({
        props,
        imessage: data.imessage,
        accountCountLabel,
      });
    default:
      return renderGenericChannelCard(key, props, data.channelAccounts ?? {});
  }
}

function renderGenericChannelCard(
  key: ChannelKey,
  props: ChannelsProps,
  channelAccounts: Record<string, ChannelAccountSnapshot[]>,
) {
  const label = resolveChannelLabel(props.snapshot, key);
  const status = props.snapshot?.channels?.[key] as Record<string, unknown> | undefined;
  const configured = typeof status?.configured === "boolean" ? status.configured : undefined;
  const running = typeof status?.running === "boolean" ? status.running : undefined;
  const connected = typeof status?.connected === "boolean" ? status.connected : undefined;
  const lastError = typeof status?.lastError === "string" ? status.lastError : undefined;
  const accounts = channelAccounts[key] ?? [];

  return html`
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
        <div>
            <div class="section-title" style="margin: 0;">${label}</div>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Integração genérica de protocolo.</div>
        </div>
    </div>
    
    <div class="group-list">
        <div class="group-item">
            <div class="group-label"><div class="group-title">${t("channels.generic.status" as any)}</div></div>
             <div class="group-content" style="gap: 8px;">
                <span class="badge ${configured ? "active" : ""}">${configured ? t("channels.generic.configured" as any) : t("channels.generic.pending" as any)}</span>
                <span class="badge ${running ? "active" : ""}">${running ? t("channels.generic.running" as any) : t("channels.generic.stopped" as any)}</span>
             </div>
        </div>
        ${lastError ? html`
            <div class="group-item" style="background: rgba(255,59,48,0.05);">
                <div style="color: var(--danger); font-size: 11px;">${lastError}</div>
            </div>
        ` : nothing}
    </div>
    
    ${renderChannelConfigSection({ channelId: key, props })}
  `;
}

function resolveChannelMetaMap(
  snapshot: ChannelsStatusSnapshot | null,
): Record<string, ChannelUiMetaEntry> {
  if (!snapshot?.channelMeta?.length) return {};
  return Object.fromEntries(snapshot.channelMeta.map((entry) => [entry.id, entry]));
}

function resolveChannelLabel(
  snapshot: ChannelsStatusSnapshot | null,
  key: string,
): string {
  const meta = resolveChannelMetaMap(snapshot)[key];
  return meta?.label ?? snapshot?.channelLabels?.[key] ?? key;
}

function hasRecentActivity(account: ChannelAccountSnapshot): boolean {
  if (!account.lastInboundAt) return false;
  return Date.now() - account.lastInboundAt < 10 * 60 * 1000;
}
