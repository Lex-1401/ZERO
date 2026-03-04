// @ts-nocheck

import { Button, ButtonStyle, Row } from "@buape/carbon";
import { type ChatCommandDefinition } from "../../../auto-reply/commands-registry.js";
import { buildDiscordCommandArgCustomId, chunkItems } from "./utils.js";

export class DiscordCommandArgButton extends Button {
    constructor(params: {
        label: string;
        command: string;
        arg: string;
        value: string;
        userId: string;
    }) {
        super();
        this.label = params.label;
        this.customId = buildDiscordCommandArgCustomId(params);
        this.style = ButtonStyle.Secondary;
    }
}

export function buildDiscordCommandArgMenu(params: {
    command: ChatCommandDefinition;
    menu: { arg: any; choices: string[]; title?: string };
    userId: string;
}): { content: string; components: Row<Button>[] } {
    const { command, menu, userId } = params;
    const buttons = menu.choices.map((choice) => new DiscordCommandArgButton({
        label: choice,
        command: command.id,
        arg: menu.arg.name,
        value: choice,
        userId,
    }));
    const rows = chunkItems(buttons, 5).map((chunk) => {
        const row = new Row<Button>();
        row.components = chunk;
        return row;
    });
    return { content: menu.title ?? `Selecione um valor para ${menu.arg.name}:`, components: rows };
}
