
import { HttpError } from "grammy";
import type { ApiClientOptions } from "grammy";
import type { InlineKeyboardMarkup, InlineKeyboardButton } from "@grammyjs/types";
import { loadConfig } from "../../config/config.js";
import { isDiagnosticFlagEnabled } from "../../infra/diagnostic-flags.js";
import { redactSensitiveText } from "../../logging/redact.js";
import { formatUncaughtError } from "../../infra/errors.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { type ResolvedTelegramAccount } from "../accounts.js";
import { makeProxyFetch } from "../proxy.js";
import { resolveTelegramFetch } from "../fetch.js";
import { stripTelegramInternalPrefixes } from "../targets.js";
import { mediaKindFromMime } from "../../media/constants.js";
import type { TelegramSendOpts } from "./types.js";

const diagLogger = createSubsystemLogger("telegram/diagnostic");

export function createTelegramHttpLogger(cfg: ReturnType<typeof loadConfig>) {
    if (!isDiagnosticFlagEnabled("telegram.http", cfg)) return () => { };
    return (label: string, err: unknown) => {
        if (!(err instanceof HttpError)) return;
        const detail = redactSensitiveText(formatUncaughtError(err.error ?? err));
        diagLogger.warn(`telegram http error (${label}): ${detail}`);
    };
}

export function resolveTelegramClientOptions(account: ResolvedTelegramAccount): ApiClientOptions | undefined {
    const proxyUrl = account.config.proxy?.trim();
    const proxyFetch = proxyUrl ? makeProxyFetch(proxyUrl) : undefined;
    const fetchImpl = resolveTelegramFetch(proxyFetch);
    const timeoutSeconds = typeof account.config.timeoutSeconds === "number" && Number.isFinite(account.config.timeoutSeconds) ? Math.max(1, Math.floor(account.config.timeoutSeconds)) : undefined;
    return fetchImpl || timeoutSeconds ? { ...(fetchImpl ? { fetch: fetchImpl as any } : {}), ...(timeoutSeconds ? { timeoutSeconds } : {}) } : undefined;
}

export function resolveToken(explicit: string | undefined, params: { accountId: string; token: string }) {
    const t = explicit?.trim() || params.token?.trim();
    if (!t) throw new Error(`Telegram bot token missing for account "${params.accountId}".`);
    return t;
}

export function normalizeChatId(to: string): string {
    let n = stripTelegramInternalPrefixes(to.trim());
    if (!n) throw new Error("Recipient is required for Telegram sends");
    const m = /^https?:\/\/t\.me\/([A-Za-z0-9_]+)$/i.exec(n) ?? /^t\.me\/([A-Za-z0-9_]+)$/i.exec(n);
    if (m?.[1]) n = `@${m[1]}`;
    if (n.startsWith("@") || /^-?\d+$/.test(n)) return n;
    if (/^[A-Za-z0-9_]{5,}$/i.test(n)) return `@${n}`;
    return n;
}

export function normalizeMessageId(raw: string | number): number {
    const p = typeof raw === "string" ? Number.parseInt(raw.trim(), 10) : Math.trunc(raw);
    if (Number.isFinite(p)) return p;
    throw new Error("Message id is required for Telegram actions");
}

export function buildInlineKeyboard(buttons?: TelegramSendOpts["buttons"]): InlineKeyboardMarkup | undefined {
    if (!buttons?.length) return undefined;
    const rows = buttons.map(row => row.filter(b => b?.text && b?.callback_data).map((b): InlineKeyboardButton => ({ text: b.text, callback_data: b.callback_data }))).filter(r => r.length > 0);
    return rows.length ? { inline_keyboard: rows } : undefined;
}

export function inferFilename(kind: ReturnType<typeof mediaKindFromMime>) {
    switch (kind) {
        case "image": return "image.jpg";
        case "video": return "video.mp4";
        case "audio": return "audio.ogg";
        default: return "file.bin";
    }
}

export const PARSE_ERR_RE = /can't parse entities|parse entities|find end of the entity/i;
