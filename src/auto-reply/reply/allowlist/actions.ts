
import {
    addChannelAllowFromStoreEntry,
    readChannelAllowFromStore,
    removeChannelAllowFromStoreEntry,
} from "../../../pairing/pairing-store.js";
import {
    readConfigFileSnapshot,
    writeConfigFile,
    validateConfigObjectWithPlugins,
} from "../../../config/config.js";
import type { HandleCommandsParams, CommandHandlerResult } from "../commands-types.js";
import { parseAllowlistCommand, normalizeAllowFrom } from "../commands-allowlist.js";

/**
 * Handle /allowlist commands.
 */
export async function handleAllowlistCommand(
    params: HandleCommandsParams,
): Promise<CommandHandlerResult> {
    const cmd = parseAllowlistCommand(params.command.commandBodyNormalized);
    if (!cmd || cmd.action === "error") {
        return {
            reply: { text: cmd?.message || "Uso: /allowlist <add|remove|list> [scope] [channel] [entry]" },
            shouldContinue: false,
        };
    }

    if (!params.command.isAuthorizedSender) {
        return {
            reply: { text: "Permissão negada: apenas administradores podem gerenciar a lista de acessos." },
            shouldContinue: false,
        };
    }

    const channel = (cmd.channel || params.command.channel || "whatsapp").toLowerCase();

    if (cmd.action === "list") {
        const paired = await readChannelAllowFromStore(channel);
        const configAllowFrom = (params.cfg.channels?.[channel] as any)?.allowFrom || [];

        const lines: string[] = [
            `Channel: ${channel}`,
            `DM allowFrom (config): ${normalizeAllowFrom(configAllowFrom).join(", ") || "(vazio)"}`,
            `Paired allowFrom (store): ${paired.join(", ") || "(vazio)"}`,
        ];

        return {
            reply: { text: lines.join("\n") },
            shouldContinue: false,
        };
    }

    if (cmd.action === "add" || cmd.action === "remove") {
        const entry = cmd.entry;
        if (!entry) {
            return {
                reply: { text: `Uso: /allowlist ${cmd.action} dm ${channel} <entry>` },
                shouldContinue: false,
            };
        }

        let configChanged = false;
        if (params.cfg.commands?.config) {
            const snap = await readConfigFileSnapshot();
            if (snap.valid && snap.parsed) {
                const nextCfg = snap.parsed;
                nextCfg.channels = nextCfg.channels || {};
                nextCfg.channels[channel] = nextCfg.channels[channel] || {};
                let allowFrom = normalizeAllowFrom(nextCfg.channels[channel].allowFrom || []);

                if (cmd.action === "add") {
                    if (!allowFrom.includes(entry.toLowerCase())) {
                        allowFrom.push(entry.toLowerCase());
                        configChanged = true;
                    }
                } else {
                    const prevLen = allowFrom.length;
                    allowFrom = allowFrom.filter(v => v !== entry.toLowerCase());
                    if (allowFrom.length !== prevLen) configChanged = true;
                }

                if (configChanged) {
                    nextCfg.channels[channel].allowFrom = allowFrom;
                    const validated = validateConfigObjectWithPlugins(nextCfg);
                    if (validated.ok) {
                        await writeConfigFile(nextCfg);
                    }
                }
            }
        }

        let storeChanged = false;
        if (cmd.action === "add") {
            const res = await addChannelAllowFromStoreEntry({ channel, entry });
            storeChanged = res.changed;
        } else {
            const res = await removeChannelAllowFromStoreEntry({ channel, entry });
            storeChanged = res.changed;
        }

        const actionPast = cmd.action === "add" ? "added" : "removed";
        return {
            reply: {
                text: (configChanged || storeChanged)
                    ? `DM allowlist ${actionPast} for ${channel}: ${entry}`
                    : `Entry ${entry} already exists/not found for ${channel}.`
            },
            shouldContinue: false,
        };
    }

    return {
        reply: { text: "Ação desconhecida." },
        shouldContinue: false,
    };
}
