
import { z } from "zod";

export const ModelCompatSchema = z.union([
    z.literal("openai"),
    z.literal("anthropic"),
    z.literal("google"),
    z.literal("mistral"),
    z.literal("cohere"),
    z.literal("groq"),
    z.literal("unknown"),
]);
export type ModelCompat = z.infer<typeof ModelCompatSchema>;

export const ModelApiSchema = z.union([
    z.literal("openai-completions"),
    z.literal("openai-responses"),
    z.literal("anthropic-messages"),
    z.literal("google-generate-content"),
    z.literal("mistral-chat"),
    z.literal("cohere-chat"),
    z.literal("groq-chat"),
    z.literal("ollama-generate"),
    z.literal("ollama-chat"),
    z.literal("direct-http"),
    z.literal("unknown"),
]);
export type ModelApiKind = z.infer<typeof ModelApiSchema>;

export const ModelThinkingSchema = z
    .object({
        type: z.union([z.literal("token"), z.literal("tag"), z.literal("prefix")]),
        token: z.string().optional(),
        startTag: z.string().optional(),
        endTag: z.string().optional(),
    })
    .strict();

export const ModelCostSchema = z
    .object({
        input: z.number().nonnegative().optional(),
        output: z.number().nonnegative().optional(),
        cacheRead: z.number().nonnegative().optional(),
        cacheWrite: z.number().nonnegative().optional(),
    })
    .strict();

export const ModelInputSchema = z.array(z.string());

export const ModelDefinitionSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        api: ModelApiSchema.optional(),
        thinking: ModelThinkingSchema.optional(),
        reasoning: z.boolean().optional(),
        contextWindow: z.number().positive().optional(),
        maxTokens: z.number().positive().optional(),
        headers: z.record(z.string(), z.string()).optional(),
        compat: ModelCompatSchema.optional(),
        cost: ModelCostSchema.optional(),
        input: ModelInputSchema.optional(),
    })
    .strict();

export type ModelDefinitionConfig = z.infer<typeof ModelDefinitionSchema>;

export const ModelProviderAuthModeSchema = z.union([z.literal("api-key"), z.literal("aws-sdk"), z.literal("oauth"), z.literal("token")]);
export type ModelProviderAuthMode = z.infer<typeof ModelProviderAuthModeSchema>;

export const ModelProviderSchema = z
    .object({
        baseUrl: z.string().min(1),
        apiKey: z.string().optional(),
        api: z.string().optional(),
        auth: ModelProviderAuthModeSchema.optional(),
        models: z.union([
            z.record(z.string(), ModelDefinitionSchema),
            z.array(ModelDefinitionSchema),
        ]).optional(),
        defaultModel: z.string().optional(),
        timeoutMs: z.number().int().min(1000).optional(),
        concurrency: z.number().int().positive().optional(),
    })
    .strict();

export type ModelProviderConfig = z.infer<typeof ModelProviderSchema>;

export const ModelsConfigSchema = z
    .object({
        providers: z.record(z.string(), ModelProviderSchema).optional(),
        definitions: z.record(z.string(), ModelDefinitionSchema).optional(),
    })
    .strict();

export type ModelsConfig = z.infer<typeof ModelsConfigSchema>;
