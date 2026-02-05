import { loginOpenAICodex } from "@mariozechner/pi-ai";
import { CODEX_CLI_PROFILE_ID, ensureAuthProfileStore } from "../agents/auth-profiles.js";
import { resolveEnvApiKey } from "../agents/model-auth.js";
import { upsertSharedEnvVar } from "../infra/env-file.js";
import { isRemoteEnvironment } from "./oauth-env.js";
import {
  formatApiKeyPreview,
  normalizeApiKeyInput,
  validateApiKeyInput,
} from "./auth-choice.api-key.js";
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
import { createVpsAwareOAuthHandlers } from "./oauth-flow.js";
import { applyAuthProfileConfig, writeOAuthCredentials } from "./onboard-auth.js";
import { openUrl } from "./onboard-helpers.js";
import {
  applyOpenAICodexModelDefault,
  OPENAI_CODEX_DEFAULT_MODEL,
} from "./openai-codex-model-default.js";

export async function applyAuthChoiceOpenAI(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  let authChoice = params.authChoice;
  if (authChoice === "apiKey" && params.opts?.tokenProvider === "openai") {
    authChoice = "openai-api-key";
  }

  if (authChoice === "openai-api-key") {
    const envKey = resolveEnvApiKey("openai");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Usar OPENAI_API_KEY existente (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        const result = upsertSharedEnvVar({
          key: "OPENAI_API_KEY",
          value: envKey.apiKey,
        });
        if (!process.env.OPENAI_API_KEY) {
          process.env.OPENAI_API_KEY = envKey.apiKey;
        }
        await params.prompter.note(
          `Copiada OPENAI_API_KEY para ${result.path} para compatibilidade com launchd.`,
          "Chave de API da OpenAI",
        );
        return { config: params.config };
      }
    }

    let key: string | undefined;
    if (params.opts?.token && params.opts?.tokenProvider === "openai") {
      key = params.opts.token;
    } else {
      key = await params.prompter.text({
        message: "Insira a chave de API da OpenAI",
        validate: validateApiKeyInput,
      });
    }

    const trimmed = normalizeApiKeyInput(String(key));
    const result = upsertSharedEnvVar({
      key: "OPENAI_API_KEY",
      value: trimmed,
    });
    process.env.OPENAI_API_KEY = trimmed;
    await params.prompter.note(
      `Salva OPENAI_API_KEY em ${result.path} para compatibilidade com launchd.`,
      "Chave de API da OpenAI",
    );
    return { config: params.config };
  }

  if (params.authChoice === "openai-codex") {
    let nextConfig = params.config;
    let agentModelOverride: string | undefined;
    const noteAgentModel = async (model: string) => {
      if (!params.agentId) return;
      await params.prompter.note(
        `Modelo padrão definido para ${model} para o agente "${params.agentId}".`,
        "Modelo configurado",
      );
    };

    const isRemote = isRemoteEnvironment();
    await params.prompter.note(
      isRemote
        ? [
            "Você está em um ambiente remoto/VPS.",
            "Uma URL será mostrada para você abrir em seu navegador LOCAL.",
            "Após fazer login, cole a URL de redirecionamento aqui.",
          ].join("\n")
        : [
            "O navegador abrirá para autenticação na OpenAI.",
            "Se o callback não completar automaticamente, cole a URL de redirecionamento.",
            "O OAuth da OpenAI usa localhost:1455 para o callback.",
          ].join("\n"),
      "OAuth do OpenAI Codex",
    );
    const spin = params.prompter.progress("Iniciando fluxo OAuth…");
    try {
      const { onAuth, onPrompt } = createVpsAwareOAuthHandlers({
        isRemote,
        prompter: params.prompter,
        runtime: params.runtime,
        spin,
        openUrl,
        localBrowserMessage: "Complete o login no navegador…",
      });

      const creds = await loginOpenAICodex({
        onAuth,
        onPrompt,
        onProgress: (msg) => spin.update(msg),
      });
      spin.stop("OAuth da OpenAI concluído");
      if (creds) {
        await writeOAuthCredentials("openai-codex", creds, params.agentDir);
        nextConfig = applyAuthProfileConfig(nextConfig, {
          profileId: "openai-codex:default",
          provider: "openai-codex",
          mode: "oauth",
        });
        if (params.setDefaultModel) {
          const applied = applyOpenAICodexModelDefault(nextConfig);
          nextConfig = applied.next;
          if (applied.changed) {
            await params.prompter.note(
              `Modelo padrão definido para ${OPENAI_CODEX_DEFAULT_MODEL}`,
              "Modelo configurado",
            );
          }
        } else {
          agentModelOverride = OPENAI_CODEX_DEFAULT_MODEL;
          await noteAgentModel(OPENAI_CODEX_DEFAULT_MODEL);
        }
      }
    } catch (err) {
      spin.stop("OAuth da OpenAI falhou");
      params.runtime.error(String(err));
      await params.prompter.note(
        "Problemas com o OAuth? Veja https://docs.zero.local/start/faq",
        "Ajuda do OAuth",
      );
    }
    return { config: nextConfig, agentModelOverride };
  }

  if (params.authChoice === "codex-cli") {
    let nextConfig = params.config;
    let agentModelOverride: string | undefined;
    const noteAgentModel = async (model: string) => {
      if (!params.agentId) return;
      await params.prompter.note(
        `Modelo padrão definido para ${model} para o agente "${params.agentId}".`,
        "Modelo configurado",
      );
    };

    const store = ensureAuthProfileStore(params.agentDir);
    if (!store.profiles[CODEX_CLI_PROFILE_ID]) {
      await params.prompter.note(
        "Nenhuma credencial do Codex CLI encontrada em ~/.codex/auth.json.",
        "OAuth do Codex CLI",
      );
      return { config: nextConfig, agentModelOverride };
    }
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: CODEX_CLI_PROFILE_ID,
      provider: "openai-codex",
      mode: "oauth",
    });
    if (params.setDefaultModel) {
      const applied = applyOpenAICodexModelDefault(nextConfig);
      nextConfig = applied.next;
      if (applied.changed) {
        await params.prompter.note(
          `Modelo padrão definido para ${OPENAI_CODEX_DEFAULT_MODEL}`,
          "Modelo configurado",
        );
      }
    } else {
      agentModelOverride = OPENAI_CODEX_DEFAULT_MODEL;
      await noteAgentModel(OPENAI_CODEX_DEFAULT_MODEL);
    }
    return { config: nextConfig, agentModelOverride };
  }

  return null;
}
