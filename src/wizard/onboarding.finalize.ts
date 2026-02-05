import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_BOOTSTRAP_FILENAME } from "../agents/workspace.js";
import {
  DEFAULT_GATEWAY_DAEMON_RUNTIME,
  GATEWAY_DAEMON_RUNTIME_OPTIONS,
  type GatewayDaemonRuntime,
} from "../commands/daemon-runtime.js";
import { healthCommand } from "../commands/health.js";
import { formatHealthCheckFailure } from "../commands/health-format.js";
import {
  detectBrowserOpenSupport,
  formatControlUiSshHint,
  openUrl,
  openUrlInBackground,
  probeGatewayReachable,
  waitForGatewayReachable,
  resolveControlUiLinks,
} from "../commands/onboard-helpers.js";
import { formatCliCommand } from "../cli/command-format.js";
import type { OnboardOptions } from "../commands/onboard-types.js";
import type { ZEROConfig } from "../config/config.js";
import { resolveGatewayService } from "../daemon/service.js";
import { isSystemdUserServiceAvailable } from "../daemon/systemd.js";
import { ensureControlUiAssetsBuilt } from "../infra/control-ui-assets.js";
import type { RuntimeEnv } from "../runtime.js";
import { runTui } from "../tui/tui.js";
import { resolveUserPath } from "../utils.js";
import {
  buildGatewayInstallPlan,
  gatewayInstallErrorHint,
} from "../commands/daemon-install-helpers.js";
import type { GatewayWizardSettings, WizardFlow } from "./onboarding.types.js";
import type { WizardPrompter } from "./prompts.js";

type FinalizeOnboardingOptions = {
  flow: WizardFlow;
  opts: OnboardOptions;
  baseConfig: ZEROConfig;
  nextConfig: ZEROConfig;
  workspaceDir: string;
  settings: GatewayWizardSettings;
  prompter: WizardPrompter;
  runtime: RuntimeEnv;
};

export async function finalizeOnboardingWizard(options: FinalizeOnboardingOptions) {
  const { flow, opts, baseConfig, nextConfig, settings, prompter, runtime } = options;

  const withWizardProgress = async <T>(
    label: string,
    options: { doneMessage?: string },
    work: (progress: { update: (message: string) => void }) => Promise<T>,
  ): Promise<T> => {
    const progress = prompter.progress(label);
    try {
      return await work(progress);
    } finally {
      progress.stop(options.doneMessage);
    }
  };

  const systemdAvailable =
    process.platform === "linux" ? await isSystemdUserServiceAvailable() : true;
  if (process.platform === "linux" && !systemdAvailable) {
    await prompter.note(
      "Serviços de usuário do Systemd estão indisponíveis. Pulando verificações de persistência (lingering) e instalação do serviço.",
      "Systemd",
    );
  }

  if (process.platform === "linux" && systemdAvailable) {
    const { ensureSystemdUserLingerInteractive } = await import("../commands/systemd-linger.js");
    await ensureSystemdUserLingerInteractive({
      runtime,
      prompter: {
        confirm: prompter.confirm,
        note: prompter.note,
      },
      reason:
        "Instalações no Linux usam um serviço de usuário do systemd por padrão. Sem persistência (lingering), o systemd interrompe a sessão do usuário ao sair (logout) ou ficar inativo e encerra o Gateway.",
      requireConfirm: false,
    });
  }

  const explicitInstallDaemon =
    typeof opts.installDaemon === "boolean" ? opts.installDaemon : undefined;
  let installDaemon: boolean;
  if (explicitInstallDaemon !== undefined) {
    installDaemon = explicitInstallDaemon;
  } else if (process.platform === "linux" && !systemdAvailable) {
    installDaemon = false;
  } else if (flow === "quickstart") {
    installDaemon = true;
  } else {
    installDaemon = await prompter.confirm({
      message: "Instalar serviço do Gateway (recomendado)",
      initialValue: true,
    });
  }

  if (process.platform === "linux" && !systemdAvailable && installDaemon) {
    await prompter.note(
      "Serviços de usuário do Systemd estão indisponíveis; pulando instalação do serviço. Use seu supervisor de container ou `docker compose up -d`.",
      "Serviço do Gateway",
    );
    installDaemon = false;
  }

  if (installDaemon) {
    const daemonRuntime =
      flow === "quickstart"
        ? (DEFAULT_GATEWAY_DAEMON_RUNTIME as GatewayDaemonRuntime)
        : ((await prompter.select({
            message: "Runtime do serviço do Gateway",
            options: GATEWAY_DAEMON_RUNTIME_OPTIONS,
            initialValue: opts.daemonRuntime ?? DEFAULT_GATEWAY_DAEMON_RUNTIME,
          })) as GatewayDaemonRuntime);
    if (flow === "quickstart") {
      await prompter.note(
        "O QuickStart usa Node para o serviço do Gateway (estável + suportado).",
        "Runtime do serviço do Gateway",
      );
    }
    const service = resolveGatewayService();
    const loaded = await service.isLoaded({ env: process.env });
    if (loaded) {
      const action = (await prompter.select({
        message: "Serviço do Gateway já está instalado",
        options: [
          { value: "restart", label: "Reiniciar" },
          { value: "reinstall", label: "Reinstalar" },
          { value: "skip", label: "Pular" },
        ],
      })) as "restart" | "reinstall" | "skip";
      if (action === "restart") {
        await withWizardProgress(
          "Serviço do Gateway",
          { doneMessage: "Serviço do Gateway reiniciado." },
          async (progress) => {
            progress.update("Reiniciando serviço do Gateway…");
            await service.restart({
              env: process.env,
              stdout: process.stdout,
            });
          },
        );
      } else if (action === "reinstall") {
        await withWizardProgress(
          "Serviço do Gateway",
          { doneMessage: "Serviço do Gateway desinstalado." },
          async (progress) => {
            progress.update("Desinstalando serviço do Gateway…");
            await service.uninstall({ env: process.env, stdout: process.stdout });
          },
        );
      }
    }

    if (!loaded || (loaded && (await service.isLoaded({ env: process.env })) === false)) {
      const progress = prompter.progress("Serviço do Gateway");
      let installError: string | null = null;
      try {
        progress.update("Preparando serviço do Gateway…");
        const { programArguments, workingDirectory, environment } = await buildGatewayInstallPlan({
          env: process.env,
          port: settings.port,
          token: settings.gatewayToken,
          runtime: daemonRuntime,
          warn: (message, title) => prompter.note(message, title),
          config: nextConfig,
        });

        progress.update("Instalando serviço do Gateway…");
        await service.install({
          env: process.env,
          stdout: process.stdout,
          programArguments,
          workingDirectory,
          environment,
        });
      } catch (err) {
        installError = err instanceof Error ? err.message : String(err);
      } finally {
        progress.stop(
          installError
            ? "Falha na instalação do serviço do Gateway."
            : "Serviço do Gateway instalado.",
        );
      }
      if (installError) {
        await prompter.note(
          `Falha na instalação do serviço do Gateway: ${installError}`,
          "Gateway",
        );
        await prompter.note(gatewayInstallErrorHint(), "Gateway");
      }
    }
  }

  if (!opts.skipHealth) {
    const probeLinks = resolveControlUiLinks({
      bind: nextConfig.gateway?.bind ?? "loopback",
      port: settings.port,
      customBindHost: nextConfig.gateway?.customBindHost,
      basePath: undefined,
    });
    // Daemon install/restart can briefly flap the WS; wait a bit so health check doesn't false-fail.
    await waitForGatewayReachable({
      url: probeLinks.wsUrl,
      token: settings.gatewayToken,
      deadlineMs: 15_000,
    });
    try {
      await healthCommand({ json: false, timeoutMs: 10_000 }, runtime);
    } catch (err) {
      runtime.error(formatHealthCheckFailure(err));
      await prompter.note(
        [
          "Docs:",
          "https://docs.zero.local/gateway/health",
          "https://docs.zero.local/gateway/troubleshooting",
        ].join("\n"),
        "Ajuda na verificação de saúde",
      );
    }
  }

  const controlUiEnabled =
    nextConfig.gateway?.controlUi?.enabled ?? baseConfig.gateway?.controlUi?.enabled ?? true;
  if (!opts.skipUi && controlUiEnabled) {
    const controlUiAssets = await ensureControlUiAssetsBuilt(runtime);
    if (!controlUiAssets.ok && controlUiAssets.message) {
      runtime.error(controlUiAssets.message);
    }
  }

  await prompter.note(
    [
      "Adicione nós (nodes) para funcionalidades extras:",
      "- App macOS (sistema + notificações)",
      "- App iOS (câmera/canvas)",
      "- App Android (câmera/canvas)",
    ].join("\n"),
    "Apps opcionais",
  );

  const controlUiBasePath =
    nextConfig.gateway?.controlUi?.basePath ?? baseConfig.gateway?.controlUi?.basePath;
  const links = resolveControlUiLinks({
    bind: settings.bind,
    port: settings.port,
    customBindHost: settings.customBindHost,
    basePath: controlUiBasePath,
  });
  const tokenParam =
    settings.authMode === "token" && settings.gatewayToken
      ? `?token=${encodeURIComponent(settings.gatewayToken)}`
      : "";
  const authedUrl = `${links.httpUrl}${tokenParam}`;
  const gatewayProbe = await probeGatewayReachable({
    url: links.wsUrl,
    token: settings.authMode === "token" ? settings.gatewayToken : undefined,
    password: settings.authMode === "password" ? nextConfig.gateway?.auth?.password : "",
  });
  const gatewayStatusLine = gatewayProbe.ok
    ? "Gateway: acessível"
    : `Gateway: não detectado${gatewayProbe.detail ? ` (${gatewayProbe.detail})` : ""}`;
  const bootstrapPath = path.join(
    resolveUserPath(options.workspaceDir),
    DEFAULT_BOOTSTRAP_FILENAME,
  );
  const hasBootstrap = await fs
    .access(bootstrapPath)
    .then(() => true)
    .catch(() => false);

  await prompter.note(
    [
      `UI Web: ${links.httpUrl}`,
      tokenParam ? `UI Web (com token): ${authedUrl}` : undefined,
      `Gateway WS: ${links.wsUrl}`,
      gatewayStatusLine,
      "Docs: https://docs.zero.local/web/control-ui",
    ]
      .filter(Boolean)
      .join("\n"),
    "Interface de Controle (Control UI)",
  );

  let controlUiOpened = false;
  let controlUiOpenHint: string | undefined;
  let seededInBackground = false;
  let hatchChoice: "tui" | "web" | "later" | null = null;

  if (!opts.skipUi && gatewayProbe.ok) {
    if (hasBootstrap) {
      await prompter.note(
        [
          "Esta é a ação definidora que torna o seu agente você mesmo.",
          "Por favor, tome o seu tempo.",
          "Quanto mais você disser a ele, melhor será a experiência.",
          'Enviaremos: "Acorde, meu amigo!"',
        ].join("\n"),
        "Iniciar TUI (melhor opção!)",
      );
    }

    await prompter.note(
      [
        "Token do Gateway: autenticação compartilhada para o Gateway + Control UI.",
        "Armazenado em: ~/.zero/zero.json (gateway.auth.token) ou ZERO_GATEWAY_TOKEN.",
        "A UI Web armazena uma cópia no localStorage deste navegador (zero.control.settings.v1).",
        `Obtenha o link com token a qualquer momento: ${formatCliCommand("zero dashboard --no-open")}`,
      ].join("\n"),
      "Token",
    );

    hatchChoice = (await prompter.select({
      message: "Como você deseja iniciar seu bot?",
      options: [
        { value: "tui", label: "Iniciar na TUI (recomendado)" },
        { value: "web", label: "Abrir a UI Web" },
        { value: "later", label: "Fazer isso mais tarde" },
      ],
      initialValue: "tui",
    })) as "tui" | "web" | "later";

    if (hatchChoice === "tui") {
      await runTui({
        url: links.wsUrl,
        token: settings.authMode === "token" ? settings.gatewayToken : undefined,
        password: settings.authMode === "password" ? nextConfig.gateway?.auth?.password : "",
        // Safety: onboarding TUI should not auto-deliver to lastProvider/lastTo.
        deliver: false,
        message: hasBootstrap ? "Acorde, meu amigo!" : undefined,
      });
      if (settings.authMode === "token" && settings.gatewayToken) {
        seededInBackground = await openUrlInBackground(authedUrl);
      }
      if (seededInBackground) {
        await prompter.note(
          `UI Web preparada em segundo plano. Abra mais tarde com: ${formatCliCommand(
            "zero dashboard --no-open",
          )}`,
          "UI Web",
        );
      }
    } else if (hatchChoice === "web") {
      const browserSupport = await detectBrowserOpenSupport();
      if (browserSupport.ok) {
        controlUiOpened = await openUrl(authedUrl);
        if (!controlUiOpened) {
          controlUiOpenHint = formatControlUiSshHint({
            port: settings.port,
            basePath: controlUiBasePath,
            token: settings.gatewayToken,
          });
        }
      } else {
        controlUiOpenHint = formatControlUiSshHint({
          port: settings.port,
          basePath: controlUiBasePath,
          token: settings.gatewayToken,
        });
      }
      await prompter.note(
        [
          `Link do Dashboard (com token): ${authedUrl}`,
          controlUiOpened
            ? "Aberto no seu navegador. Mantenha essa aba para controlar o ZERO."
            : "Copie/cole esta URL em um navegador nesta máquina para controlar o ZERO.",
          controlUiOpenHint,
        ]
          .filter(Boolean)
          .join("\n"),
        "Dashboard pronto",
      );
    } else {
      await prompter.note(
        `Quando estiver pronto: ${formatCliCommand("zero dashboard --no-open")}`,
        "Depois",
      );
    }
  } else if (opts.skipUi) {
    await prompter.note("Pulando os prompts da Control UI/TUI.", "Interface de Controle");
  }

  await prompter.note(
    [
      "Faça backup do seu workspace do agente.",
      "Docs: https://docs.zero.local/concepts/agent-workspace",
    ].join("\n"),
    "Backup do Workspace",
  );

  await prompter.note(
    "Executar agentes no seu computador é arriscado — fortaleça sua segurança: https://docs.zero.local/security",
    "Segurança",
  );

  const shouldOpenControlUi =
    !opts.skipUi &&
    settings.authMode === "token" &&
    Boolean(settings.gatewayToken) &&
    hatchChoice === null;
  if (shouldOpenControlUi) {
    const browserSupport = await detectBrowserOpenSupport();
    if (browserSupport.ok) {
      controlUiOpened = await openUrl(authedUrl);
      if (!controlUiOpened) {
        controlUiOpenHint = formatControlUiSshHint({
          port: settings.port,
          basePath: controlUiBasePath,
          token: settings.gatewayToken,
        });
      }
    } else {
      controlUiOpenHint = formatControlUiSshHint({
        port: settings.port,
        basePath: controlUiBasePath,
        token: settings.gatewayToken,
      });
    }

    await prompter.note(
      [
        `Link do Dashboard (com token): ${authedUrl}`,
        controlUiOpened
          ? "Aberto no seu navegador. Mantenha essa aba para controlar o ZERO."
          : "Copie/cole esta URL em um navegador nesta máquina para controlar o ZERO.",
        controlUiOpenHint,
      ]
        .filter(Boolean)
        .join("\n"),
      "Dashboard pronto",
    );
  }

  const webSearchKey = (nextConfig.tools?.web?.search?.apiKey ?? "").trim();
  const webSearchEnv = (process.env.BRAVE_API_KEY ?? "").trim();
  const hasWebSearchKey = Boolean(webSearchKey || webSearchEnv);
  await prompter.note(
    hasWebSearchKey
      ? [
          "A busca na web está habilitada, então seu agente pode procurar coisas online quando necessário.",
          "",
          webSearchKey
            ? "Chave API: armazenada na configuração (tools.web.search.apiKey)."
            : "Chave API: fornecida via variável de ambiente BRAVE_API_KEY (Gateway).",
          "Docs: https://docs.zero.local/tools/web",
        ].join("\n")
      : [
          "Se você deseja que seu agente possa pesquisar na web, precisará de uma chave de API.",
          "",
          "O ZERO usa o Brave Search para a ferramenta `web_search`. Sem uma chave de API do Brave Search, a busca na web não funcionará.",
          "",
          "Configure interativamente:",
          `- Execute: ${formatCliCommand("zero configure --section web")}`,
          "- Habilite o web_search e cole sua chave de API do Brave Search",
          "",
          "Alternativa: defina BRAVE_API_KEY no ambiente do Gateway (sem mudanças na config).",
          "Docs: https://docs.zero.local/tools/web",
        ].join("\n"),
    "Busca na web (opcional)",
  );

  await prompter.note(
    'O que agora: https://zero.local/showcase ("O que as pessoas estão construindo").',
    "O que fazer agora",
  );

  await prompter.outro(
    controlUiOpened
      ? "Onboarding concluído. Dashboard aberto com seu token; mantenha essa aba para controlar o ZERO."
      : seededInBackground
        ? "Onboarding concluído. UI Web preparada em segundo plano; abra-a a qualquer momento com o link com token acima."
        : "Onboarding concluído. Use o link do dashboard com token acima para controlar o ZERO.",
  );
}
