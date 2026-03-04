// @ts-nocheck

import { type ComponentData } from "@buape/carbon";

export function chunkItems<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

export const DISCORD_COMMAND_ARG_CUSTOM_ID_KEY = "cmdarg";

export function encodeDiscordCommandArgValue(value: string): string {
    return Buffer.from(value).toString("base64url");
}

export function decodeDiscordCommandArgValue(value: string): string {
    try {
        return Buffer.from(value, "base64url").toString("utf-8");
    } catch {
        return value;
    }
}

export function isDiscordUnknownInteraction(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const msg = (error as any).message;
    return (
        typeof msg === "string" &&
        (msg.includes("Unknown Interaction") || msg.includes("interaction has already been acknowledged"))
    );
}

export async function safeDiscordInteractionCall<T>(
    label: string,
    fn: () => Promise<T>,
): Promise<T | null> {
    try {
        return await fn();
    } catch (err) {
        if (isDiscordUnknownInteraction(err)) return null;
        throw err;
    }
}

export function buildDiscordCommandArgCustomId(params: {
    command: string;
    arg: string;
    value: string;
    userId: string;
}): string {
    const encodedValue = encodeDiscordCommandArgValue(params.value);
    return `${DISCORD_COMMAND_ARG_CUSTOM_ID_KEY}:${params.command}:${params.arg}:${encodedValue}:${params.userId}`;
}

export function parseDiscordCommandArgData(
    data: ComponentData,
): { command: string; arg: string; value: string; userId: string } | null {
    const customId = data.customId;
    if (!customId?.startsWith(DISCORD_COMMAND_ARG_CUSTOM_ID_KEY)) return null;
    const [, command, arg, encodedValue, userId] = customId.split(":");
    if (!command || !arg || !encodedValue || !userId) return null;
    return {
        command,
        arg,
        value: decodeDiscordCommandArgValue(encodedValue),
        userId,
    };
}
