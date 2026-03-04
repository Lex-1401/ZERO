
import type { ChannelCapabilities } from "../../../channels/plugins/types.js";
import { theme } from "../../../terminal/theme.js";

export const REQUIRED_DISCORD_PERMISSIONS = ["ViewChannel", "SendMessages"] as const;

export const TEAMS_GRAPH_PERMISSION_HINTS: Record<string, string> = {
    "ChannelMessage.Read.All": "channel history",
    "Chat.Read.All": "chat history",
    "Channel.ReadBasic.All": "channel list",
    "Team.ReadBasic.All": "team list",
    "TeamsActivity.Read.All": "teams activity",
    "Sites.Read.All": "files (SharePoint)",
    "Files.Read.All": "files (OneDrive)",
};

export function formatSupport(capabilities?: ChannelCapabilities) {
    if (!capabilities) return "desconhecido";
    const bits: string[] = [];
    if (capabilities.chatTypes?.length) {
        bits.push(`chatTypes=${capabilities.chatTypes.join(",")}`);
    }
    if (capabilities.polls) bits.push("polls");
    if (capabilities.reactions) bits.push("reactions");
    if (capabilities.edit) bits.push("edit");
    if (capabilities.unsend) bits.push("unsend");
    if (capabilities.reply) bits.push("reply");
    if (capabilities.effects) bits.push("effects");
    if (capabilities.groupManagement) bits.push("groupManagement");
    if (capabilities.threads) bits.push("threads");
    if (capabilities.media) bits.push("media");
    if (capabilities.nativeCommands) bits.push("nativeCommands");
    if (capabilities.blockStreaming) bits.push("blockStreaming");
    return bits.length ? bits.join(" ") : "nenhum";
}

export function formatDiscordIntents(intents?: {
    messageContent?: string;
    guildMembers?: string;
    presence?: string;
}) {
    if (!intents) return "desconhecido";
    return [
        `messageContent=${intents.messageContent ?? "desconhecido"}`,
        `guildMembers=${intents.guildMembers ?? "desconhecido"}`,
        `presence=${intents.presence ?? "desconhecido"}`,
    ].join(" ");
}

export function formatProbeLines(channelId: string, probe: unknown): string[] {
    const lines: string[] = [];
    if (!probe || typeof probe !== "object") return lines;
    const probeObj = probe as Record<string, unknown>;

    if (channelId === "discord") {
        const bot = probeObj.bot as { id?: string | null; username?: string | null } | undefined;
        if (bot?.username) {
            const botId = bot.id ? ` (${bot.id})` : "";
            lines.push(`Bot: ${theme.accent(`@${bot.username}`)}${botId}`);
        }
        const app = probeObj.application as { intents?: Record<string, unknown> } | undefined;
        if (app?.intents) {
            lines.push(`Intents: ${formatDiscordIntents(app.intents as any)}`);
        }
    }

    if (channelId === "telegram") {
        const bot = probeObj.bot as { username?: string | null; id?: number | null } | undefined;
        if (bot?.username) {
            const botId = bot.id ? ` (${bot.id})` : "";
            lines.push(`Bot: ${theme.accent(`@${bot.username}`)}${botId}`);
        }
        const flags: string[] = [];
        const canJoinGroups = (bot as { canJoinGroups?: boolean | null })?.canJoinGroups;
        const canReadAll = (bot as { canReadAllGroupMessages?: boolean | null })?.canReadAllGroupMessages;
        const inlineQueries = (bot as { supportsInlineQueries?: boolean | null })?.supportsInlineQueries;
        if (typeof canJoinGroups === "boolean") flags.push(`joinGroups=${canJoinGroups}`);
        if (typeof canReadAll === "boolean") flags.push(`readAllGroupMessages=${canReadAll}`);
        if (typeof inlineQueries === "boolean") flags.push(`inlineQueries=${inlineQueries}`);
        if (flags.length > 0) lines.push(`Flags: ${flags.join(" ")}`);
        const webhook = probeObj.webhook as { url?: string | null } | undefined;
        if (webhook?.url !== undefined) {
            lines.push(`Webhook: ${webhook.url || "nenhum"}`);
        }
    }

    if (channelId === "slack") {
        const bot = probeObj.bot as { name?: string } | undefined;
        const team = probeObj.team as { name?: string; id?: string } | undefined;
        if (bot?.name) lines.push(`Bot: ${theme.accent(`@${bot.name}`)}`);
        if (team?.name || team?.id) {
            const id = team?.id ? ` (${team.id})` : "";
            lines.push(`Time: ${team?.name ?? "desconhecido"}${id}`);
        }
    }

    if (channelId === "signal") {
        const version = probeObj.version as string | null | undefined;
        if (version) lines.push(`Daemon do Signal: ${version}`);
    }

    if (channelId === "msteams") {
        const appId = typeof probeObj.appId === "string" ? probeObj.appId.trim() : "";
        if (appId) lines.push(`App: ${theme.accent(appId)}`);
        const graph = probeObj.graph as { ok?: boolean; roles?: unknown; scopes?: unknown; error?: string } | undefined;
        if (graph) {
            const roles = Array.isArray(graph.roles) ? graph.roles.map((r) => String(r).trim()).filter(Boolean) : [];
            const scopes = typeof graph.scopes === "string" ? graph.scopes.split(/\s+/).map((s) => s.trim()).filter(Boolean) : Array.isArray(graph.scopes) ? graph.scopes.map((s) => String(s).trim()).filter(Boolean) : [];
            if (graph.ok === false) {
                lines.push(`Graph: ${theme.error(graph.error ?? "falhou")}`);
            } else if (roles.length > 0 || scopes.length > 0) {
                const formatPermission = (permission: string) => {
                    const hint = TEAMS_GRAPH_PERMISSION_HINTS[permission];
                    return hint ? `${permission} (${hint})` : permission;
                };
                if (roles.length > 0) lines.push(`Graph roles: ${roles.map(formatPermission).join(", ")}`);
                if (scopes.length > 0) lines.push(`Graph scopes: ${scopes.map(formatPermission).join(", ")}`);
            } else if (graph.ok === true) {
                lines.push("Graph: ok");
            }
        }
    }

    const ok = typeof probeObj.ok === "boolean" ? probeObj.ok : undefined;
    if (ok === true && lines.length === 0) lines.push("Sondagem: ok");
    if (ok === false) {
        const error = typeof probeObj.error === "string" && probeObj.error ? ` (${probeObj.error})` : "";
        lines.push(`Sondagem: ${theme.error(`falhou${error}`)}`);
    }
    return lines;
}
