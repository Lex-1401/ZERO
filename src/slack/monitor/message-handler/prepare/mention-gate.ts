import {
  buildMentionRegexes,
  matchesMentionWithExplicit,
} from "../../../../auto-reply/reply/mentions.js";
import { resolveMentionGatingWithBypass } from "../../../../channels/mention-gating.js";
import type { SlackMessageEvent } from "../../../types.js";
import type { SlackMonitorContext } from "../../context.js";

export function resolveSlackMessageMentionGate(params: {
  ctx: SlackMonitorContext;
  message: SlackMessageEvent;
  agentId: string;
  isDirectMessage: boolean;
  isRoom: boolean;
  wasMentionedRequested?: boolean;
  shouldRequireMention: boolean;
  allowTextCommands: boolean;
  hasControlCommand: boolean;
  commandAuthorized: boolean;
}) {
  const {
    ctx,
    message,
    agentId,
    isDirectMessage,
    isRoom,
    wasMentionedRequested,
    shouldRequireMention,
    allowTextCommands,
    hasControlCommand,
    commandAuthorized,
  } = params;

  const mentionRegexes = buildMentionRegexes(ctx.cfg, agentId);
  const hasAnyMention = /<@[^>]+>/.test(message.text ?? "");
  const explicitlyMentioned = Boolean(
    ctx.botUserId && message.text?.includes(`<@${ctx.botUserId}>`),
  );
  const wasMentioned =
    wasMentionedRequested ??
    (!isDirectMessage &&
      matchesMentionWithExplicit({
        text: message.text ?? "",
        mentionRegexes,
        explicit: {
          hasAnyMention,
          isExplicitlyMentioned: explicitlyMentioned,
          canResolveExplicit: Boolean(ctx.botUserId),
        },
      }));
  const implicitMention = Boolean(
    !isDirectMessage &&
    ctx.botUserId &&
    message.thread_ts &&
    message.parent_user_id === ctx.botUserId,
  );
  const canDetectMention = Boolean(ctx.botUserId) || mentionRegexes.length > 0;

  const gate = resolveMentionGatingWithBypass({
    isGroup: isRoom,
    requireMention: Boolean(shouldRequireMention),
    canDetectMention,
    wasMentioned,
    implicitMention,
    hasAnyMention,
    allowTextCommands,
    hasControlCommand,
    commandAuthorized,
  });

  return {
    gate,
    canDetectMention,
    explicitlyMentioned,
    wasMentioned,
    implicitMention,
    hasAnyMention,
  };
}
