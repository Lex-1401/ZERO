
import { z } from "zod";

export const MemorySearchSchema = z
    .object({
        enabled: z.boolean().optional(),
        sources: z.array(z.union([z.literal("memory"), z.literal("sessions")])).optional(),
        experimental: z
            .object({
                sessionMemory: z.boolean().optional(),
            })
            .strict()
            .optional(),
        provider: z.union([z.literal("openai"), z.literal("local"), z.literal("gemini")]).optional(),
        remote: z
            .object({
                baseUrl: z.string().optional(),
                apiKey: z.string().optional(),
                headers: z.record(z.string(), z.string()).optional(),
                batch: z
                    .object({
                        enabled: z.boolean().optional(),
                        wait: z.boolean().optional(),
                        concurrency: z.number().int().positive().optional(),
                        pollIntervalMs: z.number().int().nonnegative().optional(),
                        timeoutMinutes: z.number().int().positive().optional(),
                    })
                    .strict()
                    .optional(),
            })
            .strict()
            .optional(),
        fallback: z
            .union([z.literal("openai"), z.literal("gemini"), z.literal("local"), z.literal("none")])
            .optional(),
        model: z.string().optional(),
        local: z
            .object({
                modelPath: z.string().optional(),
                modelCacheDir: z.string().optional(),
            })
            .strict()
            .optional(),
        store: z
            .object({
                driver: z.literal("sqlite").optional(),
                path: z.string().optional(),
                vector: z
                    .object({
                        enabled: z.boolean().optional(),
                        extensionPath: z.string().optional(),
                    })
                    .strict()
                    .optional(),
                cache: z.object({
                    enabled: z.boolean().optional(),
                    maxEntries: z.number().int().positive().optional(),
                }).strict().optional(),
            })
            .strict()
            .optional(),
        chunking: z
            .object({
                tokens: z.number().int().positive().optional(),
                overlap: z.number().int().nonnegative().optional(),
            })
            .strict()
            .optional(),
        sync: z
            .object({
                onSessionStart: z.boolean().optional(),
                onSearch: z.boolean().optional(),
                watch: z.boolean().optional(),
                watchDebounceMs: z.number().int().nonnegative().optional(),
                intervalMinutes: z.number().int().nonnegative().optional(),
                sessions: z
                    .object({
                        deltaBytes: z.number().int().nonnegative().optional(),
                        deltaMessages: z.number().int().nonnegative().optional(),
                    })
                    .strict()
                    .optional(),
            })
            .strict()
            .optional(),
        query: z
            .object({
                maxResults: z.number().int().positive().optional(),
                minScore: z.number().min(0).max(1).optional(),
                hybrid: z
                    .object({
                        enabled: z.boolean().optional(),
                        vectorWeight: z.number().min(0).max(1).optional(),
                        textWeight: z.number().min(0).max(1).optional(),
                        candidateMultiplier: z.number().int().positive().optional(),
                    })
                    .strict()
                    .optional(),
            })
            .strict()
            .optional(),
        cache: z
            .object({
                enabled: z.boolean().optional(),
                maxEntries: z.number().int().positive().optional(),
            })
            .strict()
            .optional(),
    })
    .strict();

export type MemorySearchConfig = z.infer<typeof MemorySearchSchema>;
