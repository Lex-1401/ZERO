import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../../../routing/session-key.js";
import {
  listSlackAccountIds,
  resolveDefaultSlackAccountId,
  resolveSlackAccount,
} from "../../../slack/accounts.js";
import { resolveSlackChannelAllowlist } from "../../../slack/resolve-channels.js";
import type { ChannelOnboardingAdapter, ChannelOnboardingDmPolicy } from "../onboarding-types.js";
import { promptChannelAccessConfig } from "./channel-access.js";
import { promptAccountId } from "./helpers.js";
import {
  setSlackDmPolicy,
  noteSlackTokenHelp,
  setSlackGroupPolicy,
  setSlackChannelAllowlist,
  promptSlackAllowFrom,
} from "./slack-policies.js";

const channel = "slack" as const;

const dmPolicy: ChannelOnboardingDmPolicy = {
  label: "Slack",
  channel,
  policyKey: "channels.slack.dm.policy",
  allowFromKey: "channels.slack.dm.allowFrom",
  getCurrent: (cfg) => cfg.channels?.slack?.dm?.policy ?? "pairing",
  setPolicy: (cfg, policy) => setSlackDmPolicy(cfg, policy),
  promptAllowFrom: promptSlackAllowFrom,
};

export const slackOnboardingAdapter: ChannelOnboardingAdapter = {
  channel,
  getStatus: async ({ cfg }) => {
    const configured = listSlackAccountIds(cfg).some((accountId) => {
      const account = resolveSlackAccount({ cfg, accountId });
      return Boolean(account.botToken && account.appToken);
    });
    return {
      channel,
      configured,
      statusLines: [`Slack: ${configured ? "configured" : "needs tokens"}`],
      selectionHint: configured ? "configured" : "needs tokens",
      quickstartScore: configured ? 2 : 1,
    };
  },
  configure: async ({ cfg, prompter, accountOverrides, shouldPromptAccountIds }) => {
    const slackOverride = accountOverrides.slack?.trim();
    const defaultSlackAccountId = resolveDefaultSlackAccountId(cfg);
    let slackAccountId = slackOverride ? normalizeAccountId(slackOverride) : defaultSlackAccountId;
    if (shouldPromptAccountIds && !slackOverride) {
      slackAccountId = await promptAccountId({
        cfg,
        prompter,
        label: "Slack",
        currentId: slackAccountId,
        listAccountIds: listSlackAccountIds,
        defaultAccountId: defaultSlackAccountId,
      });
    }

    let next = cfg;
    const resolvedAccount = resolveSlackAccount({
      cfg: next,
      accountId: slackAccountId,
    });
    const accountConfigured = Boolean(resolvedAccount.botToken && resolvedAccount.appToken);
    const allowEnv = slackAccountId === DEFAULT_ACCOUNT_ID;
    const canUseEnv =
      allowEnv &&
      Boolean(process.env.SLACK_BOT_TOKEN?.trim()) &&
      Boolean(process.env.SLACK_APP_TOKEN?.trim());
    const hasConfigTokens = Boolean(
      resolvedAccount.config.botToken && resolvedAccount.config.appToken,
    );

    let botToken: string | null = null;
    let appToken: string | null = null;
    const slackBotName = String(
      await prompter.text({
        message: "Slack bot display name (used for manifest)",
        initialValue: "ZERO",
      }),
    ).trim();
    if (!accountConfigured) {
      await noteSlackTokenHelp(prompter, slackBotName);
    }
    if (canUseEnv && (!resolvedAccount.config.botToken || !resolvedAccount.config.appToken)) {
      const keepEnv = await prompter.confirm({
        message: "SLACK_BOT_TOKEN + SLACK_APP_TOKEN detected. Use env vars?",
        initialValue: true,
      });
      if (keepEnv) {
        next = {
          ...next,
          channels: {
            ...next.channels,
            slack: { ...next.channels?.slack, enabled: true },
          },
        };
      } else {
        botToken = String(
          await prompter.text({
            message: "Enter Slack bot token (xoxb-...)",
            validate: (value) => (value?.trim() ? undefined : "Required"),
          }),
        ).trim();
        appToken = String(
          await prompter.text({
            message: "Enter Slack app token (xapp-...)",
            validate: (value) => (value?.trim() ? undefined : "Required"),
          }),
        ).trim();
      }
    } else if (hasConfigTokens) {
      const keep = await prompter.confirm({
        message: "Slack tokens already configured. Keep them?",
        initialValue: true,
      });
      if (!keep) {
        botToken = String(
          await prompter.text({
            message: "Enter Slack bot token (xoxb-...)",
            validate: (value) => (value?.trim() ? undefined : "Required"),
          }),
        ).trim();
        appToken = String(
          await prompter.text({
            message: "Enter Slack app token (xapp-...)",
            validate: (value) => (value?.trim() ? undefined : "Required"),
          }),
        ).trim();
      }
    } else {
      botToken = String(
        await prompter.text({
          message: "Enter Slack bot token (xoxb-...)",
          validate: (value) => (value?.trim() ? undefined : "Required"),
        }),
      ).trim();
      appToken = String(
        await prompter.text({
          message: "Enter Slack app token (xapp-...)",
          validate: (value) => (value?.trim() ? undefined : "Required"),
        }),
      ).trim();
    }

    if (botToken && appToken) {
      if (slackAccountId === DEFAULT_ACCOUNT_ID) {
        next = {
          ...next,
          channels: {
            ...next.channels,
            slack: {
              ...next.channels?.slack,
              enabled: true,
              botToken,
              appToken,
            },
          },
        };
      } else {
        next = {
          ...next,
          channels: {
            ...next.channels,
            slack: {
              ...next.channels?.slack,
              enabled: true,
              accounts: {
                ...next.channels?.slack?.accounts,
                [slackAccountId]: {
                  ...next.channels?.slack?.accounts?.[slackAccountId],
                  enabled: next.channels?.slack?.accounts?.[slackAccountId]?.enabled ?? true,
                  botToken,
                  appToken,
                },
              },
            },
          },
        };
      }
    }

    const accessConfig = await promptChannelAccessConfig({
      prompter,
      label: "Slack channels",
      currentPolicy: resolvedAccount.config.groupPolicy ?? "allowlist",
      currentEntries: Object.entries(resolvedAccount.config.channels ?? {})
        .filter(([, value]) => value?.allow !== false && value?.enabled !== false)
        .map(([key]) => key),
      placeholder: "#general, #private, C123",
      updatePrompt: Boolean(resolvedAccount.config.channels),
    });
    if (accessConfig) {
      if (accessConfig.policy !== "allowlist") {
        next = setSlackGroupPolicy(next, slackAccountId, accessConfig.policy);
      } else {
        let keys = accessConfig.entries;
        const accountWithTokens = resolveSlackAccount({
          cfg: next,
          accountId: slackAccountId,
        });
        if (accountWithTokens.botToken && accessConfig.entries.length > 0) {
          try {
            const resolved = await resolveSlackChannelAllowlist({
              token: accountWithTokens.botToken,
              entries: accessConfig.entries,
            });
            const resolvedKeys = resolved
              .filter((entry) => entry.resolved && entry.id)
              .map((entry) => entry.id as string);
            const unresolved = resolved
              .filter((entry) => !entry.resolved)
              .map((entry) => entry.input);
            keys = [...resolvedKeys, ...unresolved.map((entry) => entry.trim()).filter(Boolean)];
            if (resolvedKeys.length > 0 || unresolved.length > 0) {
              await prompter.note(
                [
                  resolvedKeys.length > 0 ? `Resolved: ${resolvedKeys.join(", ")}` : undefined,
                  unresolved.length > 0
                    ? `Unresolved (kept as typed): ${unresolved.join(", ")}`
                    : undefined,
                ]
                  .filter(Boolean)
                  .join("\n"),
                "Slack channels",
              );
            }
          } catch (err) {
            await prompter.note(
              `Channel lookup failed; keeping entries as typed. ${String(err)}`,
              "Slack channels",
            );
          }
        }
        next = setSlackGroupPolicy(next, slackAccountId, "allowlist");
        next = setSlackChannelAllowlist(next, slackAccountId, keys);
      }
    }

    return { cfg: next, accountId: slackAccountId };
  },
  dmPolicy,
  disable: (cfg) => ({
    ...cfg,
    channels: {
      ...cfg.channels,
      slack: { ...cfg.channels?.slack, enabled: false },
    },
  }),
};

