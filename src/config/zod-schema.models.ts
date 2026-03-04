
import { z } from "zod";
import { ModelProviderSchema } from "./schemas/models.js";

export const ModelsConfigSchema = z.object({
    providers: z.record(z.string(), ModelProviderSchema).optional(),
}).passthrough().optional();
