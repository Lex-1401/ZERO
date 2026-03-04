// @ts-nocheck

import {
    type CommandInteraction,
    type CommandOptions,
} from "@buape/carbon";
import { type ChatCommandDefinition, type CommandArgDefinition } from "../../../auto-reply/commands-registry.js";
import { type loadConfig } from "../../../config/io.js";

export function buildDiscordCommandOptions(params: {
    command: ChatCommandDefinition;
    cfg: ReturnType<typeof loadConfig>;
}): CommandOptions | undefined {
    const { command } = params;
    if (!command.args) return undefined;
    const options: CommandOptions = {};
    for (const arg of command.args) {
        if (arg.type === "string") {
            options[arg.name] = {
                type: "string",
                description: arg.description ?? "Argument for " + arg.name,
                required: arg.required ?? false,
            };
        } else if (arg.type === "number") {
            options[arg.name] = {
                type: "integer",
                description: arg.description ?? "Argument for " + arg.name,
                required: arg.required ?? false,
            };
        } else if (arg.type === "boolean") {
            options[arg.name] = {
                type: "boolean",
                description: arg.description ?? "Argument for " + arg.name,
                required: arg.required ?? false,
            };
        }
    }
    return options;
}

export function readDiscordCommandArgs(
    interaction: CommandInteraction,
    definitions?: CommandArgDefinition[],
): Record<string, any> | undefined {
    if (!definitions) return undefined;
    const args: Record<string, any> = {};
    for (const def of definitions) {
        const value = interaction.options[def.name];
        if (value !== undefined) {
            args[def.name] = value;
        }
    }
    return Object.keys(args).length > 0 ? args : undefined;
}
