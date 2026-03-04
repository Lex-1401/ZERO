import { z } from "zod";
import { ToolsSchema } from "./zod-schema.agent-runtime.js";
import { ApprovalsSchema } from "./zod-schema.approvals.js";
import { AgentsSchema, AudioSchema, BindingsSchema, BroadcastSchema } from "./zod-schema.agents.js";
import { HexColorSchema } from "./zod-schema.core.js";
import { ModelsConfigSchema } from "./zod-schema.models.js";
import { HookMappingSchema, HooksGmailSchema, InternalHooksSchema } from "./zod-schema.hooks.js";
import { ChannelsSchema } from "./zod-schema.providers.js";
import { CommandsSchema, MessagesSchema, SessionSchema } from "./zod-schema.session.js";
import { GatewaySchema } from "./zod-schema.gateway.js";

const BrowserSnapshotDefaultsSchema = z
  .object({
    mode: z.literal("efficient").optional(),
  })
  .passthrough()
  .optional();

const NodeHostSchema = z
  .object({
    browserProxy: z
      .object({
        enabled: z.boolean().optional(),
        allowProfiles: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .optional();

export const ZEROSchema = z
  .object({
    meta: z
      .object({
        lastTouchedVersion: z.string().optional(),
        lastTouchedAt: z.string().optional(),
      })
      .passthrough()
      .optional(),
    env: z
      .object({
        shellEnv: z
          .object({
            enabled: z.boolean().optional(),
            timeoutMs: z.number().int().nonnegative().optional(),
          })
          .passthrough()
          .optional(),
        vars: z.record(z.string(), z.string()).optional(),
      })
      .catchall(z.string())
      .optional(),
    wizard: z
      .object({
        lastRunAt: z.string().optional(),
        lastRunVersion: z.string().optional(),
        lastRunCommit: z.string().optional(),
        lastRunCommand: z.string().optional(),
        lastRunMode: z.union([z.literal("local"), z.literal("remote")]).optional(),
      })
      .passthrough()
      .optional(),
    diagnostics: z
      .object({
        enabled: z.boolean().optional(),
        flags: z.array(z.string()).optional(),
        otel: z
          .object({
            enabled: z.boolean().optional(),
            endpoint: z.string().optional(),
            protocol: z.union([z.literal("http/protobuf"), z.literal("grpc")]).optional(),
            headers: z.record(z.string(), z.string()).optional(),
            serviceName: z.string().optional(),
            traces: z.boolean().optional(),
            metrics: z.boolean().optional(),
            logs: z.boolean().optional(),
            sampleRate: z.number().min(0).max(1).optional(),
            flushIntervalMs: z.number().int().nonnegative().optional(),
          })
          .passthrough()
          .optional(),
        cacheTrace: z
          .object({
            enabled: z.boolean().optional(),
            filePath: z.string().optional(),
            includeMessages: z.boolean().optional(),
            includePrompt: z.boolean().optional(),
            includeSystem: z.boolean().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    logging: z
      .object({
        level: z
          .union([
            z.literal("silent"),
            z.literal("fatal"),
            z.literal("error"),
            z.literal("warn"),
            z.literal("info"),
            z.literal("debug"),
            z.literal("trace"),
          ])
          .optional(),
        file: z.string().optional(),
        consoleLevel: z
          .union([
            z.literal("silent"),
            z.literal("fatal"),
            z.literal("error"),
            z.literal("warn"),
            z.literal("info"),
            z.literal("debug"),
            z.literal("trace"),
          ])
          .optional(),
        consoleStyle: z
          .union([z.literal("pretty"), z.literal("compact"), z.literal("json")])
          .optional(),
        redactSensitive: z.union([z.literal("off"), z.literal("tools")]).optional(),
        redactPatterns: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    update: z
      .object({
        channel: z.union([z.literal("stable"), z.literal("beta"), z.literal("dev")]).optional(),
        checkOnStart: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    browser: z
      .object({
        enabled: z.boolean().optional(),
        controlUrl: z.string().optional(),
        controlToken: z.string().optional(),
        cdpUrl: z.string().optional(),
        remoteCdpTimeoutMs: z.number().int().nonnegative().optional(),
        remoteCdpHandshakeTimeoutMs: z.number().int().nonnegative().optional(),
        color: z.string().optional(),
        executablePath: z.string().optional(),
        headless: z.boolean().optional(),
        noSandbox: z.boolean().optional(),
        attachOnly: z.boolean().optional(),
        defaultProfile: z.string().optional(),
        snapshotDefaults: BrowserSnapshotDefaultsSchema,
        profiles: z
          .record(
            z
              .string()
              .regex(/^[a-z0-9-]+$/, "Profile names must be alphanumeric with hyphens only"),
            z
              .object({
                cdpPort: z.number().int().min(1).max(65535).optional(),
                cdpUrl: z.string().optional(),
                driver: z.union([z.literal("zero"), z.literal("extension")]).optional(),
                color: HexColorSchema,
              })
              .passthrough()
              .refine((value) => value.cdpPort || value.cdpUrl, {
                message: "Profile must set cdpPort or cdpUrl",
              }),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
    ui: z
      .object({
        seamColor: HexColorSchema.optional(),
        assistant: z
          .object({
            name: z.string().max(50).optional(),
            avatar: z.string().max(200).optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    auth: z
      .object({
        profiles: z
          .record(
            z.string(),
            z
              .object({
                provider: z.string(),
                mode: z.union([z.literal("api_key"), z.literal("oauth"), z.literal("token")]),
                email: z.string().optional(),
              })
              .passthrough(),
          )
          .optional(),
        order: z.record(z.string(), z.array(z.string())).optional(),
        cooldowns: z
          .object({
            billingBackoffHours: z.number().positive().optional(),
            billingBackoffHoursByProvider: z.record(z.string(), z.number().positive()).optional(),
            billingMaxHours: z.number().positive().optional(),
            failureWindowHours: z.number().positive().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    models: ModelsConfigSchema.optional(),
    nodeHost: NodeHostSchema.optional(),
    agents: AgentsSchema.optional(),
    tools: ToolsSchema.optional(),
    bindings: BindingsSchema.optional(),
    broadcast: BroadcastSchema.optional(),
    audio: AudioSchema.optional(),
    media: z
      .object({
        preserveFilenames: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    messages: MessagesSchema.optional(),
    commands: CommandsSchema.optional(),
    approvals: ApprovalsSchema.optional(),
    session: SessionSchema.optional(),
    cron: z
      .object({
        enabled: z.boolean().optional(),
        store: z.string().optional(),
        maxConcurrentRuns: z.number().int().positive().optional(),
      })
      .passthrough()
      .optional(),
    hooks: z
      .object({
        enabled: z.boolean().optional(),
        path: z.string().optional(),
        token: z.string().optional(),
        maxBodyBytes: z.number().int().positive().optional(),
        presets: z.array(z.string()).optional(),
        transformsDir: z.string().optional(),
        mappings: z.array(HookMappingSchema).optional(),
        gmail: HooksGmailSchema,
        internal: InternalHooksSchema,
      })
      .passthrough()
      .optional(),
    web: z
      .object({
        enabled: z.boolean().optional(),
        heartbeatSeconds: z.number().int().positive().optional(),
        reconnect: z
          .object({
            initialMs: z.number().positive().optional(),
            maxMs: z.number().positive().optional(),
            factor: z.number().positive().optional(),
            jitter: z.number().min(0).max(1).optional(),
            maxAttempts: z.number().int().min(0).optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    channels: ChannelsSchema,
    discovery: z
      .object({
        wideArea: z
          .object({
            enabled: z.boolean().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    canvasHost: z
      .object({
        enabled: z.boolean().optional(),
        root: z.string().optional(),
        port: z.number().int().positive().optional(),
        liveReload: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    talk: z
      .object({
        voiceId: z.string().optional(),
        voiceAliases: z.record(z.string(), z.string()).optional(),
        modelId: z.string().optional(),
        outputFormat: z.string().optional(),
        apiKey: z.string().optional(),
        interruptOnSpeech: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    gateway: GatewaySchema,
    skills: z
      .object({
        allowBundled: z.array(z.string()).optional(),
        load: z
          .object({
            extraDirs: z.array(z.string()).optional(),
            watch: z.boolean().optional(),
            watchDebounceMs: z.number().int().min(0).optional(),
          })
          .passthrough()
          .optional(),
        install: z
          .object({
            preferBrew: z.boolean().optional(),
            nodeManager: z
              .union([z.literal("npm"), z.literal("pnpm"), z.literal("yarn"), z.literal("bun")])
              .optional(),
          })
          .passthrough()
          .optional(),
        entries: z
          .record(
            z.string(),
            z
              .object({
                enabled: z.boolean().optional(),
                apiKey: z.string().optional(),
                env: z.record(z.string(), z.string()).optional(),
                config: z.record(z.string(), z.unknown()).optional(),
              })
              .strict(),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
    plugins: z
      .object({
        enabled: z.boolean().optional(),
        allow: z.array(z.string()).optional(),
        deny: z.array(z.string()).optional(),
        load: z
          .object({
            paths: z.array(z.string()).optional(),
          })
          .passthrough()
          .optional(),
        slots: z
          .object({
            memory: z.string().optional(),
          })
          .passthrough()
          .optional(),
        entries: z
          .record(
            z.string(),
            z
              .object({
                enabled: z.boolean().optional(),
                config: z.record(z.string(), z.unknown()).optional(),
              })
              .passthrough(),
          )
          .optional(),
        installs: z
          .record(
            z.string(),
            z
              .object({
                source: z.union([z.literal("npm"), z.literal("archive"), z.literal("path")]),
                spec: z.string().optional(),
                sourcePath: z.string().optional(),
                installPath: z.string().optional(),
                version: z.string().optional(),
                installedAt: z.string().optional(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
    environments: z
      .object({
        templates: z
          .record(
            z.string(),
            z
              .object({
                name: z.string(),
                description: z.string().optional(),
                image: z.string().optional(),
                tools: z.array(z.string()).optional(),
                env: z.record(z.string(), z.string()).optional(),
                mounts: z.array(z.string()).optional(),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .strict()
  .superRefine((cfg, ctx) => {
    const agents = cfg.agents?.list ?? [];
    if (agents.length === 0) return;
    const agentIds = new Set(agents.map((agent) => agent.id));
    const agentDirs = new Map();
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      if (agent.agentDir) {
        if (agentDirs.has(agent.agentDir)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["agents", "list"],
            message: "Duplicate agentDir",
          });
        } else {
          agentDirs.set(agent.agentDir, agent.id);
        }
      }
    }

    const broadcast = cfg.broadcast;
    if (!broadcast) return;

    for (const [peerId, ids] of Object.entries(broadcast)) {
      if (peerId === "strategy") continue;
      if (!Array.isArray(ids)) continue;
      for (let idx = 0; idx < ids.length; idx += 1) {
        const agentId = ids[idx];
        if (!agentIds.has(agentId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["broadcast", peerId, idx],
            message: `Unknown agent id "${agentId}" (not in agents.list).`,
          });
        }
      }
    }
  });
