import { finalizeInboundContext } from "../../../auto-reply/reply/inbound-context.js";
import { resolveConversationLabel } from "../../../channels/conversation-label.js";
import type { CommandArgs } from "../../../auto-reply/commands-registry.js";

export function buildSlashInboundContext(params: {
  prompt: string;
  commandArgs?: CommandArgs;
  userId: string;
  channelId: string;
  senderName: string;
  roomLabel: string;
  isDirectMessage: boolean;
  isRoom: boolean;
  isRoomish: boolean;
  groupSystemPrompt?: string;
  route: { agentId: string; sessionKey: string; accountId: string };
  slashCommand: { sessionPrefix: string };
  commandAuthorized: boolean;
  triggerId: string;
}) {
  const {
    prompt,
    commandArgs,
    userId,
    channelId,
    senderName,
    roomLabel,
    isDirectMessage,
    isRoom,
    isRoomish,
    groupSystemPrompt,
    route,
    slashCommand,
    commandAuthorized,
    triggerId,
  } = params;

  return finalizeInboundContext({
    Body: prompt,
    RawBody: prompt,
    CommandBody: prompt,
    CommandArgs: commandArgs,
    From: isDirectMessage
      ? `slack:${userId}`
      : isRoom
        ? `slack:channel:${channelId}`
        : `slack:group:${channelId}`,
    To: `slash:${userId}`,
    ChatType: isDirectMessage ? "direct" : "channel",
    ConversationLabel:
      resolveConversationLabel({
        ChatType: isDirectMessage ? "direct" : "channel",
        SenderName: senderName,
        GroupSubject: isRoomish ? roomLabel : undefined,
        From: isDirectMessage
          ? `slack:${userId}`
          : isRoom
            ? `slack:channel:${channelId}`
            : `slack:group:${channelId}`,
      }) ?? (isDirectMessage ? senderName : roomLabel),
    GroupSubject: isRoomish ? roomLabel : undefined,
    GroupSystemPrompt: isRoomish ? groupSystemPrompt : undefined,
    SenderName: senderName,
    SenderId: userId,
    Provider: "slack" as const,
    Surface: "slack" as const,
    WasMentioned: true,
    MessageSid: triggerId,
    Timestamp: Date.now(),
    SessionKey: `agent:${route.agentId}:${slashCommand.sessionPrefix}:${userId}`.toLowerCase(),
    CommandTargetSessionKey: route.sessionKey,
    AccountId: route.accountId,
    CommandSource: "native" as const,
    CommandAuthorized: commandAuthorized,
    OriginatingChannel: "slack" as const,
    OriginatingTo: `user:${userId}`,
  });
}
