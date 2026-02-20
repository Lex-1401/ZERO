import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { readStringParam } from "../../agents/tools/common.js";
import { assertMediaNotDataUrl, resolveSandboxedMediaSource } from "../../agents/sandbox-paths.js";
import type {
  ChannelId,
  ChannelMessageActionName,
  ChannelThreadingToolContext,
} from "../../channels/plugins/types.js";
import type { ZEROConfig } from "../../config/config.js";
import { loadWebMedia } from "../../web/media.js";
import { extensionForMime } from "../../media/mime.js";
import { parseSlackTarget } from "../../slack/targets.js";
import { resolveMessageChannelSelection } from "./channel-selection.js";
import {
  applyCrossContextDecoration,
  buildCrossContextDecoration,
  type CrossContextDecoration,
  shouldApplyCrossContextMarker,
} from "./outbound-policy.js";
import { resolveChannelTarget, type ResolvedMessagingTarget } from "./target-resolver.js";
import type {
  MessageActionRunResult,
  RunMessageActionParams,
  MessageActionRunnerGateway,
} from "./message-action-runner.types.js";

export function getToolResult(
  result: MessageActionRunResult,
): AgentToolResult<unknown> | undefined {
  return "toolResult" in result ? result.toolResult : undefined;
}

export function extractToolPayload(result: AgentToolResult<unknown>): unknown {
  if (result.details !== undefined) return result.details;
  const textBlock = Array.isArray(result.content)
    ? result.content.find(
        (block) =>
          block &&
          typeof block === "object" &&
          (block as { type?: unknown }).type === "text" &&
          typeof (block as { text?: unknown }).text === "string",
      )
    : undefined;
  const text = (textBlock as { text?: string } | undefined)?.text;
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return result.content ?? result;
}

export function applyCrossContextMessageDecoration({
  params,
  message,
  decoration,
  preferEmbeds,
}: {
  params: Record<string, unknown>;
  message: string;
  decoration: CrossContextDecoration;
  preferEmbeds: boolean;
}): string {
  const applied = applyCrossContextDecoration({
    message,
    decoration,
    preferEmbeds,
  });
  params.message = applied.message;
  if (applied.embeds?.length) {
    params.embeds = applied.embeds;
  }
  return applied.message;
}

export async function maybeApplyCrossContextMarker(params: {
  cfg: ZEROConfig;
  channel: ChannelId;
  action: ChannelMessageActionName;
  target: string;
  toolContext?: ChannelThreadingToolContext;
  accountId?: string | null;
  args: Record<string, unknown>;
  message: string;
  preferEmbeds: boolean;
}): Promise<string> {
  if (!shouldApplyCrossContextMarker(params.action) || !params.toolContext) {
    return params.message;
  }
  const decoration = await buildCrossContextDecoration({
    cfg: params.cfg,
    channel: params.channel,
    target: params.target,
    toolContext: params.toolContext,
    accountId: params.accountId ?? undefined,
  });
  if (!decoration) return params.message;
  return applyCrossContextMessageDecoration({
    params: params.args,
    message: params.message,
    decoration,
    preferEmbeds: params.preferEmbeds,
  });
}

export function readBooleanParam(
  params: Record<string, unknown>,
  key: string,
): boolean | undefined {
  const raw = params[key];
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
  }
  return undefined;
}

export function resolveSlackAutoThreadId(params: {
  to: string;
  toolContext?: ChannelThreadingToolContext;
}): string | undefined {
  const context = params.toolContext;
  if (!context?.currentThreadTs || !context.currentChannelId) return undefined;
  // Only mirror auto-threading when Slack would reply in the active thread for this channel.
  if (context.replyToMode !== "all" && context.replyToMode !== "first") return undefined;
  const parsedTarget = parseSlackTarget(params.to, { defaultKind: "channel" });
  if (!parsedTarget || parsedTarget.kind !== "channel") return undefined;
  if (parsedTarget.id.toLowerCase() !== context.currentChannelId.toLowerCase()) return undefined;
  if (context.replyToMode === "first" && context.hasRepliedRef?.value) return undefined;
  return context.currentThreadTs;
}

export function resolveAttachmentMaxBytes(params: {
  cfg: ZEROConfig;
  channel: ChannelId;
  accountId?: string | null;
}): number | undefined {
  const fallback = params.cfg.agents?.defaults?.mediaMaxMb;
  if (params.channel !== "bluebubbles") {
    return typeof fallback === "number" ? fallback * 1024 * 1024 : undefined;
  }
  const accountId = typeof params.accountId === "string" ? params.accountId.trim() : "";
  const channelCfg = params.cfg.channels?.bluebubbles;
  const channelObj =
    channelCfg && typeof channelCfg === "object"
      ? (channelCfg as Record<string, unknown>)
      : undefined;
  const channelMediaMax =
    typeof channelObj?.mediaMaxMb === "number" ? channelObj.mediaMaxMb : undefined;
  const accountsObj =
    channelObj?.accounts && typeof channelObj.accounts === "object"
      ? (channelObj.accounts as Record<string, unknown>)
      : undefined;
  const accountCfg = accountId && accountsObj ? accountsObj[accountId] : undefined;
  const accountMediaMax =
    accountCfg && typeof accountCfg === "object"
      ? (accountCfg as Record<string, unknown>).mediaMaxMb
      : undefined;
  const limitMb =
    (typeof accountMediaMax === "number" ? accountMediaMax : undefined) ??
    channelMediaMax ??
    params.cfg.agents?.defaults?.mediaMaxMb;
  return typeof limitMb === "number" ? limitMb * 1024 * 1024 : undefined;
}

export function inferAttachmentFilename(params: {
  mediaHint?: string;
  contentType?: string;
}): string | undefined {
  const mediaHint = params.mediaHint?.trim();
  if (mediaHint) {
    try {
      if (mediaHint.startsWith("file://")) {
        const filePath = fileURLToPath(mediaHint);
        const base = path.basename(filePath);
        if (base) return base;
      } else if (/^https?:\/\//i.test(mediaHint)) {
        const url = new URL(mediaHint);
        const base = path.basename(url.pathname);
        if (base) return base;
      } else {
        const base = path.basename(mediaHint);
        if (base) return base;
      }
    } catch {
      // fall through to content-type based default
    }
  }
  const ext = params.contentType ? extensionForMime(params.contentType) : undefined;
  return ext ? `attachment${ext}` : "attachment";
}

export function normalizeBase64Payload(params: { base64?: string; contentType?: string }): {
  base64?: string;
  contentType?: string;
} {
  if (!params.base64) {
    return { base64: params.base64, contentType: params.contentType };
  }
  const match = /^data:([^;]+);base64,(.*)$/i.exec(params.base64.trim());
  if (!match) {
    return { base64: params.base64, contentType: params.contentType };
  }
  const [, mime, payload] = match;
  return {
    base64: payload,
    contentType: params.contentType ?? mime,
  };
}

export async function normalizeSandboxMediaParams(params: {
  args: Record<string, unknown>;
  sandboxRoot?: string;
}): Promise<void> {
  const sandboxRoot = params.sandboxRoot?.trim();
  const mediaKeys: Array<"media" | "path" | "filePath"> = ["media", "path", "filePath"];
  for (const key of mediaKeys) {
    const raw = readStringParam(params.args, key, { trim: false });
    if (!raw) {
      continue;
    }
    assertMediaNotDataUrl(raw);
    if (!sandboxRoot) {
      continue;
    }
    const normalized = await resolveSandboxedMediaSource({ media: raw, sandboxRoot });
    if (normalized !== raw) {
      params.args[key] = normalized;
    }
  }
}

export async function normalizeSandboxMediaList(params: {
  values: string[];
  sandboxRoot?: string;
}): Promise<string[]> {
  const sandboxRoot = params.sandboxRoot?.trim();
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const value of params.values) {
    const raw = value?.trim();
    if (!raw) {
      continue;
    }
    assertMediaNotDataUrl(raw);
    const resolved = sandboxRoot
      ? await resolveSandboxedMediaSource({ media: raw, sandboxRoot })
      : raw;
    if (seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    normalized.push(resolved);
  }
  return normalized;
}

export async function hydrateSetGroupIconParams(params: {
  cfg: ZEROConfig;
  channel: ChannelId;
  accountId?: string | null;
  args: Record<string, unknown>;
  action: ChannelMessageActionName;
  dryRun?: boolean;
}): Promise<void> {
  if (params.action !== "setGroupIcon") return;

  const mediaHint = readStringParam(params.args, "media", { trim: false });
  const fileHint =
    readStringParam(params.args, "path", { trim: false }) ??
    readStringParam(params.args, "filePath", { trim: false });
  const contentTypeParam =
    readStringParam(params.args, "contentType") ?? readStringParam(params.args, "mimeType");

  const rawBuffer = readStringParam(params.args, "buffer", { trim: false });
  const normalized = normalizeBase64Payload({
    base64: rawBuffer,
    contentType: contentTypeParam ?? undefined,
  });
  if (normalized.base64 !== rawBuffer && normalized.base64) {
    params.args.buffer = normalized.base64;
    if (normalized.contentType && !contentTypeParam) {
      params.args.contentType = normalized.contentType;
    }
  }

  const filename = readStringParam(params.args, "filename");
  const mediaSource = mediaHint ?? fileHint;

  if (!params.dryRun && !readStringParam(params.args, "buffer", { trim: false }) && mediaSource) {
    const maxBytes = resolveAttachmentMaxBytes({
      cfg: params.cfg,
      channel: params.channel,
      accountId: params.accountId,
    });
    const media = await loadWebMedia(mediaSource, maxBytes);
    params.args.buffer = media.buffer.toString("base64");
    if (!contentTypeParam && media.contentType) {
      params.args.contentType = media.contentType;
    }
    if (!filename) {
      params.args.filename = inferAttachmentFilename({
        mediaHint: media.fileName ?? mediaSource,
        contentType: media.contentType ?? contentTypeParam ?? undefined,
      });
    }
  } else if (!filename) {
    params.args.filename = inferAttachmentFilename({
      mediaHint: mediaSource,
      contentType: contentTypeParam ?? undefined,
    });
  }
}

export async function hydrateSendAttachmentParams(params: {
  cfg: ZEROConfig;
  channel: ChannelId;
  accountId?: string | null;
  args: Record<string, unknown>;
  action: ChannelMessageActionName;
  dryRun?: boolean;
}): Promise<void> {
  if (params.action !== "sendAttachment") return;

  const mediaHint = readStringParam(params.args, "media", { trim: false });
  const fileHint =
    readStringParam(params.args, "path", { trim: false }) ??
    readStringParam(params.args, "filePath", { trim: false });
  const contentTypeParam =
    readStringParam(params.args, "contentType") ?? readStringParam(params.args, "mimeType");
  const caption = readStringParam(params.args, "caption", { allowEmpty: true })?.trim();
  const message = readStringParam(params.args, "message", { allowEmpty: true })?.trim();
  if (!caption && message) params.args.caption = message;

  const rawBuffer = readStringParam(params.args, "buffer", { trim: false });
  const normalized = normalizeBase64Payload({
    base64: rawBuffer,
    contentType: contentTypeParam ?? undefined,
  });
  if (normalized.base64 !== rawBuffer && normalized.base64) {
    params.args.buffer = normalized.base64;
    if (normalized.contentType && !contentTypeParam) {
      params.args.contentType = normalized.contentType;
    }
  }

  const filename = readStringParam(params.args, "filename");
  const mediaSource = mediaHint ?? fileHint;

  if (!params.dryRun && !readStringParam(params.args, "buffer", { trim: false }) && mediaSource) {
    const maxBytes = resolveAttachmentMaxBytes({
      cfg: params.cfg,
      channel: params.channel,
      accountId: params.accountId,
    });
    const media = await loadWebMedia(mediaSource, maxBytes);
    params.args.buffer = media.buffer.toString("base64");
    if (!contentTypeParam && media.contentType) {
      params.args.contentType = media.contentType;
    }
    if (!filename) {
      params.args.filename = inferAttachmentFilename({
        mediaHint: media.fileName ?? mediaSource,
        contentType: media.contentType ?? contentTypeParam ?? undefined,
      });
    }
  } else if (!filename) {
    params.args.filename = inferAttachmentFilename({
      mediaHint: mediaSource,
      contentType: contentTypeParam ?? undefined,
    });
  }
}

export function parseButtonsParam(params: Record<string, unknown>): void {
  const raw = params.buttons;
  if (typeof raw !== "string") return;
  const trimmed = raw.trim();
  if (!trimmed) {
    delete params.buttons;
    return;
  }
  try {
    params.buttons = JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error("--buttons must be valid JSON");
  }
}

export function parseCardParam(params: Record<string, unknown>): void {
  const raw = params.card;
  if (typeof raw !== "string") return;
  const trimmed = raw.trim();
  if (!trimmed) {
    delete params.card;
    return;
  }
  try {
    params.card = JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error("--card must be valid JSON");
  }
}

export async function resolveChannel(cfg: ZEROConfig, params: Record<string, unknown>) {
  const channelHint = readStringParam(params, "channel");
  const selection = await resolveMessageChannelSelection({
    cfg,
    channel: channelHint,
  });
  return selection.channel;
}

export async function resolveActionTarget(params: {
  cfg: ZEROConfig;
  channel: ChannelId;
  action: ChannelMessageActionName;
  args: Record<string, unknown>;
  accountId?: string | null;
}): Promise<ResolvedMessagingTarget | undefined> {
  let resolvedTarget: ResolvedMessagingTarget | undefined;
  const toRaw = typeof params.args.to === "string" ? params.args.to.trim() : "";
  if (toRaw) {
    const resolved = await resolveChannelTarget({
      cfg: params.cfg,
      channel: params.channel,
      input: toRaw,
      accountId: params.accountId ?? undefined,
    });
    if (resolved.ok) {
      params.args.to = resolved.target.to;
      resolvedTarget = resolved.target;
    } else {
      throw resolved.error;
    }
  }
  const channelIdRaw =
    typeof params.args.channelId === "string" ? params.args.channelId.trim() : "";
  if (channelIdRaw) {
    const resolved = await resolveChannelTarget({
      cfg: params.cfg,
      channel: params.channel,
      input: channelIdRaw,
      accountId: params.accountId ?? undefined,
      preferredKind: "group",
    });
    if (resolved.ok) {
      if (resolved.target.kind === "user") {
        throw new Error(`Channel id "${channelIdRaw}" resolved to a user target.`);
      }
      params.args.channelId = resolved.target.to.replace(/^(channel|group):/i, "");
    } else {
      throw resolved.error;
    }
  }
  return resolvedTarget;
}

export function resolveGateway(
  input: RunMessageActionParams,
): MessageActionRunnerGateway | undefined {
  if (!input.gateway) return undefined;
  return {
    url: input.gateway.url,
    token: input.gateway.token,
    timeoutMs: input.gateway.timeoutMs,
    clientName: input.gateway.clientName,
    clientDisplayName: input.gateway.clientDisplayName,
    mode: input.gateway.mode,
  };
}

export function throwIfAborted(abortSignal?: AbortSignal): void {
  if (abortSignal?.aborted) {
    const err = new Error("Message send aborted");
    err.name = "AbortError";
    throw err;
  }
}
