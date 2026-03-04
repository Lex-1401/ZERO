
import { z } from "zod";
import { isSafeExecutableValue } from "../infra/exec-safety.js";
import {
  ModelApiSchema,
  ModelCompatSchema,
  ModelDefinitionSchema,
  ModelProviderSchema,
  ModelsConfigSchema,
} from "./schemas/models.js";
import {
  TtsAutoSchema,
  TtsModeSchema,
  TtsProviderSchema,
  TtsConfigSchema,
  TranscribeAudioSchema,
} from "./schemas/tts.js";
import {
  IdentitySchema,
  DmConfigSchema,
} from "./schemas/identity.js";
import {
  QueueModeSchema,
  QueueDropSchema,
  RetryConfigSchema,
  HumanDelaySchema,
  InboundDebounceSchema,
  BlockStreamingCoalesceSchema,
  BlockStreamingChunkSchema,
} from "./schemas/common.js";

export {
  ModelApiSchema, ModelCompatSchema, ModelDefinitionSchema, ModelProviderSchema, ModelsConfigSchema,
  TtsAutoSchema, TtsModeSchema, TtsProviderSchema, TtsConfigSchema, TranscribeAudioSchema,
  IdentitySchema, DmConfigSchema,
  QueueModeSchema, QueueDropSchema, RetryConfigSchema, HumanDelaySchema, InboundDebounceSchema,
  BlockStreamingCoalesceSchema, BlockStreamingChunkSchema,
};

export const CliBackendSchema = z
  .object({
    command: z.string().superRefine((val, ctx) => {
      if (!isSafeExecutableValue(val)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Unsafe executable path" });
    }),
    args: z.array(z.string()).optional(),
    output: z.union([z.literal("json"), z.literal("text"), z.literal("jsonl")]).optional(),
    promptArg: z.string().optional(),
    systemArg: z.string().optional(),
    modelArg: z.string().optional(),
    maxTokensArg: z.string().optional(),
    tempArg: z.string().optional(),
    stopArg: z.string().optional(),
    jsonArg: z.string().optional(),
    streamArg: z.string().optional(),
    imageArg: z.string().optional(),
    imageMode: z.union([z.literal("repeat"), z.literal("list")]).optional(),
    serialize: z.boolean().optional(),
  })
  .passthrough();

export function normalizeAllowFrom(values?: Array<string | number>): string[] {
  if (!values) return [];
  return values.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
}

export function requireOpenAllowFrom(params: {
  policy?: string;
  allowFrom?: Array<string | number>;
  ctx: z.RefinementCtx;
  path: Array<string | number>;
  message: string;
}) {
  if (params.policy !== "open") return;
  const list = normalizeAllowFrom(params.allowFrom);
  if (list.includes("*")) return;
  params.ctx.addIssue({ code: z.ZodIssueCode.custom, path: params.path, message: params.message });
}

export const MSTeamsReplyStyleSchema = z.enum(["thread", "top-level"]);
export const MediaUnderstandingCapabilitiesSchema = z.array(z.union([z.literal("image"), z.literal("audio"), z.literal("video")])).optional();
export const MediaUnderstandingAttachmentsSchema = z
  .object({
    enabled: z.boolean().optional(),
    maxSize: z.number().int().positive().optional(),
    allowMime: z.array(z.string()).optional(),
  })
  .passthrough()
  .optional();

const ProviderOptionValueSchema = z.union([z.string(), z.number(), z.boolean()]);
export const ProviderOptionsSchema = z.record(z.string(), z.record(z.string(), ProviderOptionValueSchema)).optional();

export const DmPolicySchema = z.enum(["pairing", "allowlist", "open", "disabled"]);
export const GroupPolicySchema = z.enum(["open", "disabled", "allowlist"]);
export const MarkdownTableModeSchema = z.enum(["off", "bullets", "code"]);
export const MarkdownConfigSchema = z.object({
  tables: MarkdownTableModeSchema.optional(),
}).passthrough();

export const ChannelHeartbeatVisibilitySchema = z.object({
  showOk: z.boolean().optional(),
  showAlerts: z.boolean().optional(),
  useIndicator: z.boolean().optional(),
}).passthrough();

export const ReplyToModeSchema = z.enum(["off", "first", "all"]);

export const NativeCommandsSettingSchema = z.union([z.boolean(), z.literal("auto")]);

export const ProviderCommandsSchema = z.object({
  native: NativeCommandsSettingSchema.optional(),
  nativeSkills: NativeCommandsSettingSchema.optional(),
  text: z.boolean().optional(),
  bash: z.boolean().optional(),
  bashForegroundMs: z.number().optional(),
  config: z.boolean().optional(),
  debug: z.boolean().optional(),
  restart: z.boolean().optional(),
  useAccessGroups: z.boolean().optional(),
}).passthrough();

export const ToolsLinksSchema = z.object({
  enabled: z.boolean().optional(),
  maxLinks: z.number().int().positive().optional(),
  timeoutSeconds: z.number().int().positive().optional(),
}).passthrough().optional();

export const ToolsMediaSchema = z.object({
  concurrency: z.number().int().positive().optional(),
}).passthrough().optional();

// Re-export unified types from schemas/core-base
export {
  ReplyModeSchema, TypingModeSchema, SessionScopeSchema, DmScopeSchema,
  ScopeMatchSchema, ScopeRuleSchema, ScopeConfigSchema, HexColorSchema
} from "./schemas/core-base.js";
export type {
  ReplyMode, TypingMode, SessionScope, DmScope, ReplyToMode,
  GroupPolicy, DmPolicy, MarkdownTableMode, MarkdownConfig,
  ScopeMatchConfig, ScopeRuleConfig, ScopeConfig,
} from "./schemas/core-base.js";

// Re-export unified types from schemas/common
export type {
  OutboundRetryConfig, HumanDelayConfig,
  BlockStreamingCoalesceConfig, BlockStreamingChunkConfig,
  InboundDebounceConfig,
} from "./schemas/common.js";

// Re-export unified types from schemas
export type { IdentityConfig } from "./schemas/identity.js";
export type { ModelDefinitionConfig, ModelProviderConfig, ModelsConfig } from "./schemas/models.js";
export type { TtsConfig, TtsProvider, TtsMode, TtsAuto, TtsAutoMode } from "./schemas/tts.js";
export type { MemorySearchConfig } from "./schemas/memory.js";

