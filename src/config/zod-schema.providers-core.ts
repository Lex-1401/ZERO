
/**
 * Providers Core Zod Schema
 *
 * Implements Zod schemas for various communication providers (Telegram, Discord, Slack, etc.).
 * Delegated to src/config/zod-schema/providers/ for maintainability and Atomic Modularity.
 */

import { z } from "zod";
import { TelegramConfigSchema, TelegramAccountSchema } from "./zod-schema/providers/telegram.js";
import { DiscordConfigSchema, DiscordAccountSchema } from "./zod-schema/providers/discord.js";
import { GoogleChatConfigSchema, GoogleChatAccountSchema } from "./zod-schema/providers/googlechat.js";
import { IMessageConfigSchema, IMessageAccountSchema } from "./zod-schema/providers/imessage.js";
import { MSTeamsConfigSchema, MSTeamsAccountSchema } from "./zod-schema/providers/msteams.js";
import { SignalConfigSchema, SignalAccountConfigSchema } from "./zod-schema/providers/signal.js";
import {
  DmPolicySchema,
  GroupPolicySchema,
  ChannelHeartbeatVisibilitySchema,
  requireOpenAllowFrom
} from "./zod-schema.core.js";

export {
  TelegramConfigSchema, TelegramAccountSchema,
  DiscordConfigSchema, DiscordAccountSchema,
  GoogleChatConfigSchema, GoogleChatAccountSchema,
  IMessageConfigSchema, IMessageAccountSchema,
  MSTeamsConfigSchema, MSTeamsAccountSchema,
  SignalConfigSchema, SignalAccountConfigSchema
};

export const BlueBubblesAccountSchema = z.object({
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  url: z.string().optional(),
  password: z.string().optional(),
}).passthrough();

export const BlueBubblesConfigSchema = BlueBubblesAccountSchema.extend({
  accounts: z.record(z.string(), BlueBubblesAccountSchema.optional()).optional(),
});

export const SlackDmSchema = z.object({
  enabled: z.boolean().optional(),
  policy: DmPolicySchema.optional().default("pairing"),
  allowFrom: z.array(z.union([z.string(), z.number()])).optional(),
}).strict().superRefine((val, ctx) => {
  if (val.policy !== "open") return;
  requireOpenAllowFrom({
    policy: val.policy,
    allowFrom: val.allowFrom,
    ctx,
    path: ["allowFrom"],
    message: 'channels.slack.dm.policy="open" requires allowFrom to include "*"',
  });
});

export const SlackAccountSchema = z
  .object({
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    mode: z.enum(["socket", "http"]).optional(),
    signingSecret: z.string().optional(),
    botToken: z.string().optional(),
    appToken: z.string().optional(),
    userToken: z.string().optional(),
    userTokenReadOnly: z.boolean().optional(),
    groupPolicy: GroupPolicySchema.optional().default("allowlist"),
    historyLimit: z.number().int().min(0).optional(),
    dmHistoryLimit: z.number().int().min(0).optional(),
    dm: SlackDmSchema.optional(),
    heartbeat: ChannelHeartbeatVisibilitySchema.optional(),
  })
  .passthrough();

export const SlackConfigSchema = SlackAccountSchema.extend({
  accounts: z.record(z.string(), SlackAccountSchema.optional()).optional(),
}).superRefine((data, ctx) => {
  if (data.mode === "http" && !data.signingSecret) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["signingSecret"],
      message: "Signing secret is required for Slack HTTP mode",
    });
  }
  if (data.accounts) {
    for (const [id, account] of Object.entries(data.accounts)) {
      if (account?.mode === "http" && !account.signingSecret && !data.signingSecret) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["accounts", id, "signingSecret"],
          message: `Signing secret is required for Slack account "${id}" in HTTP mode`,
        });
      }
    }
  }
});
