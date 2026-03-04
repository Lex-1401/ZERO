
import { resolveChannelDefaultAccountId } from "../../../channels/plugins/helpers.js";
import type { ChannelPlugin } from "../../../channels/plugins/types.js";
import { fetchChannelPermissionsDiscord } from "../../../discord/send.js";
import { parseDiscordTarget } from "../../../discord/targets.js";
import type { ZEROConfig } from "../../../config/config.js";
import { fetchSlackScopes } from "../../../slack/scopes.js";
import {
    type ChannelCapabilitiesReport,
    type DiscordTargetSummary,
    type DiscordPermissionsReport,
} from "./types.js";
import { REQUIRED_DISCORD_PERMISSIONS } from "./view.js";

export function normalizeTimeout(raw: unknown, fallback = 10_000) {
    const value = typeof raw === "string" ? Number(raw) : Number(raw);
    if (!Number.isFinite(value) || value <= 0) return fallback;
    return value;
}

export function summarizeDiscordTarget(raw?: string): DiscordTargetSummary | undefined {
    if (!raw) return undefined;
    const target = parseDiscordTarget(raw, { defaultKind: "channel" });
    if (!target) return { raw };
    return {
        raw,
        normalized: target.normalized,
        kind: target.kind === "channel" || target.kind === "user" ? target.kind : undefined,
        channelId: target.kind === "channel" ? target.id : undefined,
    };
}

export async function buildDiscordPermissions(params: {
    account: { token?: string; accountId?: string };
    target?: string;
}): Promise<{ target?: DiscordTargetSummary; report?: DiscordPermissionsReport }> {
    const target = summarizeDiscordTarget(params.target?.trim());
    if (!target) return {};
    if (target.kind !== "channel" || !target.channelId) {
        return { target, report: { error: "Target looks like a DM user; pass channel:<id> to audit channel permissions." } };
    }
    const token = params.account.token?.trim();
    if (!token) {
        return { target, report: { channelId: target.channelId, error: "Discord bot token missing for permission audit." } };
    }
    try {
        const perms = await fetchChannelPermissionsDiscord(target.channelId, {
            token,
            accountId: params.account.accountId ?? undefined,
        });
        const missing = REQUIRED_DISCORD_PERMISSIONS.filter((p) => !perms.permissions.includes(p));
        return {
            target,
            report: {
                channelId: perms.channelId, guildId: perms.guildId, isDm: perms.isDm,
                channelType: perms.channelType, permissions: perms.permissions,
                missingRequired: missing.length ? missing : [], raw: perms.raw,
            },
        };
    } catch (err) {
        return { target, report: { channelId: target.channelId, error: err instanceof Error ? err.message : String(err) } };
    }
}

export async function resolveChannelReports(params: {
    plugin: ChannelPlugin;
    cfg: ZEROConfig;
    timeoutMs: number;
    accountOverride?: string;
    target?: string;
}): Promise<ChannelCapabilitiesReport[]> {
    const { plugin, cfg, timeoutMs } = params;
    const accountIds = params.accountOverride
        ? [params.accountOverride]
        : (() => {
            const ids = plugin.config.listAccountIds(cfg);
            return ids.length > 0 ? ids : [resolveChannelDefaultAccountId({ plugin, cfg, accountIds: ids })];
        })();
    const reports: ChannelCapabilitiesReport[] = [];
    const listedActions = plugin.actions?.listActions?.({ cfg }) ?? [];
    const actions = Array.from(new Set<string>(["send", "broadcast", ...listedActions.map((a) => String(a))]));

    for (const accountId of accountIds) {
        const resolvedAccount = plugin.config.resolveAccount(cfg, accountId);
        const configured = plugin.config.isConfigured ? await plugin.config.isConfigured(resolvedAccount, cfg) : Boolean(resolvedAccount);
        const enabled = plugin.config.isEnabled ? plugin.config.isEnabled(resolvedAccount, cfg) : (resolvedAccount as { enabled?: boolean }).enabled !== false;
        let probe: unknown;
        if (configured && enabled && plugin.status?.probeAccount) {
            try {
                probe = await plugin.status.probeAccount({ account: resolvedAccount, timeoutMs, cfg });
            } catch (err) {
                probe = { ok: false, error: err instanceof Error ? err.message : String(err) };
            }
        }

        let slackScopes: ChannelCapabilitiesReport["slackScopes"];
        if (plugin.id === "slack" && configured && enabled) {
            const botToken = (resolvedAccount as { botToken?: string }).botToken?.trim();
            const userToken = (resolvedAccount as { config?: { userToken?: string } }).config?.userToken?.trim();
            const scopeReports: NonNullable<ChannelCapabilitiesReport["slackScopes"]> = [];
            scopeReports.push({ tokenType: "bot", result: botToken ? await fetchSlackScopes(botToken, timeoutMs) : { ok: false, error: "Slack bot token missing." } });
            if (userToken) scopeReports.push({ tokenType: "user", result: await fetchSlackScopes(userToken, timeoutMs) });
            slackScopes = scopeReports;
        }

        let discordTarget: DiscordTargetSummary | undefined;
        let discordPermissions: DiscordPermissionsReport | undefined;
        if (plugin.id === "discord" && params.target) {
            const perms = await buildDiscordPermissions({ account: resolvedAccount as { token?: string; accountId?: string }, target: params.target });
            discordTarget = perms.target;
            discordPermissions = perms.report;
        }

        reports.push({
            channel: plugin.id, accountId,
            accountName: typeof (resolvedAccount as any).name === "string" ? (resolvedAccount as any).name?.trim() || undefined : undefined,
            configured, enabled, support: plugin.capabilities, probe, target: discordTarget, channelPermissions: discordPermissions, actions, slackScopes,
        });
    }
    return reports;
}
