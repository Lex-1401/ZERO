
import { z } from "zod";
import { GatewaySchema } from "./gateway.js";
import { UISchema } from "../zod-schema.ui.js";
import { SessionSchema, MessagesSchema, CommandsSchema } from "../zod-schema.session.js";
import { AgentsSchema, BindingsSchema, BroadcastSchema, AudioSchema } from "../zod-schema.agents.js";
import { ApprovalsSchema } from "../zod-schema.approvals.js";
import { PluginsConfigSchema } from "../zod-schema.plugins.js";
import { ModelsConfigSchema } from "../zod-schema.models.js";
import { BrowserSchema } from "../zod-schema.browser.js";
import { NodeHostSchema } from "../zod-schema.node-host.js";
import { ChannelsSchema } from "../zod-schema.providers.js";
import { HooksConfigSchema } from "../zod-schema.hooks.js";
import { ToolsSchema } from "../zod-schema.tools.js";

export const ZEROSchema = z.object({
    meta: z.object({
        lastTouchedVersion: z.string().optional(),
        lastTouchedAt: z.string().optional(),
    }).strict().optional(),

    // Core Configuration
    gateway: GatewaySchema,
    ui: UISchema,
    session: SessionSchema,
    messages: MessagesSchema,
    commands: CommandsSchema,

    // System Components
    agents: AgentsSchema,
    bindings: BindingsSchema,
    broadcast: BroadcastSchema,
    audio: AudioSchema,
    approvals: ApprovalsSchema,
    plugins: PluginsConfigSchema,
    models: ModelsConfigSchema,
    browser: BrowserSchema,
    nodeHost: NodeHostSchema,
    channels: ChannelsSchema,
    hooks: HooksConfigSchema,
    tools: ToolsSchema,

    // Omitted / placeholders for other keys to avoid strict failure if they exist in config
    auth: z.any().optional(),
    env: z.any().optional(),
    wizard: z.any().optional(),
    diagnostics: z.any().optional(),
    logging: z.any().optional(),
    update: z.any().optional(),
    skills: z.any().optional(),
    web: z.any().optional(),
    cron: z.any().optional(),
    discovery: z.any().optional(),
    canvasHost: z.any().optional(),
    talk: z.any().optional(),
}).passthrough();
