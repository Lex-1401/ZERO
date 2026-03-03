import { ensureAuthProfileStore } from "../agents/auth-profiles.js";
import { setVoiceEnabled } from "../voice/tts-service.js"; // VOICE INTEGRATION
import { listChannelPlugins } from "../channels/plugins/index.js";
import {
  applyAuthChoice,
  resolvePreferredProviderForAuthChoice,
  warnIfModelConfigLooksOff,
} from "../commands/auth-choice.js";
import { promptAuthChoiceGrouped } from "../commands/auth-choice-prompt.js";
import { applyPrimaryModel, promptDefaultModel } from "../commands/model-picker.js";
import { setupChannels } from "../commands/onboard-channels.js";
import {
  applyWizardMetadata,
  DEFAULT_WORKSPACE,
  ensureWorkspaceAndSessions,
  handleReset,
  printWizardHeader,
  probeGatewayReachable,
  summarizeExistingConfig,
} from "../commands/onboard-helpers.js";
import { promptRemoteGatewayConfig } from "../commands/onboard-remote.js";
import { setupSkills } from "../commands/onboard-skills.js";
import { setupInternalHooks } from "../commands/onboard-hooks.js";
import type {
  GatewayAuthChoice,
  OnboardMode,
  OnboardOptions,
  ResetScope,
} from "../commands/onboard-types.js";
import { formatCliCommand } from "../cli/command-format.js";
import type { ZEROConfig } from "../config/config.js";
import {
  DEFAULT_GATEWAY_PORT,
  readConfigFileSnapshot,
  resolveGatewayPort,
  writeConfigFile,
} from "../config/config.js";
import { logConfigUpdated } from "../config/logging.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { resolveUserPath } from "../utils.js";
import { finalizeOnboardingWizard } from "./onboarding.finalize.js";
import { runSoulInterview } from "./onboarding.soul.js";
import { configureGatewayForOnboarding } from "./onboarding.gateway-config.js";
import type { QuickstartGatewayDefaults, WizardFlow } from "./onboarding.types.js";
import { WizardCancelledError, type WizardPrompter } from "./prompts.js";

async function requireRiskAcknowledgement(params: {
  opts: OnboardOptions;
  prompter: WizardPrompter;
}) {
  if (params.opts.acceptRisk === true) return;

  await params.prompter.note(
    [
      "Por favor, leia: https://github.com/Lex-1401/ZERO/tree/main/docs/security",
      "",
      "Os agentes ZERO podem executar comandos, ler/escrever arquivos e agir através de quaisquer ferramentas que você habilitar. Eles só podem enviar mensagens nos canais que você configurar (por exemplo, uma conta que você logar nesta máquina, ou uma conta de bot como Slack/Discord).",
      "",
      "Se você é novo nisso, comece com o sandbox e o menor privilégio. Isso ajuda a limitar o que um agente pode fazer se for enganado ou cometer um erro.",
      "Saiba mais: https://github.com/Lex-1401/ZERO/tree/main/docs/sandboxing",
    ].join("\n"),
    "Segurança",
  );

  const ok = await params.prompter.confirm({
    message: "Eu entendo que isso é poderoso e inerentemente arriscado. Continuar?",
    initialValue: false,
  });
  if (!ok) {
    throw new WizardCancelledError("risco não aceito");
  }
}

export async function runOnboardingWizard(
  opts: OnboardOptions,
  runtime: RuntimeEnv = defaultRuntime,
  prompter: WizardPrompter,
) {
  printWizardHeader(runtime);

  // VOICE INTEGRATION START
  // Ask the user about voice interaction right at the start.
  // This satisfies the requirement: "Zero asks already in the 'baptism' if the user wants a real voice assistant"
  const enableVoice = await prompter.confirm({
    message: "Deseja ativar o modo de voz (falar/ouvir) para interagir com o ZERO?",
    initialValue: false,
  });
  if (enableVoice) {
    setVoiceEnabled(true);
    await prompter.note(
      "Modo de voz ativado. O ZERO falará com você a partir de agora.",
      "Voz Ativada",
    );
  }
  // VOICE INTEGRATION END

  await prompter.intro("Configuração do ZERO (onboarding)");
  await requireRiskAcknowledgement({ opts, prompter });

  const snapshot = await readConfigFileSnapshot();
  let baseConfig: ZEROConfig = snapshot.valid ? snapshot.config : {};

  if (snapshot.exists && !snapshot.valid) {
    await prompter.note(summarizeExistingConfig(baseConfig), "Configuração inválida");
    if (snapshot.issues.length > 0) {
      await prompter.note(
        [
          ...snapshot.issues.map((iss) => `- ${iss.path}: ${iss.message}`),
          "",
          "Docs: https://github.com/Lex-1401/ZERO/tree/main/docs/gateway/configuration",
        ].join("\n"),
        "Problemas na configuração",
      );
    }
    await prompter.outro(
      `Configuração inválida. Execute \`${formatCliCommand("zero doctor")}\` para repará-la, então execute o onboarding novamente.`,
    );
    runtime.exit(1);
    return;
  }

  const quickstartHint = `Configure os detalhes mais tarde via ${formatCliCommand("zero configure")}.`;
  const manualHint = "Configure porta, rede, Tailscale e opções de autenticação.";
  const explicitFlowRaw = opts.flow?.trim();
  const normalizedExplicitFlow = explicitFlowRaw === "manual" ? "advanced" : explicitFlowRaw;
  if (
    normalizedExplicitFlow &&
    normalizedExplicitFlow !== "quickstart" &&
    normalizedExplicitFlow !== "advanced"
  ) {
    runtime.error("Fluxo --flow inválido (use quickstart, manual ou advanced).");
    runtime.exit(1);
    return;
  }
  const explicitFlow: WizardFlow | undefined =
    normalizedExplicitFlow === "quickstart" || normalizedExplicitFlow === "advanced"
      ? normalizedExplicitFlow
      : undefined;
  let flow: WizardFlow =
    explicitFlow ??
    ((await prompter.select({
      message: "Modo de onboarding",
      options: [
        { value: "quickstart", label: "QuickStart", hint: quickstartHint },
        { value: "advanced", label: "Manual", hint: manualHint },
      ],
      initialValue: "quickstart",
    })) as "quickstart" | "advanced");

  if (opts.mode === "remote" && flow === "quickstart") {
    await prompter.note(
      "O QuickStart suporta apenas gateways locais. Mudando para o modo Manual.",
      "QuickStart",
    );
    flow = "advanced";
  }

  if (snapshot.exists) {
    await prompter.note(summarizeExistingConfig(baseConfig), "Configuração existente detectada");

    const action = (await prompter.select({
      message: "Tratamento da configuração",
      options: [
        { value: "keep", label: "Usar valores existentes" },
        { value: "modify", label: "Atualizar valores" },
        { value: "reset", label: "Resetar" },
      ],
    })) as "keep" | "modify" | "reset";

    if (action === "reset") {
      const workspaceDefault = baseConfig.agents?.defaults?.workspace ?? DEFAULT_WORKSPACE;
      const resetScope = (await prompter.select({
        message: "Escopo do reset",
        options: [
          { value: "config", label: "Apenas configuração" },
          {
            value: "config+creds+sessions",
            label: "Configuração + credenciais + sessões",
          },
          {
            value: "full",
            label: "Reset completo (configuração + credenciais + sessões + workspace)",
          },
        ],
      })) as ResetScope;
      await handleReset(resetScope, resolveUserPath(workspaceDefault), runtime);
      baseConfig = {};
    }
  }

  const quickstartGateway: QuickstartGatewayDefaults = (() => {
    const hasExisting =
      typeof baseConfig.gateway?.port === "number" ||
      baseConfig.gateway?.bind !== undefined ||
      baseConfig.gateway?.auth?.mode !== undefined ||
      baseConfig.gateway?.auth?.token !== undefined ||
      baseConfig.gateway?.auth?.password !== undefined ||
      baseConfig.gateway?.customBindHost !== undefined ||
      baseConfig.gateway?.tailscale?.mode !== undefined;

    const bindRaw = baseConfig.gateway?.bind;
    const bind =
      bindRaw === "loopback" ||
      bindRaw === "lan" ||
      bindRaw === "auto" ||
      bindRaw === "custom" ||
      bindRaw === "tailnet"
        ? bindRaw
        : "lan";

    let authMode: GatewayAuthChoice = "token";
    if (
      baseConfig.gateway?.auth?.mode === "token" ||
      baseConfig.gateway?.auth?.mode === "password"
    ) {
      authMode = baseConfig.gateway.auth.mode;
    } else if (baseConfig.gateway?.auth?.token) {
      authMode = "token";
    } else if (baseConfig.gateway?.auth?.password) {
      authMode = "password";
    }

    const tailscaleRaw = baseConfig.gateway?.tailscale?.mode;
    const tailscaleMode =
      tailscaleRaw === "off" || tailscaleRaw === "serve" || tailscaleRaw === "funnel"
        ? tailscaleRaw
        : "off";

    return {
      hasExisting,
      port: resolveGatewayPort(baseConfig),
      bind,
      authMode,
      tailscaleMode,
      token: baseConfig.gateway?.auth?.token,
      password: baseConfig.gateway?.auth?.password,
      customBindHost: baseConfig.gateway?.customBindHost,
      tailscaleResetOnExit: baseConfig.gateway?.tailscale?.resetOnExit ?? false,
    };
  })();

  if (flow === "quickstart") {
    const formatBind = (value: "loopback" | "lan" | "auto" | "custom" | "tailnet") => {
      if (value === "loopback") return "Loopback (127.0.0.1)";
      if (value === "lan") return "LAN";
      if (value === "custom") return "IP customizado";
      if (value === "tailnet") return "Tailnet (IP do Tailscale)";
      return "Auto";
    };
    const formatAuth = (value: GatewayAuthChoice) => {
      if (value === "off") return "Desativado (apenas loopback)";
      if (value === "token") return "Token (padrão)";
      return "Senha";
    };
    const formatTailscale = (value: "off" | "serve" | "funnel") => {
      if (value === "off") return "Desativado";
      if (value === "serve") return "Serve";
      return "Funnel";
    };
    const quickstartLines = quickstartGateway.hasExisting
      ? [
          "Mantendo suas configurações atuais de gateway:",
          `Porta do gateway: ${quickstartGateway.port}`,
          `Bind do gateway: ${formatBind(quickstartGateway.bind)}`,
          ...(quickstartGateway.bind === "custom" && quickstartGateway.customBindHost
            ? [`IP customizado do gateway: ${quickstartGateway.customBindHost}`]
            : []),
          `Autenticação do gateway: ${formatAuth(quickstartGateway.authMode)}`,
          `Exposição via Tailscale: ${formatTailscale(quickstartGateway.tailscaleMode)}`,
          "Direcionando para os canais de chat.",
        ]
      : [
          `Porta do gateway: ${DEFAULT_GATEWAY_PORT}`,
          "Bind do gateway: Loopback (127.0.0.1)",
          "Autenticação do gateway: Token (padrão)",
          "Exposição via Tailscale: Desativado",
          "Direcionando para os canais de chat.",
        ];
    await prompter.note(quickstartLines.join("\n"), "QuickStart");
  }

  const localPort = resolveGatewayPort(baseConfig);
  const localUrl = `ws://127.0.0.1:${localPort}`;
  const localProbe = await probeGatewayReachable({
    url: localUrl,
    token: baseConfig.gateway?.auth?.token ?? process.env.ZERO_GATEWAY_TOKEN,
    password: baseConfig.gateway?.auth?.password ?? process.env.ZERO_GATEWAY_PASSWORD,
  });
  const remoteUrl = baseConfig.gateway?.remote?.url?.trim() ?? "";
  const remoteProbe = remoteUrl
    ? await probeGatewayReachable({
        url: remoteUrl,
        token: baseConfig.gateway?.remote?.token,
      })
    : null;

  const mode =
    opts.mode ??
    (flow === "quickstart"
      ? "local"
      : ((await prompter.select({
          message: "O que você deseja configurar?",
          options: [
            {
              value: "local",
              label: "Gateway local (esta máquina)",
              hint: localProbe.ok
                ? `Gateway acessível (${localUrl})`
                : `Nenhum gateway detectado (${localUrl})`,
            },
            {
              value: "remote",
              label: "Gateway remoto (apenas informações)",
              hint: !remoteUrl
                ? "Nenhuma URL remota configurada ainda"
                : remoteProbe?.ok
                  ? `Gateway acessível (${remoteUrl})`
                  : `Configurado mas inacessível (${remoteUrl})`,
            },
          ],
        })) as OnboardMode));

  if (mode === "remote") {
    let nextConfig = await promptRemoteGatewayConfig(baseConfig, prompter);
    nextConfig = applyWizardMetadata(nextConfig, { command: "onboard", mode });
    await writeConfigFile(nextConfig);
    logConfigUpdated(runtime);
    await prompter.outro("Gateway remoto configurado.");
    return;
  }

  const workspaceInput =
    opts.workspace ??
    (flow === "quickstart"
      ? (baseConfig.agents?.defaults?.workspace ?? DEFAULT_WORKSPACE)
      : await prompter.text({
          message: "Diretório de workspace",
          initialValue: baseConfig.agents?.defaults?.workspace ?? DEFAULT_WORKSPACE,
        }));

  const workspaceDir = resolveUserPath(workspaceInput.trim() || DEFAULT_WORKSPACE);

  let nextConfig: ZEROConfig = {
    ...baseConfig,
    agents: {
      ...baseConfig.agents,
      defaults: {
        ...baseConfig.agents?.defaults,
        workspace: workspaceDir,
      },
    },
    gateway: {
      ...baseConfig.gateway,
      mode: "local",
    },
  };

  const authStore = ensureAuthProfileStore(undefined, {
    allowKeychainPrompt: false,
  });
  const authChoiceFromPrompt = opts.authChoice === undefined;
  const authChoice =
    opts.authChoice ??
    (await promptAuthChoiceGrouped({
      prompter,
      store: authStore,
      includeSkip: true,
      includeClaudeCliIfMissing: true,
    }));

  const authResult = await applyAuthChoice({
    authChoice,
    config: nextConfig,
    prompter,
    runtime,
    setDefaultModel: true,
    opts: {
      tokenProvider: opts.tokenProvider,
      token: opts.authChoice === "apiKey" && opts.token ? opts.token : undefined,
    },
  });
  nextConfig = authResult.config;

  if (authChoiceFromPrompt) {
    const modelSelection = await promptDefaultModel({
      config: nextConfig,
      prompter,
      allowKeep: true,
      ignoreAllowlist: true,
      preferredProvider: resolvePreferredProviderForAuthChoice(authChoice),
    });
    if (modelSelection.model) {
      nextConfig = applyPrimaryModel(nextConfig, modelSelection.model);
    }
  }

  await warnIfModelConfigLooksOff(nextConfig, prompter);

  const gateway = await configureGatewayForOnboarding({
    flow,
    baseConfig,
    nextConfig,
    localPort,
    quickstartGateway,
    prompter,
    runtime,
  });
  nextConfig = gateway.nextConfig;
  const settings = gateway.settings;

  if (opts.skipChannels ?? opts.skipProviders) {
    await prompter.note("Pulando configuração de canais.", "Canais");
  } else {
    const quickstartAllowFromChannels =
      flow === "quickstart"
        ? listChannelPlugins()
            .filter((plugin) => plugin.meta.quickstartAllowFrom)
            .map((plugin) => plugin.id)
        : [];
    nextConfig = await setupChannels(nextConfig, runtime, prompter, {
      allowSignalInstall: true,
      forceAllowFromChannels: quickstartAllowFromChannels,
      skipDmPolicyPrompt: flow === "quickstart",
      skipConfirm: flow === "quickstart",
      quickstartDefaults: flow === "quickstart",
    });
  }

  await writeConfigFile(nextConfig);
  logConfigUpdated(runtime);
  await ensureWorkspaceAndSessions(workspaceDir, runtime, {
    skipBootstrap: Boolean(nextConfig.agents?.defaults?.skipBootstrap),
  });

  if (opts.skipSkills) {
    await prompter.note("Pulando configuração de habilidades.", "Habilidades");
  } else {
    nextConfig = await setupSkills(nextConfig, workspaceDir, runtime, prompter);
  }

  // Setup hooks (session memory on /new)
  nextConfig = await setupInternalHooks(nextConfig, runtime, prompter);

  nextConfig = applyWizardMetadata(nextConfig, { command: "onboard", mode });
  await writeConfigFile(nextConfig);

  if (mode === "local" && !opts.nonInteractive) {
    await runSoulInterview({ prompter, workspaceDir });
  }

  await finalizeOnboardingWizard({
    flow,
    opts,
    baseConfig,
    nextConfig,
    workspaceDir,
    settings,
    prompter,
    runtime,
  });
}
