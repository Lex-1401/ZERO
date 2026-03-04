import type { DiscordConfig } from "./types.discord.js";
import type { SlackConfig } from "./types.slack.js";
import type { TelegramConfig } from "./types.telegram.js";
import type { GroupPolicy } from "./schemas/core-base.js";

/** Channel-specific types for providers no longer has inline config files. */
export interface GoogleChatConfig { accounts?: Record<string, any>;[key: string]: any; }
export interface IMessageConfig { accounts?: Record<string, IMessageAccountConfig>;[key: string]: any; }
export interface IMessageAccountConfig { [key: string]: any; }
export interface MSTeamsConfig { accounts?: Record<string, any>;[key: string]: any; }
export interface SignalConfig { accounts?: Record<string, SignalAccountConfig>;[key: string]: any; }
export interface SignalAccountConfig { [key: string]: any; }
export interface WhatsAppConfig { accounts?: Record<string, WhatsAppAccountConfig>; messagePrefix?: string;[key: string]: any; }
export interface WhatsAppAccountConfig { [key: string]: any; }

export type ChannelHeartbeatVisibilityConfig = {
  showOk?: boolean;
  showAlerts?: boolean;
  useIndicator?: boolean;
};

export type ChannelDefaultsConfig = {
  groupPolicy?: GroupPolicy;
  heartbeat?: ChannelHeartbeatVisibilityConfig;
};

export type ChannelsConfig = {
  defaults?: ChannelDefaultsConfig;
  whatsapp?: WhatsAppConfig;
  telegram?: TelegramConfig;
  discord?: DiscordConfig;
  googlechat?: GoogleChatConfig;
  slack?: SlackConfig;
  signal?: SignalConfig;
  imessage?: IMessageConfig;
  msteams?: MSTeamsConfig;
  [key: string]: unknown;
};
