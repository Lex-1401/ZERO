/**
 * Discord Native Command Execution
 *
 * Handles dispatching and delivering Discord command/button interactions.
 * Delegated from discord/monitor/native-command.ts for Atomic Modularity.
 *
 * @module discord/monitor/native-command/execution
 */

import {
    ChannelType,
    type ButtonInteraction,
    type CommandInteraction,
} from "@buape/carbon";

import {
    normalizeDiscordSlug,
} from "../allow-list.js";
import { type loadConfig } from "../../../config/io.js";
import { type ChatCommandDefinition, type CommandArgs } from "../../../auto-reply/commands-registry.js";
import { type DiscordConfig } from "./types.js";
import { safeDiscordInteractionCall } from "./utils.js";

export async function dispatchDiscordCommandInteraction(params: {
    interaction: CommandInteraction | ButtonInteraction;
    prompt: string;
    command: ChatCommandDefinition;
    commandArgs?: CommandArgs;
    cfg: ReturnType<typeof loadConfig>;
    discordConfig: DiscordConfig;
    accountId: string;
    sessionPrefix: string;
    preferFollowUp: boolean;
}) {
    const {
        interaction,
        cfg,
        preferFollowUp,
    } = params;
    const _respond = async (content: string, options?: { ephemeral?: boolean }) => {
        const payload = {
            content,
            ...(options?.ephemeral !== undefined ? { ephemeral: options.ephemeral } : {}),
        };
        await safeDiscordInteractionCall("interaction reply", async () => {
            if (preferFollowUp) {
                await interaction.followUp(payload);
                return;
            }
            await (interaction as any).reply(payload);
        });
    };

    const _useAccessGroups = cfg.commands?.useAccessGroups !== false;
    const user = interaction.user;
    if (!user) return;
    const channel = (interaction as any).channel;
    const channelType = channel?.type;
    const _isDirectMessage = channelType === ChannelType.DM;
    const _isGroupDm = channelType === ChannelType.GroupDM;
    const _isThreadChannel =
        channelType === ChannelType.PublicThread ||
        channelType === ChannelType.PrivateThread ||
        channelType === ChannelType.AnnouncementThread;
    const channelName = channel && "name" in channel ? (channel.name as string) : undefined;
    const _channelSlug = channelName ? normalizeDiscordSlug(channelName) : "";
    const _rawChannelId = channel?.id ?? "";

    // TODO: Implementar lógica de execução completa
}

export async function deliverDiscordInteractionReply(_params: {
    interaction: CommandInteraction | ButtonInteraction;
    payload: { text?: string };
    textLimit: number;
    maxLinesPerMessage?: number;
    preferFollowUp: boolean;
    chunkMode: "length" | "newline";
}) {
    // TODO: Implementar entrega de reply
}
