
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
import { isSafeExecutableValue } from "../../../infra/exec-safety.js";

export const IMessageAccountSchema = z.object({
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
    cliPath: z.string().superRefine((val, ctx) => {
        if (!isSafeExecutableValue(val)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Unsafe executable path" });
        }
    }).optional(),
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

export const IMessageConfigSchema = IMessageAccountSchema.extend({
    accounts: z.record(z.string(), IMessageAccountSchema.optional()).optional(),
});
