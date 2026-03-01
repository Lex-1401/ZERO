import type { ZEROConfig } from "../../config/config.js";
import type { AnyAgentTool } from "../../agents/tools/common.js";
import type { InternalHookHandler } from "../../hooks/internal-hooks.js";
import type { HookEntry } from "../../hooks/types.js";
import type { GatewayRequestHandler } from "../../gateway/server-methods/types.js";
import type { ChannelPlugin } from "../../channels/plugins/types.js";
import type { PluginRuntime } from "../runtime/types.js";
import type { PluginLogger, PluginKind, ZEROPluginConfigSchema } from "./base.js";
import type {
  ZEROPluginToolFactory,
  ZEROPluginToolOptions,
  ZEROPluginHttpHandler,
  ZEROPluginHttpRouteHandler,
  ZEROPluginChannelRegistration,
  ZEROPluginCliRegistrar,
  ZEROPluginService,
} from "./system.js";
import type { ZEROPluginCommandDefinition } from "./commands.js";
import type { ProviderPlugin } from "./providers.js";
import type { PluginHookName } from "./hooks.js";
import type { PluginHookHandlerMap } from "./handlers.js";

export type ZEROPluginHookOptions = {
  entry?: HookEntry;
  name?: string;
  description?: string;
  register?: boolean;
};

export type ZEROPluginApi = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  source: string;
  config: ZEROConfig;
  pluginConfig?: Record<string, unknown>;
  runtime: PluginRuntime;
  logger: PluginLogger;
  registerTool: (tool: AnyAgentTool | ZEROPluginToolFactory, opts?: ZEROPluginToolOptions) => void;
  registerHook: (
    events: string | string[],
    handler: InternalHookHandler,
    opts?: ZEROPluginHookOptions,
  ) => void;
  registerHttpHandler: (handler: ZEROPluginHttpHandler) => void;
  registerHttpRoute: (params: { path: string; handler: ZEROPluginHttpRouteHandler }) => void;
  registerChannel: (reg: ZEROPluginChannelRegistration | ChannelPlugin) => void;
  registerGatewayMethod: (method: string, handler: GatewayRequestHandler) => void;
  registerCli: (registrar: ZEROPluginCliRegistrar, opts?: { commands?: string[] }) => void;
  registerService: (service: ZEROPluginService) => void;
  registerProvider: (provider: ProviderPlugin) => void;
  registerCommand: (command: ZEROPluginCommandDefinition) => void;
  resolvePath: (input: string) => string;
  on: <K extends PluginHookName>(
    hook: K,
    handler: PluginHookHandlerMap[K],
    opts?: { priority?: number },
  ) => void;
};

export type ZEROPluginDefinition = {
  id?: string;
  name?: string;
  description?: string;
  version?: string;
  kind?: PluginKind;
  configSchema?: ZEROPluginConfigSchema;
  register?: (api: ZEROPluginApi) => void | Promise<void>;
  activate?: (api: ZEROPluginApi) => void | Promise<void>;
};

export type ZEROPluginModule =
  | ZEROPluginDefinition
  | ((api: ZEROPluginApi) => void | Promise<void>);
