
import { z } from "zod";

export const GatewaySchema = z.object({
    port: z.number().int().positive().optional(),
    mode: z.union([z.literal("local"), z.literal("remote")]).optional(),
    bind: z.union([z.literal("auto"), z.literal("lan"), z.literal("loopback")]).optional(),
    tailscale: z.object({
        mode: z.union([z.literal("off"), z.literal("serve"), z.literal("funnel")]).optional(),
        resetOnExit: z.boolean().optional(),
    }).passthrough().optional(),
}).passthrough().optional();
