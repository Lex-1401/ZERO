
import type { Bot } from "grammy";
import type { RetryConfig } from "../../infra/retry.js";

export type TelegramSendOpts = {
    token?: string;
    accountId?: string;
    verbose?: boolean;
    mediaUrl?: string;
    maxBytes?: number;
    api?: Bot["api"];
    retry?: RetryConfig;
    textMode?: "markdown" | "html";
    plainText?: string;
    asVoice?: boolean;
    replyToMessageId?: number;
    messageThreadId?: number;
    buttons?: Array<Array<{ text: string; callback_data: string }>>;
};

export type TelegramSendResult = {
    messageId: string;
    chatId: string;
};

export type TelegramReactionOpts = {
    token?: string;
    accountId?: string;
    api?: Bot["api"];
    remove?: boolean;
    verbose?: boolean;
    retry?: RetryConfig;
};

export type TelegramDeleteOpts = {
    token?: string;
    accountId?: string;
    verbose?: boolean;
    api?: Bot["api"];
    retry?: RetryConfig;
};
