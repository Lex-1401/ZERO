// @ts-nocheck

import { z } from "zod";

import { parseDurationMs } from "../cli/parse-duration.js";
import {
  HumanDelaySchema,
  IdentitySchema,
} from "./zod-schema.core.js";

import {
  SandboxDockerSchema,
  SandboxBrowserSchema,
  SandboxPruneSchema,
  AgentSandboxSchema,
} from "./schemas/sandbox.js";

import {
  ToolPolicySchema,
  ToolsWebSearchSchema,
  ToolsWebFetchSchema,
  ToolsWebSchema,
  ToolProfileSchema,
  ToolPolicyWithProfileSchema,
  ElevatedAllowFromSchema,
  AgentToolsSchema,
  ToolsSchema,
} from "./schemas/tools.js";

import { MemorySearchSchema } from "./schemas/memory.js";

export {
  SandboxDockerSchema,
  SandboxBrowserSchema,
  SandboxPruneSchema,
  AgentSandboxSchema,
  ToolPolicySchema,
  ToolsWebSearchSchema,
  ToolsWebFetchSchema,
  ToolsWebSchema,
  ToolProfileSchema,
  ToolPolicyWithProfileSchema,
  ElevatedAllowFromSchema,
  AgentToolsSchema,
  ToolsSchema,
  MemorySearchSchema,
};

export const HeartbeatSchema = z
  .object({
    every: z.string().optional(),
    activeHours: z
      .object({
        start: z.string().optional(),
        end: z.string().optional(),
        timezone: z.string().optional(),
      })
      .passthrough()
      .optional(),
    model: z.string().optional(),
    session: z.string().optional(),
    includeReasoning: z.boolean().optional(),
    target: z.string().optional(),
    to: z.string().optional(),
    prompt: z.string().optional(),
    ackMaxChars: z.number().int().nonnegative().optional(),
  })
  .passthrough()
  .superRefine((val, ctx) => {
    if (!val.every) return;
    try {
      parseDurationMs(val.every, { defaultUnit: "m" });
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["every"],
        message: "invalid duration (use ms, s, m, h)",
      });
    }

    const active = val.activeHours;
    if (!active) return;
    const timePattern = /^([01]\d|2[0-3]|24):([0-5]\d)$/;
    const validateTime = (raw: string | undefined, opts: { allow24: boolean }, path: string) => {
      if (!raw) return;
      if (!timePattern.test(raw)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["activeHours", path],
          message: 'invalid time (use "HH:MM" 24h format)',
        });
        return;
      }
      const [hourStr, minuteStr] = raw.split(":");
      const hour = Number(hourStr);
      const minute = Number(minuteStr);
      if (hour === 24 && minute !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["activeHours", path],
          message: "invalid time (24:00 is the only allowed 24:xx value)",
        });
        return;
      }
      if (hour === 24 && !opts.allow24) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["activeHours", path],
          message: "invalid time (start cannot be 24:00)",
        });
      }
    };

    validateTime(active.start, { allow24: false }, "start");
    validateTime(active.end, { allow24: true }, "end");
  })
  .optional();

export const AgentModelSchema = z.union([
  z.string(),
  z
    .object({
      primary: z.string().optional(),
      fallbacks: z.array(z.string()).optional(),
    })
    .passthrough(),
]);

export const AgentEntrySchema = z
  .object({
    id: z.string(),
    default: z.boolean().optional(),
    name: z.string().optional(),
    role: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
    workspace: z.string().optional(),
    agentDir: z.string().optional(),
    model: AgentModelSchema.optional(),
    memorySearch: MemorySearchSchema.optional(),
    humanDelay: HumanDelaySchema.optional(),
    heartbeat: HeartbeatSchema.optional(),
    identity: IdentitySchema.optional(),
    groupChat: z.any().optional(),
    subagents: z
      .object({
        allowAgents: z.array(z.string()).optional(),
        model: z
          .union([
            z.string(),
            z
              .object({
                primary: z.string().optional(),
                fallbacks: z.array(z.string()).optional(),
              })
              .passthrough(),
          ])
          .optional(),
      })
      .passthrough()
      .optional(),
    sandbox: AgentSandboxSchema.optional(),
    tools: AgentToolsSchema.optional(),
  })
  .passthrough();
