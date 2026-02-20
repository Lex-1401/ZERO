import {
  buildAuthHealthSummary,
  DEFAULT_OAUTH_WARN_MS,
  formatRemainingShort,
} from "../agents/auth-health.js";
import {
  CLAUDE_CLI_PROFILE_ID,
  CODEX_CLI_PROFILE_ID,
  ensureAuthProfileStore,
  repairOAuthProfileIdMismatch,
  resolveApiKeyForProfile,
  resolveProfileUnusableUntilForDisplay,
} from "../agents/auth-profiles.js";
import type { ZEROConfig } from "../config/config.js";
import { note } from "../terminal/note.js";
import { formatCliCommand } from "../cli/command-format.js";
import type { DoctorPrompter } from "./doctor-prompter.js";

export async function maybeRepairAnthropicOAuthProfileId(
  cfg: ZEROConfig,
  prompter: DoctorPrompter,
): Promise<ZEROConfig> {
  const store = ensureAuthProfileStore();
  const repair = repairOAuthProfileIdMismatch({
    cfg,
    store,
    provider: "anthropic",
    legacyProfileId: "anthropic:default",
  });
  if (!repair.migrated || repair.changes.length === 0) return cfg;

  note(repair.changes.map((c) => `- ${c}`).join("\n"), "Perfis de autenticação");
  const apply = await prompter.confirm({
    message: "Atualizar ID do perfil OAuth da Anthropic na configuração agora?",
    initialValue: true,
  });
  if (!apply) return cfg;
  return repair.config;
}

type AuthIssue = {
  profileId: string;
  provider: string;
  status: string;
  remainingMs?: number;
};

function formatAuthIssueHint(issue: AuthIssue): string | null {
  if (issue.provider === "anthropic" && issue.profileId === CLAUDE_CLI_PROFILE_ID) {
    return "Execute `claude setup-token` no host do gateway.";
  }
  if (issue.provider === "openai-codex" && issue.profileId === CODEX_CLI_PROFILE_ID) {
    return `Execute \`codex login\` (ou \`${formatCliCommand("zero configure")}\` → OpenAI Codex OAuth).`;
  }
  return `Autentique-se novamente via \`${formatCliCommand("zero configure")}\` ou \`${formatCliCommand("zero onboard")}\`.`;
}

function formatAuthIssueLine(issue: AuthIssue): string {
  const remaining =
    issue.remainingMs !== undefined ? ` (${formatRemainingShort(issue.remainingMs)})` : "";
  const hint = formatAuthIssueHint(issue);
  return `- ${issue.profileId}: ${issue.status}${remaining}${hint ? ` — ${hint}` : ""}`;
}

export async function noteAuthProfileHealth(params: {
  cfg: ZEROConfig;
  prompter: DoctorPrompter;
  allowKeychainPrompt: boolean;
}): Promise<void> {
  const store = ensureAuthProfileStore(undefined, {
    allowKeychainPrompt: params.allowKeychainPrompt,
  });
  const unusable = (() => {
    const now = Date.now();
    const out: string[] = [];
    for (const profileId of Object.keys(store.usageStats ?? {})) {
      const until = resolveProfileUnusableUntilForDisplay(store, profileId);
      if (!until || now >= until) continue;
      const stats = store.usageStats?.[profileId];
      const remaining = formatRemainingShort(until - now);
      const kind =
        typeof stats?.disabledUntil === "number" && now < stats.disabledUntil
          ? `desativado${stats.disabledReason ? `:${stats.disabledReason}` : ""}`
          : "tempo de espera (cooldown)";
      const hint =
        typeof stats?.disabledUntil === "number" &&
        now < stats.disabledUntil &&
        stats.disabledReason?.startsWith("billing")
          ? "Recarregue créditos (faturamento do provedor) ou mude de provedor."
          : "Aguarde o tempo de espera ou mude de provedor.";
      out.push(`- ${profileId}: ${kind} (${remaining})${hint ? ` — ${hint}` : ""}`);
    }
    return out;
  })();

  if (unusable.length > 0) {
    note(unusable.join("\n"), "Tempos de espera (cooldowns) do perfil de autenticação");
  }

  let summary = buildAuthHealthSummary({
    store,
    cfg: params.cfg,
    warnAfterMs: DEFAULT_OAUTH_WARN_MS,
  });

  const findIssues = () =>
    summary.profiles.filter(
      (profile) =>
        (profile.type === "oauth" || profile.type === "token") &&
        (profile.status === "expired" ||
          profile.status === "expiring" ||
          profile.status === "missing"),
    );

  let issues = findIssues();
  if (issues.length === 0) return;

  const shouldRefresh = await params.prompter.confirmRepair({
    message:
      "Atualizar tokens OAuth expirando agora? (tokens estáticos precisam de nova autenticação)",
    initialValue: true,
  });

  if (shouldRefresh) {
    const refreshTargets = issues.filter(
      (issue) =>
        issue.type === "oauth" && ["expired", "expiring", "missing"].includes(issue.status),
    );
    const errors: string[] = [];
    for (const profile of refreshTargets) {
      try {
        await resolveApiKeyForProfile({
          cfg: params.cfg,
          store,
          profileId: profile.profileId,
        });
      } catch (err) {
        errors.push(`- ${profile.profileId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (errors.length > 0) {
      note(errors.join("\n"), "Erros de atualização de OAuth");
    }
    summary = buildAuthHealthSummary({
      store: ensureAuthProfileStore(undefined, {
        allowKeychainPrompt: false,
      }),
      cfg: params.cfg,
      warnAfterMs: DEFAULT_OAUTH_WARN_MS,
    });
    issues = findIssues();
  }

  if (issues.length > 0) {
    note(
      issues
        .map((issue) =>
          formatAuthIssueLine({
            profileId: issue.profileId,
            provider: issue.provider,
            status: issue.status,
            remainingMs: issue.remainingMs,
          }),
        )
        .join("\n"),
      "Autenticação do modelo",
    );
  }
}
