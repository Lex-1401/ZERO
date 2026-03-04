

import type { ChannelDock } from "../../channels/dock.js";
import type { ChannelPlugin } from "../../channels/plugins/types.js";
import type {
    GatewayRequestHandlers,
} from "../../gateway/server-methods/types.js";
import type {
    ZEROPluginCliRegistrar,
    ZEROPluginCommandDefinition,
    ZEROPluginHttpHandler,
    ZEROPluginHttpRouteHandler,
    ProviderPlugin,
    ZEROPluginService,
    ZEROPluginToolFactory,
    PluginConfigUiHint,
    PluginDiagnostic,
    PluginLogger,
    PluginOrigin,
    PluginKind,
    PluginHookRegistration as TypedPluginHookRegistration,
} from "../types.js";
import type { PluginRuntime } from "../runtime/types.js";
import type { HookEntry } from "../../hooks/types.js";

export type PluginToolRegistration = {
    pluginId: string;
    factory: ZEROPluginToolFactory;
    names: string[];
    optional: boolean;
    source: string;
};

export type PluginCliRegistration = {
    pluginId: string;
    register: ZEROPluginCliRegistrar;
    commands: string[];
    source: string;
};

export type PluginHttpRegistration = {
    pluginId: string;
    handler: ZEROPluginHttpHandler;
    source: string;
};

export type PluginHttpRouteRegistration = {
    pluginId?: string;
    path: string;
    handler: ZEROPluginHttpRouteHandler;
    source?: string;
};

export type PluginChannelRegistration = {
    pluginId: string;
    plugin: ChannelPlugin;
    dock?: ChannelDock;
    source: string;
};

export type PluginProviderRegistration = {
    pluginId: string;
    provider: ProviderPlugin;
    source: string;
};

export type PluginHookRegistration = {
    pluginId: string;
    entry: HookEntry;
    events: string[];
    source: string;
};

export type PluginServiceRegistration = {
    pluginId: string;
    service: ZEROPluginService;
    source: string;
};

export type PluginCommandRegistration = {
    pluginId: string;
    command: ZEROPluginCommandDefinition;
    source: string;
};

export type PluginRecord = {
    id: string;
    name: string;
    version?: string;
    description?: string;
    kind?: PluginKind;
    source: string;
    origin: PluginOrigin;
    workspaceDir?: string;
    enabled: boolean;
    status: "loaded" | "disabled" | "error";
    error?: string;
    toolNames: string[];
    hookNames: string[];
    channelIds: string[];
    providerIds: string[];
    gatewayMethods: string[];
    cliCommands: string[];
    services: string[];
    commands: string[];
    httpHandlers: number;
    hookCount: number;
    configSchema: boolean;
    configUiHints?: Record<string, PluginConfigUiHint>;
    configJsonSchema?: Record<string, unknown>;
};

export type PluginRegistry = {
    plugins: PluginRecord[];
    tools: PluginToolRegistration[];
    hooks: PluginHookRegistration[];
    typedHooks: TypedPluginHookRegistration[];
    channels: PluginChannelRegistration[];
    providers: PluginProviderRegistration[];
    gatewayHandlers: GatewayRequestHandlers;
    httpHandlers: PluginHttpRegistration[];
    httpRoutes: PluginHttpRouteRegistration[];
    cliRegistrars: PluginCliRegistration[];
    services: PluginServiceRegistration[];
    commands: PluginCommandRegistration[];
    diagnostics: PluginDiagnostic[];
};

export type PluginRegistryParams = {
    logger: PluginLogger;
    coreGatewayHandlers?: GatewayRequestHandlers;
    runtime: PluginRuntime;
};
