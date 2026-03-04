
import { z } from "zod";
import {
    MarkdownConfigSchema,
    ProviderCommandsSchema,
    DmPolicySchema,
    GroupPolicySchema,
    DmConfigSchema,
    RetryConfigSchema,
    ChannelHeartbeatVisibilitySchema,
    requireOpenAllowFrom
} from "../../zod-schema.core.js";
import { ToolPolicySchema } from "../../zod-schema.agent-runtime.js";

export const DiscordDmSchema = z.object({
    enabled: z.boolean().optional(),
    policy: DmPolicySchema.optional().default("pairing"),
    allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    groupEnabled: z.boolean().optional(),
    groupChannels: z.array(z.string()).optional(),
}).strict().superRefine((val, ctx) => {
    if (val.policy !== "open") return;
    requireOpenAllowFrom({
        policy: val.policy,
        allowFrom: val.allowFrom,
        ctx,
        path: ["allowFrom"],
        message: 'channels.discord.dm.policy="open" requires allowFrom to include "*"',
    });
});

export const DiscordGuildChannelSchema = z.object({
    allow: z.boolean().optional(),
    requireMention: z.boolean().optional(),
    tools: ToolPolicySchema.optional(),
    enabled: z.boolean().optional(),
    users: z.array(z.union([z.string(), z.number()])).optional(),
    systemPrompt: z.string().optional(),
}).strict();

export const DiscordGuildSchema = z.object({
    slug: z.string().optional(),
    requireMention: z.boolean().optional(),
    tools: ToolPolicySchema.optional(),
    users: z.array(z.union([z.string(), z.number()])).optional(),
    channels: z.record(z.string(), DiscordGuildChannelSchema.optional()).optional(),
}).strict();

export const DiscordAccountSchema = z.object({
    name: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
    markdown: MarkdownConfigSchema.optional(),
    enabled: z.boolean().optional(),
    commands: ProviderCommandsSchema.optional(),
    token: z.string().optional(),
    groupPolicy: GroupPolicySchema.optional().default("allowlist"),
    historyLimit: z.number().int().min(0).optional(),
    dmHistoryLimit: z.number().int().min(0).optional(),
    dms: z.record(z.string(), DmConfigSchema.optional()).optional(),
    blockStreaming: z.boolean().optional(),
    textChunkLimit: z.number().int().positive().optional(),
    chunkMode: z.enum(["length", "newline"]).optional(),
    maxLinesPerMessage: z.number().int().positive().optional(),
    retry: RetryConfigSchema.optional(),
    dm: DiscordDmSchema.optional(),
    guilds: z.record(z.string(), DiscordGuildSchema.optional()).optional(),
    actions: z.object({
        emojiUploads: z.boolean().optional(),
        stickerUploads: z.boolean().optional(),
        channels: z.boolean().optional(),
        reactions: z.boolean().optional(),
        sendMessage: z.boolean().optional(),
    }).passthrough().optional(),
    heartbeat: ChannelHeartbeatVisibilitySchema.optional(),
}).strict();

export const DiscordConfigSchema = DiscordAccountSchema.extend({
    accounts: z.record(z.string(), DiscordAccountSchema.optional()).optional(),
});

