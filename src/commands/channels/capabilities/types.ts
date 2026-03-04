
import type { ChannelCapabilities } from "../../../channels/plugins/types.js";
import type { SlackScopesResult } from "../../../slack/scopes.js";

export type ChannelsCapabilitiesOptions = {
    channel?: string;
    account?: string;
    target?: string;
    timeout?: string;
    json?: boolean;
};

export type DiscordTargetSummary = {
    raw?: string;
    normalized?: string;
    kind?: "channel" | "user";
    channelId?: string;
};

export type DiscordPermissionsReport = {
    channelId?: string;
    guildId?: string;
    isDm?: boolean;
    channelType?: number;
    permissions?: string[];
    missingRequired?: string[];
    raw?: string;
    error?: string;
};

export type ChannelCapabilitiesReport = {
    channel: string;
    accountId: string;
    accountName?: string;
    configured?: boolean;
    enabled?: boolean;
    support?: ChannelCapabilities;
    actions?: string[];
    probe?: unknown;
    slackScopes?: Array<{
        tokenType: "bot" | "user";
        result: SlackScopesResult;
    }>;
    target?: DiscordTargetSummary;
    channelPermissions?: DiscordPermissionsReport;
};
