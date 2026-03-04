import type { ZEROConfig } from "../../config/config.js";
import type { HistoryEntry } from "../../auto-reply/reply/history.js";

export type SignalEventHandlerDeps = {
  accountId: string;
  cfg: ZEROConfig;
  runtime: any;
  baseUrl: string;
  account?: string;
  allowFrom: string[];
  groupAllowFrom: string[];
  dmPolicy: string;
  groupPolicy: string;
  mediaMaxBytes: number;
  ignoreAttachments: boolean;
  sendReadReceipts: boolean;
  readReceiptsViaDaemon: boolean;
  blockStreaming?: boolean;
  historyLimit: number;
  groupHistories: Map<string, HistoryEntry[]>;
  textLimit: number;
  isSignalReactionMessage: (obj: any) => boolean;
  fetchAttachment: (params: {
    baseUrl: string;
    account?: string;
    attachment: any;
    sender?: string;
    groupId?: string;
    maxBytes: number;
  }) => Promise<{ path: string; contentType?: string } | null>;
  deliverReplies: (params: {
    replies: any[];
    target: string;
    baseUrl: string;
    account?: string;
    accountId?: string;
    runtime: any;
    maxBytes: number;
    textLimit: number;
  }) => Promise<void>;
  resolveSignalReactionTargets: (reaction: any) => any[];
  shouldEmitSignalReactionNotification: (params: any) => boolean;
  buildSignalReactionSystemEventText: (params: any) => string;
  reactionMode: string;
  reactionAllowlist: string[];
};

export type SignalReceivePayload = {
  envelope?: {
    source?: string;
    sourceDevice?: number;
    sourceName?: string;
    sourceUuid?: string;
    sourceE164?: string;
    timestamp?: number;
    syncMessage?: any;
    dataMessage?: any;
    reactionMessage?: any;
    editMessage?: { dataMessage?: any };
  };
  exception?: {
    message?: string;
  };
};
