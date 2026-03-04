
import { z } from "zod";
import {
    MarkdownConfigSchema,
    ProviderCommandsSchema,
    DmPolicySchema,
    ReplyToModeSchema,
    GroupPolicySchema,
    DmConfigSchema,
    RetryConfigSchema,
    requireOpenAllowFrom,
    ChannelHeartbeatVisibilitySchema
} from "../../zod-schema.core.js";
import { ToolPolicySchema } from "../../zod-schema.agent-runtime.js";
import {
    normalizeTelegramCommandDescription,
    normalizeTelegramCommandName,
    TELEGRAM_COMMAND_NAME_PATTERN,
} from "../../telegram-custom-commands.js";

const TelegramInlineButtonsScopeSchema = z.enum(["off", "dm", "group", "all", "allowlist"]);

const TelegramCapabilitiesSchema = z.union([
    z.array(z.string()),
    z.object({
        inlineButtons: TelegramInlineButtonsScopeSchema.optional(),
    }).strict(),
]);

export const TelegramTopicSchema = z.object({
    requireMention: z.boolean().optional(),
    skills: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
    allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    systemPrompt: z.string().optional(),
}).strict();

export const TelegramGroupSchema = z.object({
    requireMention: z.boolean().optional(),
    tools: ToolPolicySchema.optional(),
    skills: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
    allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    systemPrompt: z.string().optional(),
    topics: z.record(z.string(), TelegramTopicSchema.optional()).optional(),
}).strict();

export const TelegramCustomCommandSchema = z.object({
    command: z.string().transform(normalizeTelegramCommandName).refine(
        (val) => TELEGRAM_COMMAND_NAME_PATTERN.test(val),
        { message: "Invalid command name" }
    ),
    description: z.string().transform(normalizeTelegramCommandDescription),
}).strict();

const TelegramAccountSchemaBase = z.object({
    name: z.string().optional(),
    capabilities: TelegramCapabilitiesSchema.optional(),
    markdown: MarkdownConfigSchema.optional(),
    enabled: z.boolean().optional(),
    commands: ProviderCommandsSchema.optional(),
    customCommands: z.array(TelegramCustomCommandSchema).optional(),
    configWrites: z.boolean().optional(),
    dmPolicy: DmPolicySchema.optional().default("pairing"),
    botToken: z.string().optional(),
    tokenFile: z.string().optional(),
    replyToMode: ReplyToModeSchema.optional(),
    groups: z.record(z.string(), TelegramGroupSchema.optional()).optional(),
    allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    groupAllowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    groupPolicy: GroupPolicySchema.optional().default("allowlist"),
    historyLimit: z.number().int().min(0).optional(),
    dmHistoryLimit: z.number().int().min(0).optional(),
    dms: z.record(z.string(), DmConfigSchema.optional()).optional(),
    textChunkLimit: z.number().int().min(0).optional(),
    chunkMode: z.enum(["length", "newline"]).optional(),
    blockStreaming: z.boolean().optional(),
    streamMode: z.enum(["off", "partial", "block"]).optional().default("partial"),
    mediaMaxMb: z.number().positive().optional(),
    timeoutSeconds: z.number().positive().optional(),
    retry: RetryConfigSchema.optional(),
    proxy: z.string().optional(),
    webhookUrl: z.string().optional(),
    webhookSecret: z.string().optional(),
    webhookPath: z.string().optional(),
    heartbeat: ChannelHeartbeatVisibilitySchema.optional(),
    linkPreview: z.boolean().optional(),
}).strict();

export const TelegramAccountSchema = TelegramAccountSchemaBase.superRefine((val: any, ctx: any) => {
    if (val.dmPolicy !== "open") return;
    requireOpenAllowFrom({
        policy: val.dmPolicy,
        allowFrom: val.allowFrom,
        ctx,
        path: ["allowFrom"],
        message: 'channels.telegram.accounts.*.dmPolicy="open" requires allowFrom to include "*"',
    });
});


export const TelegramConfigSchema = TelegramAccountSchema.extend({
    accounts: z.record(z.string(), TelegramAccountSchema.optional()).optional(),
}).superRefine((val, ctx) => {
    if (val.dmPolicy !== "open") return;
    requireOpenAllowFrom({
        policy: val.dmPolicy,
        allowFrom: val.allowFrom,
        ctx,
        path: ["allowFrom"],
        message: 'channels.telegram.dmPolicy="open" requires allowFrom to include "*"',
    });
});

