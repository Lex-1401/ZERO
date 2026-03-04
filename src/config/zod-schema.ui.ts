
import { z } from "zod";

export const UISchema = z.object({
    seamColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    assistant: z.object({
        name: z.string().optional(),
        avatar: z.string().optional(),
    }).passthrough().optional(),
}).passthrough().optional();
