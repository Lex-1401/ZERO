import type { IncomingMessage, ServerResponse } from "node:http";
import type { Command } from "commander";
import type { ZEROConfig } from "../../config/config.js";
import type { AnyAgentTool } from "../../agents/tools/common.js";
import type { ChannelDock } from "../../channels/dock.js";
import type { ChannelPlugin } from "../../channels/plugins/types.js";
import type { PluginLogger } from "./base.js";

export type ZEROPluginToolContext = {
  config?: ZEROConfig;
  workspaceDir?: string;
  agentDir?: string;
  agentId?: string;
  sessionKey?: string;
  messageChannel?: string;
  agentAccountId?: string;
  sandboxed?: boolean;
};

export type ZEROPluginToolFactory = (
  ctx: ZEROPluginToolContext,
) => AnyAgentTool | AnyAgentTool[] | null | undefined;

export type ZEROPluginToolOptions = { name?: string; names?: string[]; optional?: boolean };

export type ZEROPluginHttpHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<boolean> | boolean;

export type ZEROPluginHttpRouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => Promise<void> | void;

export type ZEROPluginCliContext = {
  program: Command;
  config: ZEROConfig;
  workspaceDir?: string;
  logger: PluginLogger;
};

export type ZEROPluginCliRegistrar = (ctx: ZEROPluginCliContext) => void | Promise<void>;

export type ZEROPluginServiceContext = {
  config: ZEROConfig;
  workspaceDir?: string;
  stateDir: string;
  logger: PluginLogger;
};

export type ZEROPluginService = {
  id: string;
  start: (ctx: ZEROPluginServiceContext) => void | Promise<void>;
  stop?: (ctx: ZEROPluginServiceContext) => void | Promise<void>;
};

export type ZEROPluginChannelRegistration = { plugin: ChannelPlugin; dock?: ChannelDock };
