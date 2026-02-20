import {
  CLAUDE_CLI_PROFILE_ID,
  ensureAuthProfileStore,
  upsertAuthProfile,
} from "../agents/auth-profiles.js";
import {
  formatApiKeyPreview,
  normalizeApiKeyInput,
  validateApiKeyInput,
} from "./auth-choice.api-key.js";
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
import { buildTokenProfileId, validateAnthropicSetupToken } from "./auth-token.js";
import { applyAuthProfileConfig, setAnthropicApiKey } from "./onboard-auth.js";

export async function applyAuthChoiceAnthropic(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  if (params.authChoice === "claude-cli") {
    let nextConfig = params.config;
    const store = ensureAuthProfileStore(params.agentDir, {
      allowKeychainPrompt: false,
    });
    const hasClaudeCli = Boolean(store.profiles[CLAUDE_CLI_PROFILE_ID]);
    if (!hasClaudeCli && process.platform === "darwin") {
      await params.prompter.note(
        [
          "O macOS mostrará uma solicitação do Chaves (Keychain) a seguir.",
          'Escolha "Sempre Permitir" para que o gateway launchd possa iniciar sem solicitações.',
          'Se você escolher "Permitir" ou "Recusar", cada reinicialização ficará bloqueada em um alerta do Chaves.',
        ].join("\n"),
        "Chaves do Claude Code CLI",
      );
      const proceed = await params.prompter.confirm({
        message: "Verificar as credenciais do Claude Code CLI no Chaves agora?",
        initialValue: true,
      });
      if (!proceed) return { config: nextConfig };
    }

    const storeWithKeychain = hasClaudeCli
      ? store
      : ensureAuthProfileStore(params.agentDir, {
          allowKeychainPrompt: true,
        });

    if (!storeWithKeychain.profiles[CLAUDE_CLI_PROFILE_ID]) {
      if (process.stdin.isTTY) {
        const runNow = await params.prompter.confirm({
          message: "Executar `claude setup-token` agora?",
          initialValue: true,
        });
        if (runNow) {
          const res = await (async () => {
            const { spawnSync } = await import("node:child_process");
            return spawnSync("claude", ["setup-token"], { stdio: "inherit" });
          })();
          if (res.error) {
            await params.prompter.note(
              `Falha ao executar o claude: ${String(res.error)}`,
              "Claude setup-token",
            );
          }
        }
      } else {
        await params.prompter.note(
          "`claude setup-token` requer um TTY interativo.",
          "Claude setup-token",
        );
      }

      const refreshed = ensureAuthProfileStore(params.agentDir, {
        allowKeychainPrompt: true,
      });
      if (!refreshed.profiles[CLAUDE_CLI_PROFILE_ID]) {
        await params.prompter.note(
          process.platform === "darwin"
            ? 'Nenhuma credencial do Claude Code CLI encontrada no Chaves ("Claude Code-credentials") ou em ~/.claude/.credentials.json.'
            : "Nenhuma credencial do Claude Code CLI encontrada em ~/.claude/.credentials.json.",
          "OAuth do Claude Code CLI",
        );
        return { config: nextConfig };
      }
    }
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: CLAUDE_CLI_PROFILE_ID,
      provider: "anthropic",
      mode: "oauth",
    });
    return { config: nextConfig };
  }

  if (params.authChoice === "setup-token" || params.authChoice === "oauth") {
    let nextConfig = params.config;
    await params.prompter.note(
      [
        "Isso executará `claude setup-token` para criar um token Anthropic de longa duração.",
        "Requer um TTY interativo e uma assinatura Claude Pro/Max.",
      ].join("\n"),
      "Anthropic setup-token",
    );

    if (!process.stdin.isTTY) {
      await params.prompter.note(
        "`claude setup-token` requer um TTY interativo.",
        "Anthropic setup-token",
      );
      return { config: nextConfig };
    }

    const proceed = await params.prompter.confirm({
      message: "Executar `claude setup-token` agora?",
      initialValue: true,
    });
    if (!proceed) return { config: nextConfig };

    const res = await (async () => {
      const { spawnSync } = await import("node:child_process");
      return spawnSync("claude", ["setup-token"], { stdio: "inherit" });
    })();
    if (res.error) {
      await params.prompter.note(
        `Falha ao executar o claude: ${String(res.error)}`,
        "Anthropic setup-token",
      );
      return { config: nextConfig };
    }
    if (typeof res.status === "number" && res.status !== 0) {
      await params.prompter.note(
        `claude setup-token falhou (saída ${res.status})`,
        "Anthropic setup-token",
      );
      return { config: nextConfig };
    }

    const store = ensureAuthProfileStore(params.agentDir, {
      allowKeychainPrompt: true,
    });
    if (!store.profiles[CLAUDE_CLI_PROFILE_ID]) {
      await params.prompter.note(
        `Nenhuma credencial do Claude Code CLI encontrada após o setup-token. Esperado ${CLAUDE_CLI_PROFILE_ID}.`,
        "Anthropic setup-token",
      );
      return { config: nextConfig };
    }

    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: CLAUDE_CLI_PROFILE_ID,
      provider: "anthropic",
      mode: "oauth",
    });
    return { config: nextConfig };
  }

  if (params.authChoice === "token") {
    let nextConfig = params.config;
    const provider = (await params.prompter.select({
      message: "Provedor de token",
      options: [{ value: "anthropic", label: "Anthropic (único suportado)" }],
    })) as "anthropic";
    await params.prompter.note(
      [
        "Execute `claude setup-token` no seu terminal.",
        "Em seguida, cole o token gerado abaixo.",
      ].join("\n"),
      "Token da Anthropic",
    );

    const tokenRaw = await params.prompter.text({
      message: "Cole o setup-token da Anthropic",
      validate: (value) => validateAnthropicSetupToken(String(value ?? "")),
    });
    const token = String(tokenRaw).trim();

    const profileNameRaw = await params.prompter.text({
      message: "Nome do token (vazio = padrão)",
      placeholder: "padrão",
    });
    const namedProfileId = buildTokenProfileId({
      provider,
      name: String(profileNameRaw ?? ""),
    });

    upsertAuthProfile({
      profileId: namedProfileId,
      agentDir: params.agentDir,
      credential: {
        type: "token",
        provider,
        token,
      },
    });

    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: namedProfileId,
      provider,
      mode: "token",
    });
    return { config: nextConfig };
  }

  if (params.authChoice === "apiKey") {
    if (params.opts?.tokenProvider && params.opts.tokenProvider !== "anthropic") {
      return null;
    }

    let nextConfig = params.config;
    let hasCredential = false;
    const envKey = process.env.ANTHROPIC_API_KEY?.trim();

    if (params.opts?.token) {
      await setAnthropicApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    if (!hasCredential && envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Usar ANTHROPIC_API_KEY existente (env, ${formatApiKeyPreview(envKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setAnthropicApiKey(envKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Insira a chave de API da Anthropic",
        validate: validateApiKeyInput,
      });
      await setAnthropicApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "anthropic:default",
      provider: "anthropic",
      mode: "api_key",
    });
    return { config: nextConfig };
  }

  return null;
}
