
import type { ZEROConfig } from "../../../config/config.js";
import type { DmPolicy } from "../../../config/types.js";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../../../routing/session-key.js";
import {
    resolveDefaultSlackAccountId,
    resolveSlackAccount,
} from "../../../slack/accounts.js";
import { resolveSlackUserAllowlist } from "../../../slack/resolve-users.js";
import { formatDocsLink } from "../../../terminal/links.js";
import type { WizardPrompter } from "../../../wizard/prompts.js";
import { addWildcardAllowFrom } from "./helpers.js";

export function setSlackDmPolicy(cfg: ZEROConfig, dmPolicy: DmPolicy) {
    const allowFrom =
        dmPolicy === "open" ? addWildcardAllowFrom(cfg.channels?.slack?.dm?.allowFrom) : undefined;
    return {
        ...cfg,
        channels: {
            ...cfg.channels,
            slack: {
                ...cfg.channels?.slack,
                dm: {
                    ...cfg.channels?.slack?.dm,
                    enabled: cfg.channels?.slack?.dm?.enabled ?? true,
                    policy: dmPolicy,
                    ...(allowFrom ? { allowFrom } : {}),
                },
            },
        },
    };
}

export function buildSlackManifest(botName: string) {
    const safeName = botName.trim() || "ZERO";
    const manifest = {
        display_information: {
            name: safeName,
            description: `${safeName} connector for ZERO`,
        },
        features: {
            bot_user: {
                display_name: safeName,
                always_online: false,
            },
            app_home: {
                messages_tab_enabled: true,
                messages_tab_read_only_enabled: false,
            },
            slash_commands: [
                {
                    command: "/zero",
                    description: "Send a message to ZERO",
                    should_escape: false,
                },
            ],
        },
        oauth_config: {
            scopes: {
                bot: [
                    "chat:write",
                    "channels:history",
                    "channels:read",
                    "groups:history",
                    "im:history",
                    "mpim:history",
                    "users:read",
                    "app_mentions:read",
                    "reactions:read",
                    "reactions:write",
                    "pins:read",
                    "pins:write",
                    "emoji:read",
                    "commands",
                    "files:read",
                    "files:write",
                ],
            },
        },
        settings: {
            socket_mode_enabled: true,
            event_subscriptions: {
                bot_events: [
                    "app_mention",
                    "message.channels",
                    "message.groups",
                    "message.im",
                    "message.mpim",
                    "reaction_added",
                    "reaction_removed",
                    "member_joined_channel",
                    "member_left_channel",
                    "channel_rename",
                    "pin_added",
                    "pin_removed",
                    "token_revoked",
                ],
            },
        },
    };
    return JSON.stringify(manifest, null, 2);
}

export async function noteSlackTokenHelp(prompter: WizardPrompter, botName: string): Promise<void> {
    const manifest = buildSlackManifest(botName);
    await prompter.note(
        [
            "1) Slack API → Create App → From scratch",
            "2) Add Socket Mode + enable it to get the app-level token (xapp-...)",
            "3) OAuth & Permissions → install app to workspace (xoxb- bot token)",
            "4) Enable Event Subscriptions (socket) for message events",
            "5) App Home → enable the Messages tab for DMs",
            "Tip: set SLACK_BOT_TOKEN + SLACK_APP_TOKEN in your env.",
            `Docs: ${formatDocsLink("/slack", "slack")}`,
            "",
            "Manifest (JSON):",
            manifest,
        ].join("\n"),
        "Slack socket mode tokens",
    );
}

export function setSlackGroupPolicy(
    cfg: ZEROConfig,
    accountId: string,
    groupPolicy: "open" | "allowlist" | "disabled",
): ZEROConfig {
    if (accountId === DEFAULT_ACCOUNT_ID) {
        return {
            ...cfg,
            channels: {
                ...cfg.channels,
                slack: {
                    ...cfg.channels?.slack,
                    enabled: true,
                    groupPolicy,
                },
            },
        };
    }
    return {
        ...cfg,
        channels: {
            ...cfg.channels,
            slack: {
                ...cfg.channels?.slack,
                enabled: true,
                accounts: {
                    ...cfg.channels?.slack?.accounts,
                    [accountId]: {
                        ...cfg.channels?.slack?.accounts?.[accountId],
                        enabled: cfg.channels?.slack?.accounts?.[accountId]?.enabled ?? true,
                        groupPolicy,
                    },
                },
            },
        },
    };
}

export function setSlackChannelAllowlist(
    cfg: ZEROConfig,
    accountId: string,
    channelKeys: string[],
): ZEROConfig {
    const channels = Object.fromEntries(channelKeys.map((key) => [key, { allow: true }]));
    if (accountId === DEFAULT_ACCOUNT_ID) {
        return {
            ...cfg,
            channels: {
                ...cfg.channels,
                slack: {
                    ...cfg.channels?.slack,
                    enabled: true,
                    channels,
                },
            },
        };
    }
    return {
        ...cfg,
        channels: {
            ...cfg.channels,
            slack: {
                ...cfg.channels?.slack,
                enabled: true,
                accounts: {
                    ...cfg.channels?.slack?.accounts,
                    [accountId]: {
                        ...cfg.channels?.slack?.accounts?.[accountId],
                        enabled: cfg.channels?.slack?.accounts?.[accountId]?.enabled ?? true,
                        channels,
                    },
                },
            },
        },
    };
}

export function setSlackAllowFrom(cfg: ZEROConfig, allowFrom: string[]): ZEROConfig {
    return {
        ...cfg,
        channels: {
            ...cfg.channels,
            slack: {
                ...cfg.channels?.slack,
                dm: {
                    ...cfg.channels?.slack?.dm,
                    enabled: cfg.channels?.slack?.dm?.enabled ?? true,
                    allowFrom,
                },
            },
        },
    };
}

export function parseSlackAllowFromInput(raw: string): string[] {
    return raw
        .split(/[\n,;]+/g)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

export async function promptSlackAllowFrom(params: {
    cfg: ZEROConfig;
    prompter: WizardPrompter;
    accountId?: string;
}): Promise<ZEROConfig> {
    const accountId =
        params.accountId && normalizeAccountId(params.accountId)
            ? (normalizeAccountId(params.accountId) ?? DEFAULT_ACCOUNT_ID)
            : resolveDefaultSlackAccountId(params.cfg);
    const resolved = resolveSlackAccount({ cfg: params.cfg, accountId });
    const token = resolved.config.userToken ?? resolved.config.botToken ?? "";
    const existing = params.cfg.channels?.slack?.dm?.allowFrom ?? [];
    await params.prompter.note(
        [
            "Allowlist Slack DMs by username (we resolve to user ids).",
            "Examples:",
            "- U12345678",
            "- @alice",
            "Multiple entries: comma-separated.",
            `Docs: ${formatDocsLink("/slack", "slack")}`,
        ].join("\n"),
        "Slack allowlist",
    );
    const parseInputs = (value: string) => parseSlackAllowFromInput(value);
    const parseId = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const mention = trimmed.match(/^<@([A-Z0-9]+)>$/i);
        if (mention) return mention[1]?.toUpperCase();
        const prefixed = trimmed.replace(/^(slack:|user:)/i, "");
        if (/^[A-Z][A-Z0-9]+$/i.test(prefixed)) return prefixed.toUpperCase();
        return null;
    };

    while (true) {
        const entry = await params.prompter.text({
            message: "Slack allowFrom (usernames or ids)",
            placeholder: "@alice, U12345678",
            initialValue: existing[0] ? String(existing[0]) : undefined,
            validate: (value) => (String(value ?? "").trim() ? undefined : "Required"),
        });
        const parts = parseInputs(String(entry));
        if (!token) {
            const ids = parts.map(parseId).filter(Boolean) as string[];
            if (ids.length !== parts.length) {
                await params.prompter.note(
                    "Slack token missing; use user ids (or mention form) only.",
                    "Slack allowlist",
                );
                continue;
            }
            const unique = [...new Set([...existing.map((v) => String(v).trim()), ...ids])].filter(
                Boolean,
            );
            return setSlackAllowFrom(params.cfg, unique);
        }

        const results = await resolveSlackUserAllowlist({
            token,
            entries: parts,
        }).catch(() => null);
        if (!results) {
            await params.prompter.note("Failed to resolve usernames. Try again.", "Slack allowlist");
            continue;
        }
        const unresolved = results.filter((res) => !res.resolved || !res.id);
        if (unresolved.length > 0) {
            await params.prompter.note(
                `Could not resolve: ${unresolved.map((res) => res.input).join(", ")}`,
                "Slack allowlist",
            );
            continue;
        }
        const ids = results.map((res) => res.id as string);
        const unique = [...new Set([...existing.map((v) => String(v).trim()).filter(Boolean), ...ids])];
        return setSlackAllowFrom(params.cfg, unique);
    }
}
