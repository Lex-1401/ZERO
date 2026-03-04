
import { z } from "zod";

export const SandboxDockerSchema = z
    .object({
        image: z.string().optional(),
        containerPrefix: z.string().optional(),
        workdir: z.string().optional(),
        readOnlyRoot: z.boolean().optional(),
        tmpfs: z.array(z.string()).optional(),
        network: z.string().optional(),
        user: z.string().optional(),
        capDrop: z.array(z.string()).optional(),
        env: z.record(z.string(), z.string()).optional(),
        setupCommand: z.string().optional(),
        pidsLimit: z.number().int().positive().optional(),
        memory: z.union([z.string(), z.number()]).optional(),
        memorySwap: z.union([z.string(), z.number()]).optional(),
        cpus: z.number().positive().optional(),
        ulimits: z
            .record(
                z.string(),
                z.union([
                    z.string(),
                    z.number(),
                    z
                        .object({
                            soft: z.number().int().nonnegative().optional(),
                            hard: z.number().int().nonnegative().optional(),
                        })
                        .strict(),
                ]),
            )
            .optional(),
        seccompProfile: z.string().optional(),
        apparmorProfile: z.string().optional(),
        dns: z.array(z.string()).optional(),
        extraHosts: z.array(z.string()).optional(),
        binds: z.array(z.string()).optional(),
    })
    .strict()
    .optional();

export const SandboxBrowserSchema = z
    .object({
        enabled: z.boolean().optional(),
        image: z.string().optional(),
        containerPrefix: z.string().optional(),
        cdpPort: z.number().int().positive().optional(),
        vncPort: z.number().int().positive().optional(),
        noVncPort: z.number().int().positive().optional(),
        headless: z.boolean().optional(),
        enableNoVnc: z.boolean().optional(),
        allowHostControl: z.boolean().optional(),
        allowedControlUrls: z.array(z.string()).optional(),
        allowedControlHosts: z.array(z.string()).optional(),
        allowedControlPorts: z.array(z.number().int().positive()).optional(),
        autoStart: z.boolean().optional(),
        autoStartTimeoutMs: z.number().int().positive().optional(),
    })
    .strict()
    .optional();

export const SandboxPruneSchema = z
    .object({
        idleHours: z.number().int().nonnegative().optional(),
        maxAgeDays: z.number().int().nonnegative().optional(),
    })
    .strict()
    .optional();

export const AgentSandboxSchema = z
    .object({
        mode: z.union([z.literal("off"), z.literal("non-main"), z.literal("all")]).optional().default("off"),
        workspaceAccess: z.union([z.literal("none"), z.literal("ro"), z.literal("rw")]).optional(),
        sessionToolsVisibility: z.union([z.literal("spawned"), z.literal("all")]).optional(),
        scope: z.union([z.literal("session"), z.literal("agent"), z.literal("shared")]).optional(),
        perSession: z.boolean().optional(),
        workspaceRoot: z.string().optional(),
        docker: SandboxDockerSchema,
        browser: SandboxBrowserSchema,
        prune: SandboxPruneSchema,
    })
    .strict()
    .optional();
