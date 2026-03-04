
import { z } from "zod";

/**
 * Tool Profile IDs.
 */
export const ToolProfileSchema = z.union([
    z.literal("minimal"),
    z.literal("coding"),
    z.literal("messaging"),
    z.literal("full"),
]);
export type ToolProfileId = z.infer<typeof ToolProfileSchema>;

/**
 * Tool Policy configuration.
 */
export const ToolPolicySchema = z
    .object({
        allow: z.array(z.string()).optional(),
        deny: z.array(z.string()).optional(),
    })
    .strict();
export type ToolPolicyConfig = z.infer<typeof ToolPolicySchema>;
export type GroupToolPolicyConfig = ToolPolicyConfig;


/**
 * Tool Policy with Profile.
 */
export const ToolPolicyWithProfileSchema = ToolPolicySchema.extend({
    profile: ToolProfileSchema.optional(),
}).strict();
export type ToolPolicyWithProfileConfig = z.infer<typeof ToolPolicyWithProfileSchema>;

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
export type MediaUnderstandingScopeMatch = ScopeMatchConfig;
export type SessionSendPolicyMatch = ScopeMatchConfig;

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
export type MediaUnderstandingScopeRule = ScopeRuleConfig;
export type SessionSendPolicyRule = ScopeRuleConfig;

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
export type MediaUnderstandingScopeConfig = ScopeConfig;
export type SessionSendPolicyConfig = ScopeConfig;


/**
 * Media Understanding Capabilities.
 */
export const MediaUnderstandingCapabilitySchema = z.union([
    z.literal("image"),
    z.literal("audio"),
    z.literal("video"),
]);
export type MediaUnderstandingCapability = z.infer<typeof MediaUnderstandingCapabilitySchema>;

/**
 * Media Attachment selection configuration.
 */
export const MediaUnderstandingAttachmentsSchema = z
    .object({
        mode: z.union([z.literal("first"), z.literal("all")]).optional(),
        maxAttachments: z.number().int().positive().optional(),
        prefer: z.union([z.literal("first"), z.literal("last"), z.literal("path"), z.literal("url")]).optional(),
        enabled: z.boolean().optional(),
        maxSize: z.number().int().positive().optional(),
        allowMime: z.array(z.string()).optional(),
    })
    .strict();
export type MediaUnderstandingAttachmentsConfig = z.infer<typeof MediaUnderstandingAttachmentsSchema>;

/**
 * Media Understanding Model configuration.
 */
export const MediaUnderstandingModelSchema = z
    .object({
        provider: z.string().optional(),
        model: z.string().optional(),
        capabilities: z.array(MediaUnderstandingCapabilitySchema).optional(),
        type: z.union([z.literal("provider"), z.literal("cli")]).optional(),
        command: z.string().optional(),
        args: z.array(z.string()).optional(),
        prompt: z.string().optional(),
        maxChars: z.number().int().positive().optional(),
        maxBytes: z.number().int().positive().optional(),
        timeoutSeconds: z.number().int().positive().optional(),
        language: z.string().optional(),
        providerOptions: z.record(z.string(), z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))).optional(),
        deepgram: z.object({
            detectLanguage: z.boolean().optional(),
            punctuate: z.boolean().optional(),
            smartFormat: z.boolean().optional(),
        }).strict().optional(),
        baseUrl: z.string().optional(),
        headers: z.record(z.string(), z.string()).optional(),
        profile: z.string().optional(),
        preferredProfile: z.string().optional(),
    })
    .strict();
export type MediaUnderstandingModelConfig = z.infer<typeof MediaUnderstandingModelSchema>;

/**
 * Media Understanding configuration for a specific kind (image/audio/video).
 */
export const MediaUnderstandingConfigSchema = z
    .object({
        enabled: z.boolean().optional(),
        scope: ScopeConfigSchema.optional(),
        maxBytes: z.number().int().positive().optional(),
        maxChars: z.number().int().positive().optional(),
        prompt: z.string().optional(),
        timeoutSeconds: z.number().int().positive().optional(),
        language: z.string().optional(),
        providerOptions: z.record(z.string(), z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))).optional(),
        deepgram: z.object({
            detectLanguage: z.boolean().optional(),
            punctuate: z.boolean().optional(),
            smartFormat: z.boolean().optional(),
        }).strict().optional(),
        baseUrl: z.string().optional(),
        headers: z.record(z.string(), z.string()).optional(),
        attachments: MediaUnderstandingAttachmentsSchema.optional(),
        models: z.array(MediaUnderstandingModelSchema).optional(),
    })
    .strict();
export type MediaUnderstandingConfig = z.infer<typeof MediaUnderstandingConfigSchema>;

/**
 * Media Tools configuration.
 */
export const MediaToolsSchema = z
    .object({
        models: z.array(MediaUnderstandingModelSchema).optional(),
        concurrency: z.number().int().positive().optional(),
        image: MediaUnderstandingConfigSchema.optional(),
        audio: MediaUnderstandingConfigSchema.optional(),
        video: MediaUnderstandingConfigSchema.optional(),
    })
    .strict();
export type MediaToolsConfig = z.infer<typeof MediaToolsSchema>;

/**
 * Link Processer configuration.
 */
export const LinkModelSchema = z
    .object({
        type: z.literal("cli").optional(),
        command: z.string(),
        args: z.array(z.string()).optional(),
        timeoutSeconds: z.number().int().positive().optional(),
    })
    .strict();
export type LinkModelConfig = z.infer<typeof LinkModelSchema>;

/**
 * Link Tools configuration.
 */
export const LinkToolsSchema = z
    .object({
        enabled: z.boolean().optional(),
        scope: ScopeConfigSchema.optional(),
        maxLinks: z.number().int().positive().optional(),
        timeoutSeconds: z.number().int().positive().optional(),
        models: z.array(LinkModelSchema).optional(),
    })
    .strict();
export type LinkToolsConfig = z.infer<typeof LinkToolsSchema>;

/**
 * Web Search tool configuration.
 */
export const ToolsWebSearchSchema = z
    .object({
        enabled: z.boolean().optional(),
        provider: z.union([z.literal("brave"), z.literal("perplexity")]).optional(),
        apiKey: z.string().optional(),
        maxResults: z.number().int().positive().optional(),
        timeoutSeconds: z.number().int().positive().optional(),
        cacheTtlMinutes: z.number().nonnegative().optional(),
        perplexity: z
            .object({
                apiKey: z.string().optional(),
                baseUrl: z.string().optional(),
                model: z.string().optional(),
            })
            .strict()
            .optional(),
    })
    .strict();
export type ToolsWebSearchConfig = z.infer<typeof ToolsWebSearchSchema>;

/**
 * Web Fetch tool configuration.
 */
export const ToolsWebFetchSchema = z
    .object({
        enabled: z.boolean().optional(),
        maxChars: z.number().int().positive().optional(),
        timeoutSeconds: z.number().int().positive().optional(),
        cacheTtlMinutes: z.number().nonnegative().optional(),
        maxRedirects: z.number().int().nonnegative().optional(),
        userAgent: z.string().optional(),
        readability: z.boolean().optional(),
        firecrawl: z
            .object({
                enabled: z.boolean().optional(),
                apiKey: z.string().optional(),
                baseUrl: z.string().optional(),
                onlyMainContent: z.boolean().optional(),
                maxAgeMs: z.number().int().positive().optional(),
                timeoutSeconds: z.number().int().positive().optional(),
            })
            .strict()
            .optional(),
    })
    .strict();
export type ToolsWebFetchConfig = z.infer<typeof ToolsWebFetchSchema>;

/**
 * Web tools configuration.
 */
export const ToolsWebSchema = z
    .object({
        search: ToolsWebSearchSchema.optional(),
        fetch: ToolsWebFetchSchema.optional(),
    })
    .strict();
export type ToolsWebConfig = z.infer<typeof ToolsWebSchema>;

/**
 * Elevated execution allow-from configuration.
 */
export const ElevatedAllowFromSchema = z.record(
    z.string(),
    z.array(z.union([z.string(), z.number()]))
);
export type AgentElevatedAllowFromConfig = z.infer<typeof ElevatedAllowFromSchema>;

/**
 * Exec tool configuration.
 */
export const ExecToolSchema = z
    .object({
        host: z.enum(["sandbox", "gateway", "node"]).optional(),
        security: z.enum(["deny", "allowlist", "full"]).optional(),
        ask: z.enum(["off", "on-miss", "always"]).optional(),
        node: z.string().optional(),
        pathPrepend: z.array(z.string()).optional(),
        safeBins: z.array(z.string()).optional(),
        backgroundMs: z.number().int().positive().optional(),
        timeoutSec: z.number().int().positive().optional(),
        approvalRunningNoticeMs: z.number().int().nonnegative().optional(),
        cleanupMs: z.number().int().positive().optional(),
        notifyOnExit: z.boolean().optional(),
        applyPatch: z
            .object({
                enabled: z.boolean().optional(),
                allowModels: z.array(z.string()).optional(),
            })
            .strict()
            .optional(),
    })
    .strict();
export type ExecToolConfig = z.infer<typeof ExecToolSchema>;

/**
 * Per-agent tools configuration.
 */
export const AgentToolsSchema = z
    .object({
        profile: ToolProfileSchema.optional(),
        allow: z.array(z.string()).optional(),
        deny: z.array(z.string()).optional(),
        byProvider: z.record(z.string(), ToolPolicyWithProfileSchema).optional(),
        elevated: z
            .object({
                enabled: z.boolean().optional(),
                allowFrom: ElevatedAllowFromSchema.optional(),
            })
            .strict()
            .optional(),
        exec: ExecToolSchema.optional(),
        sandbox: z
            .object({
                tools: ToolPolicySchema.optional(),
            })
            .strict()
            .optional(),
    })
    .strict();
export type AgentToolsConfig = z.infer<typeof AgentToolsSchema>;

/**
 * Global tools configuration.
 */
export const ToolsSchema = z
    .object({
        profile: ToolProfileSchema.optional(),
        allow: z.array(z.string()).optional(),
        deny: z.array(z.string()).optional(),
        byProvider: z.record(z.string(), ToolPolicyWithProfileSchema).optional(),
        web: ToolsWebSchema.optional(),
        media: MediaToolsSchema.optional(),
        links: LinkToolsSchema.optional(),
        message: z
            .object({
                allowCrossContextSend: z.boolean().optional(),
                crossContext: z
                    .object({
                        allowWithinProvider: z.boolean().optional(),
                        allowAcrossProviders: z.boolean().optional(),
                        marker: z
                            .object({
                                enabled: z.boolean().optional(),
                                prefix: z.string().optional(),
                                suffix: z.string().optional(),
                            })
                            .strict()
                            .optional(),
                    })
                    .strict()
                    .optional(),
                broadcast: z
                    .object({
                        enabled: z.boolean().optional(),
                    })
                    .strict()
                    .optional(),
            })
            .strict()
            .optional(),
        agentToAgent: z
            .object({
                enabled: z.boolean().optional(),
                allow: z.array(z.string()).optional(),
            })
            .strict()
            .optional(),
        elevated: z
            .object({
                enabled: z.boolean().optional(),
                allowFrom: ElevatedAllowFromSchema.optional(),
            })
            .strict()
            .optional(),
        exec: ExecToolSchema.optional(),
        subagents: z
            .object({
                model: z.union([
                    z.string(),
                    z.object({
                        primary: z.string().optional(),
                        fallbacks: z.array(z.string()).optional(),
                    }).strict()
                ]).optional(),
                tools: ToolPolicySchema.optional(),
            })
            .strict()
            .optional(),
        sandbox: z
            .object({
                tools: ToolPolicySchema.optional(),
            })
            .strict()
            .optional(),
    })
    .strict();
export type ToolsConfig = z.infer<typeof ToolsSchema>;
