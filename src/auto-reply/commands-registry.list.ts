
import { COMMAND_ARG_FORMATTERS } from "./commands-args.js";
import { listThinkingLevels } from "./thinking.js";
import type { ChatCommandDefinition, CommandScope } from "./commands-registry.types.js";

type DefineChatCommandInput = {
    key: string;
    nativeName?: string;
    description: string;
    args?: ChatCommandDefinition["args"];
    argsParsing?: ChatCommandDefinition["argsParsing"];
    formatArgs?: ChatCommandDefinition["formatArgs"];
    argsMenu?: ChatCommandDefinition["argsMenu"];
    acceptsArgs?: boolean;
    textAlias?: string;
    textAliases?: string[];
    scope?: CommandScope;
};

export function defineChatCommand(command: DefineChatCommandInput): ChatCommandDefinition {
    const aliases = (command.textAliases ?? (command.textAlias ? [command.textAlias] : []))
        .map((alias) => alias.trim())
        .filter(Boolean);
    const scope =
        command.scope ?? (command.nativeName ? (aliases.length ? "both" : "native") : "text");
    const acceptsArgs = command.acceptsArgs ?? Boolean(command.args?.length);
    const argsParsing = command.argsParsing ?? (command.args?.length ? "positional" : "none");
    return {
        key: command.key,
        nativeName: command.nativeName,
        description: command.description,
        acceptsArgs,
        args: command.args,
        argsParsing,
        formatArgs: command.formatArgs,
        argsMenu: command.argsMenu,
        textAliases: aliases,
        scope,
    };
}

export function buildCoreCommands(): ChatCommandDefinition[] {
    return [
        defineChatCommand({
            key: "help",
            nativeName: "help",
            description: "Show available commands.",
            textAlias: "/help",
        }),
        defineChatCommand({
            key: "commands",
            nativeName: "commands",
            description: "List all slash commands.",
            textAlias: "/commands",
        }),
        defineChatCommand({
            key: "skill",
            nativeName: "skill",
            description: "Run a skill by name.",
            textAlias: "/skill",
            args: [
                {
                    name: "name",
                    description: "Skill name",
                    type: "string",
                    required: true,
                },
                {
                    name: "input",
                    description: "Skill input",
                    type: "string",
                    captureRemaining: true,
                },
            ],
        }),
        defineChatCommand({
            key: "status",
            nativeName: "status",
            description: "Show current status.",
            textAlias: "/status",
        }),
        defineChatCommand({
            key: "allowlist",
            description: "List/add/remove allowlist entries.",
            textAlias: "/allowlist",
            acceptsArgs: true,
            scope: "text",
        }),
        defineChatCommand({
            key: "approve",
            nativeName: "approve",
            description: "Approve or deny exec requests.",
            textAlias: "/approve",
            acceptsArgs: true,
        }),
        defineChatCommand({
            key: "context",
            nativeName: "context",
            description: "Explain how context is built and used.",
            textAlias: "/context",
            acceptsArgs: true,
        }),
        defineChatCommand({
            key: "tts",
            nativeName: "tts",
            description: "Configure text-to-speech.",
            textAlias: "/tts",
            acceptsArgs: true,
        }),
        defineChatCommand({
            key: "whoami",
            nativeName: "whoami",
            description: "Show your sender id.",
            textAlias: "/whoami",
        }),
        defineChatCommand({
            key: "subagents",
            nativeName: "subagents",
            description: "List/stop/log/info subagent runs for this session.",
            textAlias: "/subagents",
            args: [
                {
                    name: "action",
                    description: "list | stop | log | info | send",
                    type: "string",
                    choices: ["list", "stop", "log", "info", "send"],
                },
                {
                    name: "target",
                    description: "Run id, index, or session key",
                    type: "string",
                },
                {
                    name: "value",
                    description: "Additional input (limit/message)",
                    type: "string",
                    captureRemaining: true,
                },
            ],
            argsMenu: "auto",
        }),
        defineChatCommand({
            key: "config",
            nativeName: "config",
            description: "Show or set config values.",
            textAlias: "/config",
            args: [
                {
                    name: "action",
                    description: "show | get | set | unset",
                    type: "string",
                    choices: ["show", "get", "set", "unset"],
                },
                {
                    name: "path",
                    description: "Config path",
                    type: "string",
                },
                {
                    name: "value",
                    description: "Value for set",
                    type: "string",
                    captureRemaining: true,
                },
            ],
            argsParsing: "none",
            formatArgs: COMMAND_ARG_FORMATTERS.config,
        }),
        defineChatCommand({
            key: "debug",
            nativeName: "debug",
            description: "Set runtime debug overrides.",
            textAlias: "/debug",
            args: [
                {
                    name: "action",
                    description: "show | reset | set | unset",
                    type: "string",
                    choices: ["show", "reset", "set", "unset"],
                },
                {
                    name: "path",
                    description: "Debug path",
                    type: "string",
                },
                {
                    name: "value",
                    description: "Value for set",
                    type: "string",
                    captureRemaining: true,
                },
            ],
            argsParsing: "none",
            formatArgs: COMMAND_ARG_FORMATTERS.debug,
        }),
        defineChatCommand({
            key: "usage",
            nativeName: "usage",
            description: "Usage footer or cost summary.",
            textAlias: "/usage",
            args: [
                {
                    name: "mode",
                    description: "off, tokens, full, or cost",
                    type: "string",
                    choices: ["off", "tokens", "full", "cost"],
                },
            ],
            argsMenu: "auto",
        }),
        defineChatCommand({
            key: "stop",
            nativeName: "stop",
            description: "Stop the current run.",
            textAlias: "/stop",
        }),
        defineChatCommand({
            key: "restart",
            nativeName: "restart",
            description: "Restart ZERO.",
            textAlias: "/restart",
        }),
        defineChatCommand({
            key: "activation",
            nativeName: "activation",
            description: "Set group activation mode.",
            textAlias: "/activation",
            args: [
                {
                    name: "mode",
                    description: "mention or always",
                    type: "string",
                    choices: ["mention", "always"],
                },
            ],
            argsMenu: "auto",
        }),
        defineChatCommand({
            key: "send",
            nativeName: "send",
            description: "Set send policy.",
            textAlias: "/send",
            args: [
                {
                    name: "mode",
                    description: "on, off, or inherit",
                    type: "string",
                    choices: ["on", "off", "inherit"],
                },
            ],
            argsMenu: "auto",
        }),
        defineChatCommand({
            key: "reset",
            nativeName: "reset",
            description: "Reset the current session.",
            textAlias: "/reset",
            acceptsArgs: true,
        }),
        defineChatCommand({
            key: "new",
            nativeName: "new",
            description: "Start a new session.",
            textAlias: "/new",
            acceptsArgs: true,
        }),
        defineChatCommand({
            key: "think",
            nativeName: "think",
            description: "Set thinking level.",
            textAlias: "/think",
            args: [
                {
                    name: "level",
                    description: "off, minimal, low, medium, high, xhigh",
                    type: "string",
                    choices: ({ provider, model }) => listThinkingLevels(provider, model),
                },
            ],
            argsMenu: "auto",
        }),
        defineChatCommand({
            key: "verbose",
            nativeName: "verbose",
            description: "Toggle verbose mode.",
            textAlias: "/verbose",
            args: [
                {
                    name: "mode",
                    description: "on or off",
                    type: "string",
                    choices: ["on", "off"],
                },
            ],
            argsMenu: "auto",
        }),
        defineChatCommand({
            key: "reasoning",
            nativeName: "reasoning",
            description: "Toggle reasoning visibility.",
            textAlias: "/reasoning",
            args: [
                {
                    name: "mode",
                    description: "on, off, or stream",
                    type: "string",
                    choices: ["on", "off", "stream"],
                },
            ],
            argsMenu: "auto",
        }),
        defineChatCommand({
            key: "elevated",
            nativeName: "elevated",
            description: "Toggle elevated mode.",
            textAlias: "/elevated",
            args: [
                {
                    name: "mode",
                    description: "on, off, ask, or full",
                    type: "string",
                    choices: ["on", "off", "ask", "full"],
                },
            ],
            argsMenu: "auto",
        }),
        defineChatCommand({
            key: "exec",
            nativeName: "exec",
            description: "Set exec defaults for this session.",
            textAlias: "/exec",
            args: [
                {
                    name: "options",
                    description: "host=... security=... ask=... node=...",
                    type: "string",
                },
            ],
            argsParsing: "none",
        }),
        defineChatCommand({
            key: "model",
            nativeName: "model",
            description: "Show or set the model.",
            textAlias: "/model",
            args: [
                {
                    name: "model",
                    description: "Model id (provider/model or id)",
                    type: "string",
                },
            ],
        }),
        defineChatCommand({
            key: "models",
            nativeName: "models",
            description: "List model providers or provider models.",
            textAlias: "/models",
            argsParsing: "none",
            acceptsArgs: true,
        }),
        defineChatCommand({
            key: "compact",
            description: "Compact the session context.",
            textAlias: "/compact",
            scope: "text",
            args: [
                {
                    name: "instructions",
                    description: "Extra compaction instructions",
                    type: "string",
                    captureRemaining: true,
                },
            ],
        }),
        defineChatCommand({
            key: "queue",
            nativeName: "queue",
            description: "Adjust queue settings.",
            textAlias: "/queue",
            args: [
                {
                    name: "mode",
                    description: "queue mode",
                    type: "string",
                    choices: ["steer", "interrupt", "followup", "collect", "steer-backlog"],
                },
                {
                    name: "debounce",
                    description: "debounce duration (e.g. 500ms, 2s)",
                    type: "string",
                },
                {
                    name: "cap",
                    description: "queue cap",
                    type: "number",
                },
                {
                    name: "drop",
                    description: "drop policy",
                    type: "string",
                    choices: ["old", "new", "summarize"],
                },
            ],
            argsParsing: "none",
            formatArgs: COMMAND_ARG_FORMATTERS.queue,
        }),
        defineChatCommand({
            key: "bash",
            description: "Run host shell commands (host-only).",
            textAlias: "/bash",
            scope: "text",
            args: [
                {
                    name: "command",
                    description: "Shell command",
                    type: "string",
                    captureRemaining: true,
                },
            ],
        }),
    ];
}
