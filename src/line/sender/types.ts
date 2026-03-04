
export interface LineSendOpts {
    channelAccessToken?: string;
    accountId?: string;
    verbose?: boolean;
    mediaUrl?: string;
    replyToken?: string;
}

export interface LineSendResult {
    messageId: string;
    chatId: string;
}

export type Message = { type: string;[key: string]: any };
export type TextMessage = Message & { type: "text"; text: string };
export type ImageMessage = Message & { type: "image"; originalContentUrl: string; previewImageUrl: string };
