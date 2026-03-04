
import { z } from "zod";

export const PluginEntrySchema = z.object({
    enabled: z.boolean().optional(),
    config: z.record(z.string(), z.any()).optional(),
}).passthrough();

export const PluginInstallRecordSchema = z.object({
    source: z.enum(["npm", "archive", "path"]),
    spec: z.string().optional(),
    sourcePath: z.string().optional(),
    installPath: z.string().optional(),
    version: z.string().optional(),
    installedAt: z.string().optional(),
}).passthrough();

export const PluginsConfigSchema = z.object({
    enabled: z.boolean().optional(),
    allow: z.array(z.string()).optional(),
    deny: z.array(z.string()).optional(),
    load: z.object({
        paths: z.array(z.string()).optional(),
    }).passthrough().optional(),
    slots: z.object({
        memory: z.string().optional(),
    }).passthrough().optional(),
    entries: z.record(z.string(), PluginEntrySchema).optional(),
    installs: z.record(z.string(), PluginInstallRecordSchema).optional(),
}).passthrough().optional();
