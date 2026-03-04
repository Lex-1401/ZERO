
import { z } from "zod";

export const IdentitySchema = z
    .object({
        name: z.string().optional(),
        theme: z.string().optional(),
        emoji: z.string().optional(),
        avatar: z.string().optional(),
    })
    .strict();

export type IdentityConfig = z.infer<typeof IdentitySchema>;

export const DmConfigSchema = z
    .object({
        historyLimit: z.number().int().min(0).optional(),
    })
    .strict();

export type DmConfig = z.infer<typeof DmConfigSchema>;
