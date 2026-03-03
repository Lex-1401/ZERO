import { isRemoteEnvironment } from "./oauth-env.js";
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
import { loginChutes } from "./chutes-oauth.js";
import { createVpsAwareOAuthHandlers } from "./oauth-flow.js";
import { applyAuthProfileConfig, writeOAuthCredentials } from "./onboard-auth.js";
import { openUrl } from "./onboard-helpers.js";

export async function applyAuthChoiceOAuth(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  if (params.authChoice === "chutes") {
    let nextConfig = params.config;
    const isRemote = isRemoteEnvironment();
    const redirectUri =
      process.env.CHUTES_OAUTH_REDIRECT_URI?.trim() || "http://127.0.0.1:1456/oauth-callback";
    const scopes = process.env.CHUTES_OAUTH_SCOPES?.trim() || "openid profile chutes:invoke";
    const clientId =
      process.env.CHUTES_CLIENT_ID?.trim() ||
      String(
        await params.prompter.text({
          message: "Insira o client id OAuth da Chutes",
          placeholder: "cid_xxx",
          validate: (value) => (value?.trim() ? undefined : "Obrigatório"),
        }),
      ).trim();
    const clientSecret = process.env.CHUTES_CLIENT_SECRET?.trim() || undefined;

    await params.prompter.note(
      isRemote
        ? [
            "Você está em um ambiente remoto/VPS.",
            "Uma URL será mostrada para você abrir em seu navegador LOCAL.",
            "Após fazer login, cole a URL de redirecionamento aqui.",
            "",
            `Redirect URI: ${redirectUri}`,
          ].join("\n")
        : [
            "O navegador abrirá para autenticação na Chutes.",
            "Se o callback não completar automaticamente, cole a URL de redirecionamento.",
            "",
            `Redirect URI: ${redirectUri}`,
          ].join("\n"),
      "OAuth da Chutes",
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

      const creds = await loginChutes({
        app: {
          clientId,
          clientSecret,
          redirectUri,
          scopes: scopes.split(/\s+/).filter(Boolean),
        },
        manual: isRemote,
        onAuth,
        onPrompt,
        onProgress: (msg) => spin.update(msg),
      });

      spin.stop("OAuth da Chutes concluído");
      const email = creds.email?.trim() || "default";
      const profileId = `chutes:${email}`;

      await writeOAuthCredentials("chutes", creds, params.agentDir);
      nextConfig = applyAuthProfileConfig(nextConfig, {
        profileId,
        provider: "chutes",
        mode: "oauth",
      });
    } catch (err) {
      spin.stop("OAuth da Chutes falhou");
      params.runtime.error(String(err));
      await params.prompter.note(
        [
          "Problemas com o OAuth?",
          "Verifique o CHUTES_CLIENT_ID (e CHUTES_CLIENT_SECRET se necessário).",
          `Verifique se a URI de redirecionamento do app OAuth inclui: ${redirectUri}`,
          "Docs da Chutes: https://chutes.ai/docs/sign-in-with-chutes/overview",
        ].join("\n"),
        "Ajuda do OAuth",
      );
    }
    return { config: nextConfig };
  }

  return null;
}
