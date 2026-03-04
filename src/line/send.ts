
/**
 * LINE Message Sending
 *
 * Implements the messaging API for LINE bot integration.
 * Delegated to src/line/sender/ for maintainability and Atomic Modularity.
 */

import { type messagingApi } from "@line/bot-sdk";
import { type LineSendOpts, type Message, type TextMessage, type ImageMessage, type LineSendResult } from "./sender/types.js";
import {
  sendMessageLine as send,
  pushMessageLine as push,
  pushMessagesLine as pushMulti,
  replyMessageLine as reply,
  showLoadingAnimation as loading,
  getUserProfile as profile,
  getUserDisplayName as displayName,
} from "./sender/actions.js";
import { type FlexContainer } from "./flex-templates.js";

export type { LineSendOpts, Message, TextMessage, ImageMessage };

export async function sendMessageLine(to: string, text: string, opts: LineSendOpts = {}): Promise<LineSendResult> {
  return send(to, text, opts);
}

export async function pushMessageLine(to: string, text: string, opts: LineSendOpts = {}): Promise<LineSendResult> {
  return push(to, text, opts);
}

export async function pushMessagesLine(to: string, messages: Message[], opts: LineSendOpts = {}): Promise<LineSendResult> {
  return pushMulti(to, messages, opts);
}

export async function replyMessageLine(replyToken: string, messages: Message[], opts: any = {}): Promise<void> {
  return reply(replyToken, messages, opts);
}

export async function showLoadingAnimation(userId: string, opts: { loadingSeconds?: number; accountId?: string } = {}): Promise<void> {
  return loading(userId, opts);
}

export async function getUserProfile(userId: string, opts: LineSendOpts = {}): Promise<{ displayName: string; pictureUrl?: string } | null> {
  return profile(userId, opts);
}

export async function getUserDisplayName(userId: string, opts: LineSendOpts = {}): Promise<string> {
  return displayName(userId, opts);
}

// Helpers for pushing specific types
export async function pushImageMessage(to: string, originalContentUrl: string, previewImageUrl: string, opts: LineSendOpts = {}): Promise<LineSendResult> {
  return pushMulti(to, [createImageMessage(originalContentUrl, previewImageUrl)], opts);
}

export async function pushLocationMessage(to: string, location: { title: string; address: string; latitude: number; longitude: number }, opts: LineSendOpts = {}): Promise<LineSendResult> {
  return pushMulti(to, [createLocationMessage(location)], opts);
}

export async function pushFlexMessage(to: string, altText: string, contents: any, opts: LineSendOpts = {}): Promise<LineSendResult> {
  return pushMulti(to, [createFlexMessage(altText, contents)], opts);
}

export async function pushTemplateMessage(to: string, altText: string, template: any, opts: LineSendOpts = {}): Promise<LineSendResult> {
  return pushMulti(to, [{ type: "template", altText, template }], opts);
}

export async function pushTextMessageWithQuickReplies(to: string, text: string, quickReplies: string[], opts: LineSendOpts = {}): Promise<LineSendResult> {
  return pushMulti(to, [createTextMessageWithQuickReplies(text, quickReplies)], opts);
}

// Message Creators
export function createTextMessage(text: string): TextMessage {
  return { type: "text", text };
}

export function createImageMessage(originalContentUrl: string, previewImageUrl?: string): ImageMessage {
  return {
    type: "image",
    originalContentUrl,
    previewImageUrl: previewImageUrl ?? originalContentUrl
  };
}

export function createLocationMessage(location: { title: string; address: string; latitude: number; longitude: number }): any {
  return { type: "location", ...location };
}

export function createFlexMessage(altText: string, contents: FlexContainer): any {
  return { type: "flex", altText, contents };
}

export function createQuickReplyItems(labels: string[]): messagingApi.QuickReply {
  return {
    items: labels.slice(0, 13).map((label) => ({
      type: "action",
      action: {
        type: "message",
        label: label.slice(0, 20),
        text: label,
      },
    })),
  };
}

export function createTextMessageWithQuickReplies(text: string, quickReplies: string[]): any {
  return {
    type: "text",
    text,
    quickReply: createQuickReplyItems(quickReplies),
  };
}
