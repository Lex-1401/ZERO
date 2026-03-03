import { logVerbose } from "../../../globals.js";
import { enqueueSystemEvent } from "../../../infra/system-events.js";
import { resolveAgentRoute } from "../../../routing/resolve-route.js";
import {
  formatSignalSenderDisplay,
  resolveSignalPeerId,
  formatSignalSenderId,
} from "../../identity.js";
import type { SignalEventHandlerDeps } from "../event-handler.types.js";

export async function handleSignalReaction(params: {
  deps: SignalEventHandlerDeps;
  envelope: any;
  reaction: any;
  sender: any;
}) {
  const { deps, envelope, reaction, sender } = params;
  if (reaction.isRemove) return;

  const emojiLabel = reaction.emoji?.trim() || "emoji";
  const senderDisplay = formatSignalSenderDisplay(sender);
  const senderName = envelope.sourceName ?? senderDisplay;
  logVerbose(`signal reaction: ${emojiLabel} from ${senderName}`);

  const targets = deps.resolveSignalReactionTargets(reaction);
  const shouldNotify = deps.shouldEmitSignalReactionNotification({
    mode: deps.reactionMode,
    account: deps.account,
    targets,
    sender,
    allowlist: deps.reactionAllowlist,
  });
  if (!shouldNotify) return;

  const groupId = reaction.groupInfo?.groupId ?? undefined;
  const groupName = reaction.groupInfo?.groupName ?? undefined;
  const isGroup = Boolean(groupId);
  const senderPeerId = resolveSignalPeerId(sender);
  const route = resolveAgentRoute({
    cfg: deps.cfg,
    channel: "signal",
    accountId: deps.accountId,
    peer: {
      kind: isGroup ? "group" : "dm",
      id: isGroup ? (groupId ?? "unknown") : senderPeerId,
    },
  });

  const groupLabel = isGroup ? `${groupName ?? "Signal Group"} id:${groupId}` : undefined;
  const messageId = reaction.targetSentTimestamp ? String(reaction.targetSentTimestamp) : "unknown";
  const text = deps.buildSignalReactionSystemEventText({
    emojiLabel,
    actorLabel: senderName,
    messageId,
    targetLabel: targets[0]?.display,
    groupLabel,
  });

  const contextKey = [
    "signal",
    "reaction",
    "added",
    messageId,
    formatSignalSenderId(sender),
    emojiLabel,
    groupId ?? "",
  ]
    .filter(Boolean)
    .join(":");

  enqueueSystemEvent(text, { sessionKey: route.sessionKey, contextKey });
}
