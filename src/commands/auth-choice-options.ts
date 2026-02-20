import type { AuthProfileStore } from "../agents/auth-profiles.js";
import { CLAUDE_CLI_PROFILE_ID, CODEX_CLI_PROFILE_ID } from "../agents/auth-profiles.js";
import { colorize, isRich, theme } from "../terminal/theme.js";
import type { AuthChoice } from "./onboard-types.js";

export type AuthChoiceOption = {
  value: AuthChoice;
  label: string;
  hint?: string;
};

export type AuthChoiceGroupId =
  | "openai"
  | "anthropic"
  | "google"
  | "copilot"
  | "openrouter"
  | "ai-gateway"
  | "moonshot"
  | "zai"
  | "opencode-zen"
  | "minimax"
  | "synthetic"
  | "venice"
  | "qwen";

export type AuthChoiceGroup = {
  value: AuthChoiceGroupId;
  label: string;
  hint?: string;
  options: AuthChoiceOption[];
};

const AUTH_CHOICE_GROUP_DEFS: {
  value: AuthChoiceGroupId;
  label: string;
  hint?: string;
  choices: AuthChoice[];
}[] = [
  {
    value: "openai",
    label: "OpenAI",
    hint: "Codex OAuth + chave de API",
    choices: ["codex-cli", "openai-codex", "openai-api-key"],
  },
  {
    value: "anthropic",
    label: "Anthropic",
    hint: "Claude Code CLI + chave de API",
    choices: ["token", "claude-cli", "apiKey"],
  },
  {
    value: "minimax",
    label: "MiniMax",
    hint: "M2.1 (recomendado)",
    choices: ["minimax-api", "minimax-api-lightning"],
  },
  {
    value: "qwen",
    label: "Qwen",
    hint: "OAuth",
    choices: ["qwen-portal"],
  },
  {
    value: "synthetic",
    label: "Synthetic",
    hint: "Compatível com Anthropic (multi-modelo)",
    choices: ["synthetic-api-key"],
  },
  {
    value: "venice",
    label: "Venice AI",
    hint: "Focada em privacidade (modelos não censurados)",
    choices: ["venice-api-key"],
  },
  {
    value: "google",
    label: "Google",
    hint: "Chave de API Gemini + OAuth",
    choices: ["gemini-api-key", "google-cloud-auth", "google-gemini-cli"],
  },
  {
    value: "copilot",
    label: "Copilot",
    hint: "GitHub + proxy local",
    choices: ["github-copilot", "copilot-proxy"],
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    hint: "Chave de API",
    choices: ["openrouter-api-key"],
  },
  {
    value: "ai-gateway",
    label: "Vercel AI Gateway",
    hint: "Chave de API",
    choices: ["ai-gateway-api-key"],
  },
  {
    value: "moonshot",
    label: "Moonshot AI",
    hint: "Kimi K2 + Kimi Code",
    choices: ["moonshot-api-key", "kimi-code-api-key"],
  },
  {
    value: "zai",
    label: "Z.AI (GLM 4.7)",
    hint: "Chave de API",
    choices: ["zai-api-key"],
  },
  {
    value: "opencode-zen",
    label: "OpenCode Zen",
    hint: "Chave de API",
    choices: ["opencode-zen"],
  },
];

function formatOAuthHint(expires?: number, opts?: { allowStale?: boolean }): string {
  const rich = isRich();
  if (!expires) {
    return colorize(rich, theme.muted, "token indisponível");
  }
  const now = Date.now();
  const remaining = expires - now;
  if (remaining <= 0) {
    if (opts?.allowStale) {
      return colorize(rich, theme.warn, "token presente · atualizar ao usar");
    }
    return colorize(rich, theme.error, "token expirado");
  }
  const minutes = Math.round(remaining / (60 * 1000));
  const duration =
    minutes >= 120
      ? `${Math.round(minutes / 60)}h`
      : minutes >= 60
        ? "1h"
        : `${Math.max(minutes, 1)}m`;
  const label = `token ok · expira em ${duration}`;
  if (minutes <= 10) {
    return colorize(rich, theme.warn, label);
  }
  return colorize(rich, theme.success, label);
}

export function buildAuthChoiceOptions(params: {
  store: AuthProfileStore;
  includeSkip: boolean;
  includeClaudeCliIfMissing?: boolean;
  platform?: NodeJS.Platform;
}): AuthChoiceOption[] {
  const options: AuthChoiceOption[] = [];
  const platform = params.platform ?? process.platform;

  const codexCli = params.store.profiles[CODEX_CLI_PROFILE_ID];
  if (codexCli?.type === "oauth") {
    options.push({
      value: "codex-cli",
      label: "OpenAI Codex OAuth (Codex CLI)",
      hint: formatOAuthHint(codexCli.expires, { allowStale: true }),
    });
  }

  const claudeCli = params.store.profiles[CLAUDE_CLI_PROFILE_ID];
  if (claudeCli?.type === "oauth" || claudeCli?.type === "token") {
    options.push({
      value: "claude-cli",
      label: "Token Anthropic (Claude Code CLI)",
      hint: `reutiliza a autenticação existente do Claude Code · ${formatOAuthHint(claudeCli.expires)}`,
    });
  } else if (params.includeClaudeCliIfMissing && platform === "darwin") {
    options.push({
      value: "claude-cli",
      label: "Token Anthropic (Claude Code CLI)",
      hint: "reutiliza a autenticação existente do Claude Code · requer acesso ao Keychain",
    });
  }

  options.push({
    value: "token",
    label: "Token Anthropic (cole o setup-token)",
    hint: "execute `claude setup-token` em outro lugar e cole o token aqui",
  });

  options.push({
    value: "openai-codex",
    label: "OpenAI Codex (ChatGPT OAuth)",
  });
  options.push({ value: "chutes", label: "Chutes (OAuth)" });
  options.push({ value: "openai-api-key", label: "Chave de API OpenAI" });
  options.push({ value: "openrouter-api-key", label: "Chave de API OpenRouter" });
  options.push({
    value: "ai-gateway-api-key",
    label: "Chave de API Vercel AI Gateway",
  });
  options.push({ value: "moonshot-api-key", label: "Chave de API Moonshot AI" });
  options.push({ value: "kimi-code-api-key", label: "Chave de API Kimi Code" });
  options.push({ value: "synthetic-api-key", label: "Chave de API Synthetic" });
  options.push({
    value: "venice-api-key",
    label: "Chave de API Venice AI",
    hint: "Inferência focada em privacidade (modelos não censurados)",
  });
  options.push({
    value: "github-copilot",
    label: "GitHub Copilot (login de dispositivo GitHub)",
    hint: "Usa o fluxo de dispositivo do GitHub",
  });
  options.push({ value: "gemini-api-key", label: "Chave de API Google Gemini" });
  options.push({
    value: "google-cloud-auth",
    label: "Google GoogleCloudAuth OAuth",
    hint: "Usa o plugin de autenticação GoogleCloudAuth incluso",
  });
  options.push({
    value: "google-gemini-cli",
    label: "Google Gemini CLI OAuth",
    hint: "Usa o plugin de autenticação Gemini CLI incluso",
  });
  options.push({ value: "zai-api-key", label: "Chave de API Z.AI (GLM 4.7)" });
  options.push({ value: "qwen-portal", label: "Qwen OAuth" });
  options.push({
    value: "copilot-proxy",
    label: "Copilot Proxy (local)",
    hint: "Proxy local para modelos do VS Code Copilot",
  });
  options.push({ value: "apiKey", label: "Chave de API Anthropic" });
  // Token flow is currently Anthropic-only; use CLI for advanced providers.
  options.push({
    value: "opencode-zen",
    label: "OpenCode Zen (proxy multi-modelo)",
    hint: "Claude, GPT, Gemini via opencode.ai/zen",
  });
  options.push({ value: "minimax-api", label: "MiniMax M2.1" });
  options.push({
    value: "minimax-api-lightning",
    label: "MiniMax M2.1 Lightning",
    hint: "Mais rápido, maior custo de saída",
  });
  if (params.includeSkip) {
    options.push({ value: "skip", label: "Pular por agora" });
  }

  return options;
}

export function buildAuthChoiceGroups(params: {
  store: AuthProfileStore;
  includeSkip: boolean;
  includeClaudeCliIfMissing?: boolean;
  platform?: NodeJS.Platform;
}): {
  groups: AuthChoiceGroup[];
  skipOption?: AuthChoiceOption;
} {
  const options = buildAuthChoiceOptions({
    ...params,
    includeSkip: false,
  });
  const optionByValue = new Map<AuthChoice, AuthChoiceOption>(
    options.map((opt) => [opt.value, opt]),
  );

  const groups = AUTH_CHOICE_GROUP_DEFS.map((group) => ({
    ...group,
    options: group.choices
      .map((choice) => optionByValue.get(choice))
      .filter((opt): opt is AuthChoiceOption => Boolean(opt)),
  }));

  const skipOption = params.includeSkip
    ? ({ value: "skip", label: "Pular por agora" } satisfies AuthChoiceOption)
    : undefined;

  return { groups, skipOption };
}
