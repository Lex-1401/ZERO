
import { z } from "zod";

export const NodeHostBrowserProxySchema = z.object({
    enabled: z.boolean().optional(),
    allowProfiles: z.array(z.string()).optional(),
}).passthrough().optional();

export const NodeHostSchema = z.object({
    browserProxy: NodeHostBrowserProxySchema,
}).passthrough().optional();
