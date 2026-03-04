
import { z } from "zod";
import {
    InboundDebounceSchema,
    NativeCommandsSettingSchema,
    TtsConfigSchema,
} from "../zod-schema.core.js";
import { ScopeConfigSchema } from "./core-base.js";

export const SessionResetConfigSchema = z
    .object({
        mode: z.union([z.literal("daily"), z.literal("idle")]).optional(),
        atHour: z.number().int().min(0).max(23).optional(),
        idleMinutes: z.number().int().positive().optional(),
    })
    .strict();

export type SessionResetConfig = z.infer<typeof SessionResetConfigSchema>;

export const SessionResetByTypeSchema = z
    .object({
        dm: SessionResetConfigSchema.optional(),
        group: SessionResetConfigSchema.optional(),
        thread: SessionResetConfigSchema.optional(),
    })
    .strict();

export type SessionResetByTypeConfig = z.infer<typeof SessionResetByTypeSchema>;

export const SessionSchema = z
    .object({
        scope: z.union([z.literal("per-sender"), z.literal("global")]).optional(),
        dmScope: z
            .union([z.literal("main"), z.literal("per-peer"), z.literal("per-channel-peer")])
            .optional(),
        identityLinks: z.record(z.string(), z.array(z.string())).optional(),
        resetTriggers: z.array(z.string()).optional(),
        idleMinutes: z.number().int().positive().optional(),
        reset: SessionResetConfigSchema.optional(),
        resetByType: SessionResetByTypeSchema.optional(),
        resetByChannel: z.record(z.string(), SessionResetConfigSchema).optional(),
        store: z.string().optional(),
        typingIntervalSeconds: z.number().int().positive().optional(),
        typingMode: z
            .union([
                z.literal("never"),
                z.literal("instant"),
                z.literal("thinking"),
                z.literal("message"),
            ])
            .optional(),
        mainKey: z.string().optional(),
        sendPolicy: ScopeConfigSchema.optional(),
        agentToAgent: z
            .object({
                maxPingPongTurns: z.number().int().min(0).max(5).optional(),
            })
            .strict()
            .optional(),
        encrypt: z.boolean().optional(),
    })
    .strict();

export type SessionConfig = z.infer<typeof SessionSchema>;

export const MessagesSchema = z
    .object({
        messagePrefix: z.string().optional(),
        responsePrefix: z.string().optional(),
        groupChat: z.any().optional(),
        queue: z.any().optional(),
        inbound: InboundDebounceSchema.optional(),
        ackReaction: z.string().optional(),
        ackReactionScope: z.enum(["group-mentions", "group-all", "direct", "all"]).optional(),
        removeAckAfterReply: z.boolean().optional(),
        tts: TtsConfigSchema.optional(),
    })
    .strict();

export type MessagesConfig = z.infer<typeof MessagesSchema>;

export const CommandsSchema = z
    .object({
        native: NativeCommandsSettingSchema.optional().default("auto"),
        nativeSkills: NativeCommandsSettingSchema.optional().default("auto"),
        text: z.boolean().optional(),
        bash: z.boolean().optional(),
        bashForegroundMs: z.number().int().min(0).max(30_000).optional(),
        config: z.boolean().optional(),
        debug: z.boolean().optional(),
        restart: z.boolean().optional(),
        useAccessGroups: z.boolean().optional(),
    })
    .strict();

export type CommandsConfig = z.infer<typeof CommandsSchema>;
