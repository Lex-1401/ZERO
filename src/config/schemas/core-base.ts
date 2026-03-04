
import { z } from "zod";

export const ReplyModeSchema = z.enum(["text", "command"]);
export type ReplyMode = z.infer<typeof ReplyModeSchema>;

export const HexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a valid hex color string (3 or 6 characters)");

export const TypingModeSchema = z.enum(["never", "instant", "thinking", "message"]);
export type TypingMode = z.infer<typeof TypingModeSchema>;

export const SessionScopeSchema = z.enum(["per-sender", "global"]);
export type SessionScope = z.infer<typeof SessionScopeSchema>;

export const DmScopeSchema = z.enum(["main", "per-peer", "per-channel-peer"]);
export type DmScope = z.infer<typeof DmScopeSchema>;

export const ReplyToModeSchema = z.enum(["off", "first", "all"]);
export type ReplyToMode = z.infer<typeof ReplyToModeSchema>;

export const GroupPolicySchema = z.enum(["open", "disabled", "allowlist"]);
export type GroupPolicy = z.infer<typeof GroupPolicySchema>;

export const DmPolicySchema = z.enum(["pairing", "allowlist", "open", "disabled"]);
export type DmPolicy = z.infer<typeof DmPolicySchema>;

export const MarkdownTableModeSchema = z.enum(["off", "bullets", "code"]);
export type MarkdownTableMode = z.infer<typeof MarkdownTableModeSchema>;

export const MarkdownConfigSchema = z
    .object({
        tables: MarkdownTableModeSchema.optional(),
    })
    .strict();
export type MarkdownConfig = z.infer<typeof MarkdownConfigSchema>;

export const NativeCommandsSettingSchema = z.union([z.boolean(), z.literal("auto")]);
export type NativeCommandsSetting = z.infer<typeof NativeCommandsSettingSchema>;

/**
 * Scope Match configuration for media/links/sessions.
 */
export const ScopeMatchSchema = z
    .object({
        channel: z.string().optional(),
        chatType: z.union([z.literal("direct"), z.literal("group"), z.literal("channel")]).optional(),
        keyPrefix: z.string().optional(),
    })
    .strict();
export type ScopeMatchConfig = z.infer<typeof ScopeMatchSchema>;

/**
 * Scope Rule for understanding/policies.
 */
export const ScopeRuleSchema = z
    .object({
        action: z.union([z.literal("allow"), z.literal("deny")]),
        match: ScopeMatchSchema.optional(),
    })
    .strict();
export type ScopeRuleConfig = z.infer<typeof ScopeRuleSchema>;

/**
 * Scope Gating configuration.
 */
export const ScopeConfigSchema = z
    .object({
        default: z.union([z.literal("allow"), z.literal("deny")]).optional(),
        rules: z.array(ScopeRuleSchema).optional(),
    })
    .strict();
export type ScopeConfig = z.infer<typeof ScopeConfigSchema>;
