
import { z } from "zod";
import {
    DmPolicySchema,
    GroupPolicySchema,
    MarkdownConfigSchema,
    BlockStreamingCoalesceSchema,
    DmConfigSchema,
} from "../../zod-schema.core.js";
import { ToolPolicySchema } from "../../zod-schema.agent-runtime.js";
import { ChannelHeartbeatVisibilitySchema } from "../../zod-schema.channels.js";

export const MSTeamsChannelConfigSchema = z.object({
    requireMention: z.boolean().optional(),
    tools: ToolPolicySchema.optional(),
    replyStyle: z.enum(["thread", "top-level"]).optional(),
}).strict();

export const MSTeamsTeamConfigSchema = z.object({
    requireMention: z.boolean().optional(),
    tools: ToolPolicySchema.optional(),
    replyStyle: z.enum(["thread", "top-level"]).optional(),
    channels: z.record(z.string(), MSTeamsChannelConfigSchema.optional()).optional(),
}).strict();

export const MSTeamsAccountSchema = z.object({
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    capabilities: z.array(z.string()).optional(),
    markdown: MarkdownConfigSchema.optional(),
    configWrites: z.boolean().optional(),
    appId: z.string().optional(),
    appPassword: z.string().optional(),
    tenantId: z.string().optional(),
    webhook: z.object({
        port: z.number().optional(),
        path: z.string().optional(),
    }).strict().optional(),
    dmPolicy: DmPolicySchema.optional().default("pairing"),
    allowFrom: z.array(z.string()).optional(),
    groupAllowFrom: z.array(z.string()).optional(),
    groupPolicy: GroupPolicySchema.optional().default("allowlist"),
    historyLimit: z.number().optional(),
    dmHistoryLimit: z.number().optional(),
    dms: z.record(z.string(), DmConfigSchema.optional()).optional(),
    textChunkLimit: z.number().optional(),
    chunkMode: z.enum(["length", "newline"]).optional(),
    blockStreamingCoalesce: BlockStreamingCoalesceSchema.optional(),
    replyStyle: z.enum(["thread", "top-level"]).optional(),
    teams: z.record(z.string(), MSTeamsTeamConfigSchema.optional()).optional(),
    heartbeat: ChannelHeartbeatVisibilitySchema.optional(),
}).strict();

export const MSTeamsConfigSchema = MSTeamsAccountSchema.extend({
    accounts: z.record(z.string(), MSTeamsAccountSchema.optional()).optional(),
});
