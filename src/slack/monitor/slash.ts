import type { SlackCommandMiddlewareArgs } from "@slack/bolt";
import { resolveChunkMode } from "../../auto-reply/chunk.js";
import { resolveEffectiveMessagesConfig } from "../../agents/identity.js";
import {
  buildCommandTextFromArgs,
  findCommandByNativeName,
  listNativeCommandSpecsForConfig,
  parseCommandArgs,
  resolveCommandArgMenu,
  type CommandArgs,
  type ChatCommandDefinition,
} from "../../auto-reply/commands-registry.js";
import { listSkillCommandsForAgents } from "../../auto-reply/skill-commands.js";
import { dispatchReplyWithDispatcher } from "../../auto-reply/reply/provider-dispatcher.js";
import { resolveNativeCommandsEnabled, resolveNativeSkillsEnabled } from "../../config/commands.js";
import { resolveMarkdownTableMode } from "../../config/markdown-tables.js";
import { danger } from "../../globals.js";
import { readChannelAllowFromStore } from "../../pairing/pairing-store.js";
import { resolveAgentRoute } from "../../routing/resolve-route.js";
import { resolveCommandAuthorizedFromAuthorizers } from "../../channels/command-gating.js";

import type { ResolvedSlackAccount } from "../accounts.js";
import { normalizeAllowListLower } from "./allow-list.js";
import { resolveSlackChannelConfig } from "./channel-config.js";
import { buildSlackSlashCommandMatcher, resolveSlackSlashCommandConfig } from "./commands.js";
import type { SlackMonitorContext } from "./context.js";
import { deliverSlackSlashReplies } from "./replies.js";

import {
  SLACK_COMMAND_ARG_ACTION_ID,
  buildSlackCommandArgMenuBlocks,
  parseSlackCommandArgValue,
} from "./slash/menu.js";
import { authorizeSlackSlash } from "./slash/auth.js";
import { buildSlashInboundContext } from "./slash/context.js";

export function registerSlackMonitorSlashCommands(params: {
  ctx: SlackMonitorContext;
  account: ResolvedSlackAccount;
}) {
  const { ctx, account } = params;
  const cfg = ctx.cfg;
  const runtime = ctx.runtime;
  const supportsInteractiveArgMenus = typeof (ctx.app as any).action === "function";
  const slashCommand = resolveSlackSlashCommandConfig(
    ctx.slashCommand ?? account.config.slashCommand,
  );

  const handleSlashCommand = async (p: {
    command: SlackCommandMiddlewareArgs["command"];
    ack: SlackCommandMiddlewareArgs["ack"];
    respond: SlackCommandMiddlewareArgs["respond"];
    prompt: string;
    commandArgs?: CommandArgs;
    commandDefinition?: ChatCommandDefinition;
  }) => {
    const { command, ack, respond, prompt, commandArgs, commandDefinition } = p;
    try {
      if (!prompt.trim()) {
        await ack({ text: "Message required.", response_type: "ephemeral" });
        return;
      }
      await ack();

      if (ctx.botUserId && command.user_id === ctx.botUserId) return;

      const channelInfo = await ctx.resolveChannelName(command.channel_id);
      const isDirectMessage =
        (channelInfo?.type || (command.channel_name === "directmessage" ? "im" : undefined)) ===
        "im";
      const isRoom = channelInfo?.type === "channel" || channelInfo?.type === "group";
      const isRoomish = isRoom || channelInfo?.type === "mpim";

      if (
        !ctx.isChannelAllowed({
          channelId: command.channel_id,
          channelName: channelInfo?.name,
          channelType: channelInfo?.type,
        })
      ) {
        await respond({ text: "This channel is not allowed.", response_type: "ephemeral" });
        return;
      }

      const storeAllowFrom = await readChannelAllowFromStore("slack").catch(() => []);
      const effectiveAllowFromLower = normalizeAllowListLower([
        ...ctx.allowFrom,
        ...storeAllowFrom,
      ]);
      const channelConfig = isRoom
        ? resolveSlackChannelConfig({
          channelId: command.channel_id,
          channelName: channelInfo?.name,
          channels: ctx.channelsConfig,
          defaultRequireMention: ctx.defaultRequireMention,
        })
        : null;
      const sender = await ctx.resolveUserName(command.user_id);
      const senderName = sender?.name ?? command.user_name ?? command.user_id;

      const auth = await authorizeSlackSlash({
        ctx,
        userId: command.user_id,
        senderName,
        isDirectMessage,
        isRoom,
        channelId: command.channel_id,
        channelName: channelInfo?.name,
        channelConfig,
        effectiveAllowFromLower,
        respond,
      });
      if (!auth.authorized) return;

      let commandAuthorized = true;
      if (isRoomish) {
        commandAuthorized = resolveCommandAuthorizedFromAuthorizers({
          useAccessGroups: ctx.useAccessGroups,
          authorizers: [
            { configured: effectiveAllowFromLower.length > 0, allowed: auth.ownerAllowed },
            {
              configured: Array.isArray(channelConfig?.users) && channelConfig.users.length > 0,
              allowed: false,
            }, // Simplified user logic
          ],
        });
        if (ctx.useAccessGroups && !commandAuthorized) {
          await respond({
            text: "You are not authorized to use this command.",
            response_type: "ephemeral",
          });
          return;
        }
      }

      if (commandDefinition && supportsInteractiveArgMenus) {
        const menu = resolveCommandArgMenu({ command: commandDefinition, args: commandArgs, cfg });
        if (menu) {
          const commandLabel = commandDefinition.nativeName ?? commandDefinition.key;
          const choices = menu.choices;
          const blocks = buildSlackCommandArgMenuBlocks({
            title:
              menu.title ?? `Choose ${menu.arg.description || menu.arg.name} for /${commandLabel}.`,
            command: commandLabel,
            arg: menu.arg.name,
            choices,
            userId: command.user_id,
          });
          await respond({
            text: menu.title ?? `Choose ${menu.arg.name}`,
            blocks,
            response_type: "ephemeral",
          });
          return;
        }
      }

      const route = resolveAgentRoute({
        cfg,
        channel: "slack",
        accountId: account.accountId,
        teamId: ctx.teamId || undefined,
        peer: {
          kind: isDirectMessage ? "dm" : isRoom ? "channel" : "group",
          id: isDirectMessage ? command.user_id : command.channel_id,
        },
      });
      const roomLabel = channelInfo?.name ? `#${channelInfo.name}` : `#${command.channel_id}`;
      const groupSystemPrompt = [
        channelInfo?.topic,
        channelInfo?.purpose,
        channelConfig?.systemPrompt,
      ]
        .filter(Boolean)
        .join("\n\n");

      const ctxPayload = buildSlashInboundContext({
        prompt,
        commandArgs,
        userId: command.user_id,
        channelId: command.channel_id,
        senderName,
        roomLabel,
        isDirectMessage,
        isRoom,
        isRoomish,
        groupSystemPrompt,
        route,
        slashCommand,
        commandAuthorized,
        triggerId: command.trigger_id,
      });

      const { counts } = await dispatchReplyWithDispatcher({
        ctx: ctxPayload,
        cfg,
        dispatcherOptions: {
          responsePrefix: resolveEffectiveMessagesConfig(cfg, route.agentId).responsePrefix,
          deliver: async (payload) => {
            await deliverSlackSlashReplies({
              replies: [payload],
              respond,
              ephemeral: slashCommand.ephemeral,
              textLimit: ctx.textLimit,
              chunkMode: resolveChunkMode(cfg, "slack", route.accountId),
              tableMode: resolveMarkdownTableMode({
                cfg,
                channel: "slack",
                accountId: route.accountId,
              }),
            });
          },
          onError: (err, info) =>
            runtime.error?.(danger(`slack slash ${info.kind} reply failed: ${String(err)}`)),
        },
        replyOptions: { skillFilter: channelConfig?.skills },
      });
      if (counts.final + counts.tool + counts.block === 0) {
        await deliverSlackSlashReplies({
          replies: [],
          respond,
          ephemeral: slashCommand.ephemeral,
          textLimit: ctx.textLimit,
          chunkMode: resolveChunkMode(cfg, "slack", route.accountId),
          tableMode: resolveMarkdownTableMode({
            cfg,
            channel: "slack",
            accountId: route.accountId,
          }),
        });
      }
    } catch (err) {
      runtime.error?.(danger(`slack slash handler failed: ${String(err)}`));
      await respond({
        text: "Sorry, something went wrong handling that command.",
        response_type: "ephemeral",
      });
    }
  };

  const nativeEnabled = resolveNativeCommandsEnabled({
    providerId: "slack",
    providerSetting: account.config.commands?.native,
    globalSetting: cfg.commands?.native,
  });
  const nativeSkillsEnabled = resolveNativeSkillsEnabled({
    providerId: "slack",
    providerSetting: account.config.commands?.nativeSkills,
    globalSetting: cfg.commands?.nativeSkills,
  });
  const nativeCommands = nativeEnabled
    ? listNativeCommandSpecsForConfig(cfg, {
      skillCommands: nativeSkillsEnabled ? listSkillCommandsForAgents({ cfg }) : [],
      provider: "slack",
    })
    : [];

  if (nativeCommands.length > 0) {
    for (const command of nativeCommands) {
      ctx.app.command(
        `/${command.name}`,
        async ({ command: cmd, ack, respond }: SlackCommandMiddlewareArgs) => {
          const def = findCommandByNativeName(command.name, "slack");
          const rawText = cmd.text?.trim() ?? "";
          const args = def
            ? parseCommandArgs(def, rawText)
            : rawText
              ? { raw: rawText }
              : undefined;
          const prompt = def
            ? buildCommandTextFromArgs(def, args as CommandArgs)
            : rawText
              ? `/${command.name} ${rawText}`
              : `/${command.name}`;
          await handleSlashCommand({
            command: cmd,
            ack,
            respond,
            prompt,
            commandArgs: args as CommandArgs,
            commandDefinition: def ?? undefined,
          });
        },
      );
    }
  } else if (slashCommand.enabled) {
    ctx.app.command(
      buildSlackSlashCommandMatcher(slashCommand.name),
      async ({ command, ack, respond }: SlackCommandMiddlewareArgs) => {
        await handleSlashCommand({ command, ack, respond, prompt: command.text?.trim() ?? "" });
      },
    );
  }

  if (nativeCommands.length === 0 || !supportsInteractiveArgMenus) return;

  (ctx.app as any).action(SLACK_COMMAND_ARG_ACTION_ID, async (actionArgs: any) => {
    const { ack, body, respond } = actionArgs;
    const action = actionArgs.action as any;
    await ack();
    const currentRespond =
      respond ??
      (async (payload: any) => {
        if (!body.channel?.id || !body.user?.id) return;
        await ctx.app.client.chat.postEphemeral({
          token: ctx.botToken,
          channel: body.channel.id,
          user: body.user.id,
          text: payload.text,
          blocks: payload.blocks,
        });
      });
    const parsed = parseSlackCommandArgValue(action?.value);
    if (!parsed || (body.user?.id && parsed.userId !== body.user.id)) {
      await currentRespond({
        text: parsed ? "That menu is for another user." : "Sorry, that button is no longer valid.",
        response_type: "ephemeral",
      } as any);
      return;
    }
    const def = findCommandByNativeName(parsed.command, "slack");
    const cmdArgs: CommandArgs = { values: { [parsed.arg]: parsed.value } };
    const prompt = def
      ? buildCommandTextFromArgs(def, cmdArgs)
      : `/${parsed.command} ${parsed.value}`;
    const user = body.user;
    const userName = (user as any)?.name || (user as any)?.username || user?.id || "";
    await handleSlashCommand({
      command: {
        user_id: user?.id ?? "",
        user_name: userName,
        channel_id: body.channel?.id ?? "",
        channel_name: body.test_channel?.name || body.channel?.name || body.channel?.id || "",
        trigger_id: (body as any).trigger_id || String(Date.now()),
      } as any,
      ack: async () => { },
      respond: currentRespond as any,
      prompt,
      commandArgs: cmdArgs,
      commandDefinition: def ?? undefined,
    });
  });
}
