
import { messagingApi } from "@line/bot-sdk";
import { type LineSendOpts, type Message, type LineSendResult } from "./types.js";
import { loadConfig } from "../../config/config.js";
import { logVerbose } from "../../globals.js";
import { resolveLineAccount } from "../accounts.js";

const userProfileCache = new Map<string, { displayName: string; pictureUrl?: string; fetchedAt: number }>();
const CACHE_TTL = 3600_000; // 1 hour

function getClient(opts: LineSendOpts = {}): messagingApi.MessagingApiClient {
    const cfg = loadConfig();
    const account = resolveLineAccount({
        cfg,
        accountId: opts.accountId,
    });

    const token = opts.channelAccessToken?.trim() || account.channelAccessToken;
    if (!token) {
        throw new Error(`LINE channel access token missing for account "${account.accountId}"`);
    }

    return new messagingApi.MessagingApiClient({
        channelAccessToken: token,
    });
}

export async function sendMessageLine(to: string, text: string, opts: LineSendOpts = {}): Promise<LineSendResult> {
    return pushMessagesLine(to, [{ type: "text", text }], opts);
}

export async function pushMessageLine(to: string, text: string, opts: LineSendOpts = {}): Promise<LineSendResult> {
    return pushMessagesLine(to, [{ type: "text", text }], opts);
}

export async function pushMessagesLine(to: string, messages: Message[], opts: LineSendOpts = {}): Promise<LineSendResult> {
    const client = getClient(opts);
    const response = await client.pushMessage({
        to,
        messages: messages as messagingApi.Message[],
    });

    if (opts.verbose) {
        logVerbose(`line: pushed ${messages.length} messages to ${to}`);
    }

    return {
        messageId: response.sentMessages?.[0]?.id ?? "unknown",
        chatId: to,
    };
}

export async function replyMessageLine(replyToken: string, messages: Message[], opts: LineSendOpts = {}): Promise<void> {
    const client = getClient(opts);
    await client.replyMessage({
        replyToken,
        messages: messages as messagingApi.Message[],
    });

    if (opts.verbose) {
        logVerbose(`line: replied to token ${replyToken}`);
    }
}

export async function showLoadingAnimation(userId: string, opts: { loadingSeconds?: number; accountId?: string } = {}): Promise<void> {
    const client = getClient({ accountId: opts.accountId });
    await client.showLoadingAnimation({
        chatId: userId,
        loadingSeconds: opts.loadingSeconds ?? 20,
    });
}

export async function getUserProfile(userId: string, opts: LineSendOpts = {}): Promise<{ displayName: string; pictureUrl?: string } | null> {
    // Hit cache first
    const cached = userProfileCache.get(userId);
    if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL) {
        return { displayName: cached.displayName, pictureUrl: cached.pictureUrl };
    }

    const client = getClient(opts);
    try {
        const profile = await client.getProfile(userId);
        const result = {
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
        };

        userProfileCache.set(userId, {
            ...result,
            fetchedAt: Date.now(),
        });

        return result;
    } catch (err) {
        logVerbose(`line: failed to fetch profile for ${userId}: ${String(err)}`);
        return null;
    }
}

export async function getUserDisplayName(userId: string, opts: LineSendOpts = {}): Promise<string> {
    const profile = await getUserProfile(userId, opts);
    return profile?.displayName ?? userId;
}
