
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

export const SignalAccountConfigSchema = z.object({
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    capabilities: z.array(z.string()).optional(),
    markdown: MarkdownConfigSchema.optional(),
    configWrites: z.boolean().optional(),
    account: z.string().optional(),
    httpUrl: z.string().optional(),
    httpHost: z.string().optional(),
    httpPort: z.number().optional(),
    cliPath: z.string().optional(),
    autoStart: z.boolean().optional(),
    startupTimeoutMs: z.number().optional(),
    receiveMode: z.enum(["on-start", "manual"]).optional(),
    dmPolicy: DmPolicySchema.optional().default("pairing"),
    allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    groupAllowFrom: z.array(z.union([z.string(), z.number()])).optional(),
    groupPolicy: GroupPolicySchema.optional().default("allowlist"),
    historyLimit: z.number().optional(),
    dmHistoryLimit: z.number().optional(),
    dms: z.record(z.string(), DmConfigSchema.optional()).optional(),
    textChunkLimit: z.number().optional(),
    chunkMode: z.enum(["length", "newline"]).optional(),
    blockStreamingCoalesce: BlockStreamingCoalesceSchema.optional(),
    reactionNotifications: z.enum(["off", "own", "all", "allowlist"]).optional(),
    reactionLevel: z.enum(["off", "ack", "minimal", "extensive"]).optional(),
    groups: z.record(z.string(), z.object({
        requireMention: z.boolean().optional(),
        tools: ToolPolicySchema.optional(),
    }).strict().optional()).optional(),
    heartbeat: ChannelHeartbeatVisibilitySchema.optional(),
}).strict().superRefine((val: any, ctx: any) => {
    if (val.dmPolicy === "open" && !val.allowFrom?.includes("*")) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["allowFrom"],
            message: 'dmPolicy "open" requires allowFrom to include "*"',
        });
    }
});

export const SignalConfigSchema = SignalAccountConfigSchema.extend({
    accounts: z.record(z.string(), SignalAccountConfigSchema.optional()).optional(),
});
