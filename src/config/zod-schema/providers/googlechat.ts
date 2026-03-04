
import { z } from "zod";
import {
    DmPolicySchema,
    GroupPolicySchema,
    MarkdownConfigSchema,
    BlockStreamingCoalesceSchema,
    DmConfigSchema,
    requireOpenAllowFrom,
} from "../../zod-schema.core.js";
import { ToolPolicySchema } from "../../zod-schema.agent-runtime.js";
import { ChannelHeartbeatVisibilitySchema } from "../../zod-schema.channels.js";

export const GoogleChatAccountSchema = z.object({
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    capabilities: z.array(z.string()).optional(),
    markdown: MarkdownConfigSchema.optional(),
    configWrites: z.boolean().optional(),
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
    groups: z.record(z.string(), z.object({
        requireMention: z.boolean().optional(),
        tools: ToolPolicySchema.optional(),
    }).strict().optional()).optional(),
    heartbeat: ChannelHeartbeatVisibilitySchema.optional(),
}).strict();

export const GoogleChatConfigSchema = GoogleChatAccountSchema.extend({
    accounts: z.record(z.string(), GoogleChatAccountSchema.optional()).optional(),
});
