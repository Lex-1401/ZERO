/**
 * ZERO Schema — Gateway Section
 *
 * Extracted for Atomic Modularity (< 500 lines).
 *
 * @module config/zod-schema.gateway
 */

import { z } from "zod";

export const GatewaySchema = z
    .object({
        port: z.number().int().positive().optional(),
        mode: z.union([z.literal("local"), z.literal("remote")]).optional(),
        bind: z
            .union([
                z.literal("auto"),
                z.literal("lan"),
                z.literal("loopback"),
                z.literal("custom"),
                z.literal("tailnet"),
            ])
            .optional(),
        controlUi: z
            .object({
                enabled: z.boolean().optional(),
                basePath: z.string().optional(),
                allowInsecureAuth: z.boolean().optional(),
            })
            .passthrough()
            .optional(),
        auth: z
            .object({
                mode: z.union([z.literal("token"), z.literal("password")]).optional(),
                token: z.string().optional(),
                password: z.string().optional(),
                allowTailscale: z.boolean().optional(),
            })
            .passthrough()
            .optional(),
        trustedProxies: z.array(z.string()).optional(),
        tailscale: z
            .object({
                mode: z.union([z.literal("off"), z.literal("serve"), z.literal("funnel")]).optional(),
                resetOnExit: z.boolean().optional(),
            })
            .passthrough()
            .optional(),
        remote: z
            .object({
                url: z.string().optional(),
                transport: z.union([z.literal("ssh"), z.literal("direct")]).optional(),
                token: z.string().optional(),
                password: z.string().optional(),
                tlsFingerprint: z.string().optional(),
                sshTarget: z.string().optional(),
                sshIdentity: z.string().optional(),
            })
            .passthrough()
            .optional(),
        reload: z
            .object({
                mode: z
                    .union([
                        z.literal("off"),
                        z.literal("restart"),
                        z.literal("hot"),
                        z.literal("hybrid"),
                    ])
                    .optional(),
                debounceMs: z.number().int().min(0).optional(),
            })
            .passthrough()
            .optional(),
        tls: z
            .object({
                enabled: z.boolean().optional(),
                autoGenerate: z.boolean().optional(),
                certPath: z.string().optional(),
                keyPath: z.string().optional(),
                caPath: z.string().optional(),
            })
            .optional(),
        http: z
            .object({
                endpoints: z
                    .object({
                        chatCompletions: z
                            .object({
                                enabled: z.boolean().optional(),
                            })
                            .passthrough()
                            .optional(),
                        responses: z
                            .object({
                                enabled: z.boolean().optional(),
                                maxBodyBytes: z.number().int().positive().optional(),
                                files: z
                                    .object({
                                        allowUrl: z.boolean().optional(),
                                        allowedMimes: z.array(z.string()).optional(),
                                        maxBytes: z.number().int().positive().optional(),
                                        maxChars: z.number().int().positive().optional(),
                                        maxRedirects: z.number().int().nonnegative().optional(),
                                        timeoutMs: z.number().int().positive().optional(),
                                        pdf: z
                                            .object({
                                                maxPages: z.number().int().positive().optional(),
                                                maxPixels: z.number().int().positive().optional(),
                                                minTextChars: z.number().int().nonnegative().optional(),
                                            })
                                            .passthrough()
                                            .optional(),
                                    })
                                    .passthrough()
                                    .optional(),
                                images: z
                                    .object({
                                        allowUrl: z.boolean().optional(),
                                        allowedMimes: z.array(z.string()).optional(),
                                        maxBytes: z.number().int().positive().optional(),
                                        maxRedirects: z.number().int().nonnegative().optional(),
                                        timeoutMs: z.number().int().positive().optional(),
                                    })
                                    .passthrough()
                                    .optional(),
                            })
                            .passthrough()
                            .optional(),
                    })
                    .passthrough()
                    .optional(),
            })
            .passthrough()
            .optional(),
        nodes: z
            .object({
                browser: z
                    .object({
                        mode: z
                            .union([z.literal("auto"), z.literal("manual"), z.literal("off")])
                            .optional(),
                        node: z.string().optional(),
                    })
                    .passthrough()
                    .optional(),
                allowCommands: z.array(z.string()).optional(),
                denyCommands: z.array(z.string()).optional(),
            })
            .passthrough()
            .optional(),
        cors: z
            .object({
                enabled: z.boolean().optional(),
                allowedOrigins: z.array(z.string()).optional(),
                allowedMethods: z.array(z.string()).optional(),
                allowCredentials: z.boolean().optional(),
            })
            .passthrough()
            .optional(),
    })
    .passthrough()
    .optional();
