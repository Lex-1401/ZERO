
import { z } from "zod";

export const BrowserProfileConfigSchema = z.object({
    cdpPort: z.number().int().positive().optional(),
    cdpUrl: z.string().optional(),
    driver: z.union([z.literal("zero"), z.literal("extension")]).optional(),
    color: z.string(),
}).passthrough();

export const BrowserSnapshotDefaultsSchema = z.object({
    mode: z.literal("efficient").optional(),
}).passthrough();

export const BrowserSchema = z.object({
    enabled: z.boolean().optional(),
    controlUrl: z.string().optional(),
    controlToken: z.string().optional(),
    cdpUrl: z.string().optional(),
    remoteCdpTimeoutMs: z.number().int().positive().optional(),
    remoteCdpHandshakeTimeoutMs: z.number().int().positive().optional(),
    color: z.string().optional(),
    executablePath: z.string().optional(),
    headless: z.boolean().optional(),
    noSandbox: z.boolean().optional(),
    attachOnly: z.boolean().optional(),
    defaultProfile: z.string().optional(),
    profiles: z.record(z.string(), BrowserProfileConfigSchema).optional(),
    snapshotDefaults: BrowserSnapshotDefaultsSchema.optional(),
}).passthrough().optional();
