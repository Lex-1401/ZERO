
import { z } from "zod";

export const QueueModeSchema = z.union([
    z.literal("fifo"),
    z.literal("lifo"),
    z.literal("priority"),
]);
export type QueueMode = z.infer<typeof QueueModeSchema>;

export const QueueDropSchema = z.union([
    z.literal("oldest"),
    z.literal("newest"),
    z.literal("none"),
]);
export type QueueDrop = z.infer<typeof QueueDropSchema>;

export const RetryConfigSchema = z
    .object({
        attempts: z.number().int().min(1).optional(),
        minDelayMs: z.number().int().min(0).optional(),
        maxDelayMs: z.number().int().min(0).optional(),
        backoffFactor: z.number().min(1).optional(),
        timeoutMs: z.number().int().min(1000).optional(),
        queue: QueueModeSchema.optional(),
        limit: z.number().int().positive().optional(),
        drop: QueueDropSchema.optional(),
        jitter: z.number().min(0).max(1).optional(),
    })
    .strict();

export type OutboundRetryConfig = z.infer<typeof RetryConfigSchema>;
export type RetryConfig = OutboundRetryConfig;

export const HumanDelaySchema = z
    .object({
        mode: z.union([z.literal("off"), z.literal("natural"), z.literal("custom")]).optional(),
        minMs: z.number().int().nonnegative().optional(),
        maxMs: z.number().int().nonnegative().optional(),
    })
    .strict();

export type HumanDelayConfig = z.infer<typeof HumanDelaySchema>;

export const DebounceMsBySurfaceSchema = z.record(z.string(), z.number().int().nonnegative());

export const InboundDebounceSchema = z
    .object({
        debounceMs: z.number().int().nonnegative().optional(),
        byChannel: DebounceMsBySurfaceSchema.optional(),
    })
    .strict();

export type InboundDebounceConfig = z.infer<typeof InboundDebounceSchema>;

export const BlockStreamingCoalesceSchema = z
    .object({
        minChars: z.number().int().positive().optional(),
        maxChars: z.number().int().positive().optional(),
        idleMs: z.number().int().nonnegative().optional(),
    })
    .strict();

export type BlockStreamingCoalesceConfig = z.infer<typeof BlockStreamingCoalesceSchema>;

export const BlockStreamingChunkSchema = z
    .object({
        minChars: z.number().int().positive().optional(),
        maxChars: z.number().int().positive().optional(),
        breakPreference: z.union([z.literal("sentence"), z.literal("paragraph"), z.literal("word")]).optional(),
    })
    .strict();

export type BlockStreamingChunkConfig = z.infer<typeof BlockStreamingChunkSchema>;
