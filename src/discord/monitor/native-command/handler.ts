// @ts-nocheck

import {
    ApplicationCommandOptionType,
    ButtonInteraction,
    Command,
    type CommandInteraction,
    type ComponentData,
} from "@buape/carbon";

import {
    findCommandByNativeName,
    listChatCommands,
    parseCommandArgs,
    serializeCommandArgs,
    buildCommandTextFromArgs,
    type ChatCommandDefinition,
    type CommandArgs,
} from "../../../auto-reply/commands-registry.js";
import { type loadConfig } from "../../../config/io.js";
import { type NativeCommandSpec } from "../../../channels/types.js";
import { type DiscordConfig } from "./types.js";
import { safeDiscordInteractionCall, parseDiscordCommandArgData } from "./utils.js";
import { buildDiscordCommandOptions, readDiscordCommandArgs } from "./builder.js";
import { dispatchDiscordCommandInteraction } from "./execution.js";

export async function handleDiscordCommandArgInteraction(
    interaction: ButtonInteraction,
    data: ComponentData,
    ctx: { cfg: ReturnType<typeof loadConfig>; discordConfig: DiscordConfig; accountId: string; sessionPrefix: string }
) {
    const parsed = parseDiscordCommandArgData(data);
    if (!parsed) {
        await safeDiscordInteractionCall("command arg update", () =>
            interaction.update({ content: "Sorry, that selection is no longer available.", components: [] })
        );
        return;
    }
    if (interaction.user?.id && interaction.user.id !== parsed.userId) {
        await safeDiscordInteractionCall("command arg ack", () => interaction.acknowledge());
        return;
    }
    const commandDefinition = findCommandByNativeName(parsed.command, "discord") ??
        listChatCommands().find((entry) => entry.key === parsed.command);

    if (!commandDefinition) {
        await safeDiscordInteractionCall("command arg update", () =>
            interaction.update({ content: "Sorry, that command is no longer available.", components: [] })
        );
        return;
    }
    const updated = await safeDiscordInteractionCall("command arg update", () =>
        interaction.update({ content: `✅ Selected ${parsed.value}.`, components: [] })
    );
    if (!updated) return;
    const commandArgs = { values: { [parsed.arg]: parsed.value } };
    const commandArgsWithRaw: CommandArgs = {
        ...commandArgs,
        raw: serializeCommandArgs(commandDefinition, commandArgs),
    };
    const prompt = buildCommandTextFromArgs(commandDefinition, commandArgsWithRaw);
    await dispatchDiscordCommandInteraction({
        interaction,
        prompt,
        command: commandDefinition,
        commandArgs: commandArgsWithRaw,
        cfg: ctx.cfg,
        discordConfig: ctx.discordConfig,
        accountId: ctx.accountId,
        sessionPrefix: ctx.sessionPrefix,
        preferFollowUp: true,
    });
}

export function createDiscordNativeCommand(params: {
    command: NativeCommandSpec;
    cfg: ReturnType<typeof loadConfig>;
    discordConfig: DiscordConfig;
    accountId: string;
    sessionPrefix: string;
    ephemeralDefault: boolean;
}) {
    const { command, cfg, discordConfig, accountId, sessionPrefix, ephemeralDefault } = params;
    const commandDefinition =
        findCommandByNativeName(command.name, "discord") ??
        ({
            key: command.name,
            nativeName: command.name,
            description: command.description,
            textAliases: [],
            acceptsArgs: command.acceptsArgs,
            args: command.args,
            argsParsing: "none",
            scope: "native",
        } satisfies ChatCommandDefinition);
    const argDefinitions = commandDefinition.args ?? command.args;
    const options = buildDiscordCommandOptions({ command: commandDefinition, cfg }) || (command.acceptsArgs ? ([{
        name: "input",
        description: "Input command",
        type: ApplicationCommandOptionType.String,
        required: false,
    }]) : undefined);

    return new (class extends Command {
        name = command.name;
        description = command.description;
        defer = true;
        ephemeral = ephemeralDefault;
        options = options as any;

        async run(interaction: CommandInteraction) {
            const commandArgs = argDefinitions?.length
                ? readDiscordCommandArgs(interaction, argDefinitions)
                : command.acceptsArgs
                    ? parseCommandArgs(commandDefinition, (interaction.options as any).input ?? "")
                    : undefined;
            const commandArgsWithRaw = commandArgs
                ? ({
                    ...commandArgs,
                    raw: serializeCommandArgs(commandDefinition, commandArgs) ?? commandArgs.raw,
                } satisfies CommandArgs)
                : undefined;
            const prompt = buildCommandTextFromArgs(commandDefinition, commandArgsWithRaw);
            await dispatchDiscordCommandInteraction({
                interaction,
                prompt,
                command: commandDefinition,
                commandArgs: commandArgsWithRaw,
                cfg,
                discordConfig,
                accountId,
                sessionPrefix,
                preferFollowUp: false,
            });
        }
    })();
}
