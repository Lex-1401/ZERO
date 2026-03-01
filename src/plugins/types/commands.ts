import type { ZEROConfig } from "../../config/config.js";
import type { ReplyPayload } from "../../auto-reply/types.js";

export type PluginCommandContext = {
  senderId?: string;
  channel: string;
  isAuthorizedSender: boolean;
  args?: string;
  commandBody: string;
  config: ZEROConfig;
};

export type PluginCommandResult = ReplyPayload;

export type PluginCommandHandler = (
  ctx: PluginCommandContext,
) => PluginCommandResult | Promise<PluginCommandResult>;

export type ZEROPluginCommandDefinition = {
  name: string;
  description: string;
  acceptsArgs?: boolean;
  requireAuth?: boolean;
  handler: PluginCommandHandler;
};
