import { formatCliCommand } from "../cli/command-format.js";
import type { ZEROConfig } from "../config/config.js";
import { readConfigFileSnapshot, resolveGatewayPort, writeConfigFile } from "../config/config.js";
import { logConfigUpdated } from "../config/logging.js";
import { ensureControlUiAssetsBuilt } from "../infra/control-ui-assets.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { note } from "../terminal/note.js";
import { resolveUserPath } from "../utils.js";
import { createClackPrompter } from "../wizard/clack-prompter.js";
import { WizardCancelledError } from "../wizard/prompts.js";
import { removeChannelConfigWizard } from "./configure.channels.js";
import { maybeInstallDaemon } from "./configure.daemon.js";
import { promptGatewayConfig } from "./configure.gateway.js";
import { promptAuthConfig } from "./configure.gateway-auth.js";
import type {
  ChannelsWizardMode,
  ConfigureWizardParams,
  WizardSection,
} from "./configure.shared.js";
import {
  CONFIGURE_SECTION_OPTIONS,
  confirm,
  intro,
  outro,
  select,
  text,
} from "./configure.shared.js";
import { healthCommand } from "./health.js";
import { formatHealthCheckFailure } from "./health-format.js";
import { noteChannelStatus, setupChannels } from "./onboard-channels.js";
import {
  applyWizardMetadata,
  DEFAULT_WORKSPACE,
  ensureWorkspaceAndSessions,
  guardCancel,
  printWizardHeader,
  probeGatewayReachable,
  resolveControlUiLinks,
  summarizeExistingConfig,
  waitForGatewayReachable,
} from "./onboard-helpers.js";
import { promptRemoteGatewayConfig } from "./onboard-remote.js";
import { setupSkills } from "./onboard-skills.js";

type ConfigureSectionChoice = WizardSection | "__continue";

async function promptConfigureSection(
  runtime: RuntimeEnv,
  hasSelection: boolean,
): Promise<ConfigureSectionChoice> {
  return guardCancel(
    await select<ConfigureSectionChoice>({
      message: "Selecione as seções para configurar",
      options: [
        ...CONFIGURE_SECTION_OPTIONS,
        {
          value: "__continue",
          label: "Continuar",
          hint: hasSelection ? "Concluído" : "Pular por enquanto",
        },
      ],
      initialValue: CONFIGURE_SECTION_OPTIONS[0]?.value,
    }),
    runtime,
  );
}

async function promptChannelMode(runtime: RuntimeEnv): Promise<ChannelsWizardMode> {
  return guardCancel(
    await select({
      message: "Canais",
      options: [
        {
          value: "configure",
          label: "Configurar/vincular",
          hint: "Adicionar/atualizar canais; desativar contas não selecionadas",
        },
        {
          value: "remove",
          label: "Remover configuração de canal",
          hint: "Excluir tokens/configurações de canal de zero.json",
        },
      ],
      initialValue: "configure",
    }),
    runtime,
  ) as ChannelsWizardMode;
}

async function promptWebToolsConfig(
  nextConfig: ZEROConfig,
  runtime: RuntimeEnv,
): Promise<ZEROConfig> {
  const existingSearch = nextConfig.tools?.web?.search;
  const existingFetch = nextConfig.tools?.web?.fetch;
  const hasSearchKey = Boolean(existingSearch?.apiKey);

  note(
    [
      "A busca na web permite que seu agente pesquise coisas online usando a ferramenta `web_search`.",
      "Requer uma chave de API do Brave Search (você pode armazená-la na configuração ou definir BRAVE_API_KEY no ambiente do Gateway).",
      "Documentação: https://docs.zero.local/tools/web",
    ].join("\n"),
    "Busca na web",
  );

  const enableSearch = guardCancel(
    await confirm({
      message: "Ativar web_search (Brave Search)?",
      initialValue: existingSearch?.enabled ?? hasSearchKey,
    }),
    runtime,
  );

  let nextSearch = {
    ...existingSearch,
    enabled: enableSearch,
  };

  if (enableSearch) {
    const keyInput = guardCancel(
      await text({
        message: hasSearchKey
          ? "Chave de API do Brave Search (deixe em branco para manter a atual ou use BRAVE_API_KEY)"
          : "Chave de API do Brave Search (cole-a aqui; deixe em branco para usar BRAVE_API_KEY)",
        placeholder: hasSearchKey ? "Deixe em branco para manter a atual" : "BSA...",
      }),
      runtime,
    );
    const key = String(keyInput ?? "").trim();
    if (key) {
      nextSearch = { ...nextSearch, apiKey: key };
    } else if (!hasSearchKey) {
      note(
        [
          "Nenhuma chave armazenada ainda, portanto, web_search permanecerá indisponível.",
          "Armazene uma chave aqui ou defina BRAVE_API_KEY no ambiente do Gateway.",
          "Documentação: https://docs.zero.local/tools/web",
        ].join("\n"),
        "Busca na web",
      );
    }
  }

  const enableFetch = guardCancel(
    await confirm({
      message: "Ativar web_fetch (busca HTTP sem chave)?",
      initialValue: existingFetch?.enabled ?? true,
    }),
    runtime,
  );

  const nextFetch = {
    ...existingFetch,
    enabled: enableFetch,
  };

  return {
    ...nextConfig,
    tools: {
      ...nextConfig.tools,
      web: {
        ...nextConfig.tools?.web,
        search: nextSearch,
        fetch: nextFetch,
      },
    },
  };
}

export async function runConfigureWizard(
  opts: ConfigureWizardParams,
  runtime: RuntimeEnv = defaultRuntime,
) {
  try {
    printWizardHeader(runtime);
    intro(opts.command === "update" ? "Assistente de atualização do ZERO" : "Configuração do ZERO");
    const prompter = createClackPrompter();

    const snapshot = await readConfigFileSnapshot();
    const baseConfig: ZEROConfig = snapshot.valid ? snapshot.config : {};

    if (snapshot.exists) {
      const title = snapshot.valid ? "Configuração existente detectada" : "Configuração inválida";
      note(summarizeExistingConfig(baseConfig), title);
      if (!snapshot.valid && snapshot.issues.length > 0) {
        note(
          [
            ...snapshot.issues.map((iss) => `- ${iss.path}: ${iss.message}`),
            "",
            "Documentação: https://docs.zero.local/gateway/configuration",
          ].join("\n"),
          "Problemas na configuração",
        );
      }
      if (!snapshot.valid) {
        outro(
          `Configuração inválida. Execute \`${formatCliCommand("zero doctor")}\` para repará-la e, em seguida, execute a configuração novamente.`,
        );
        runtime.exit(1);
        return;
      }
    }

    const localUrl = "ws://127.0.0.1:18789";
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

    const mode = guardCancel(
      await select({
        message: "Onde o Gateway será executado?",
        options: [
          {
            value: "local",
            label: "Local (esta máquina)",
            hint: localProbe.ok
              ? `Gateway acessível (${localUrl})`
              : `Nenhum gateway detectado (${localUrl})`,
          },
          {
            value: "remote",
            label: "Remoto (apenas informações)",
            hint: !remoteUrl
              ? "Nenhuma URL remota configurada ainda"
              : remoteProbe?.ok
                ? `Gateway acessível (${remoteUrl})`
                : `Configurado, mas inacessível (${remoteUrl})`,
          },
        ],
      }),
      runtime,
    ) as "local" | "remote";

    if (mode === "remote") {
      let remoteConfig = await promptRemoteGatewayConfig(baseConfig, prompter);
      remoteConfig = applyWizardMetadata(remoteConfig, {
        command: opts.command,
        mode,
      });
      await writeConfigFile(remoteConfig);
      logConfigUpdated(runtime);
      outro("Gateway remoto configurado.");
      return;
    }

    let nextConfig = { ...baseConfig };
    let didSetGatewayMode = false;
    if (nextConfig.gateway?.mode !== "local") {
      nextConfig = {
        ...nextConfig,
        gateway: {
          ...nextConfig.gateway,
          mode: "local",
        },
      };
      didSetGatewayMode = true;
    }
    let workspaceDir =
      nextConfig.agents?.defaults?.workspace ??
      baseConfig.agents?.defaults?.workspace ??
      DEFAULT_WORKSPACE;
    let gatewayPort = resolveGatewayPort(baseConfig);
    let gatewayToken: string | undefined =
      nextConfig.gateway?.auth?.token ??
      baseConfig.gateway?.auth?.token ??
      process.env.ZERO_GATEWAY_TOKEN;

    const persistConfig = async () => {
      nextConfig = applyWizardMetadata(nextConfig, {
        command: opts.command,
        mode,
      });
      await writeConfigFile(nextConfig);
      logConfigUpdated(runtime);
    };

    if (opts.sections) {
      const selected = opts.sections;
      if (!selected || selected.length === 0) {
        outro("Nenhuma alteração selecionada.");
        return;
      }

      if (selected.includes("workspace")) {
        const workspaceInput = guardCancel(
          await text({
            message: "Diretório do workspace",
            initialValue: workspaceDir,
          }),
          runtime,
        );
        workspaceDir = resolveUserPath(String(workspaceInput ?? "").trim() || DEFAULT_WORKSPACE);
        nextConfig = {
          ...nextConfig,
          agents: {
            ...nextConfig.agents,
            defaults: {
              ...nextConfig.agents?.defaults,
              workspace: workspaceDir,
            },
          },
        };
        await ensureWorkspaceAndSessions(workspaceDir, runtime);
      }

      if (selected.includes("model")) {
        nextConfig = await promptAuthConfig(nextConfig, runtime, prompter);
      }

      if (selected.includes("web")) {
        nextConfig = await promptWebToolsConfig(nextConfig, runtime);
      }

      if (selected.includes("gateway")) {
        const gateway = await promptGatewayConfig(nextConfig, runtime);
        nextConfig = gateway.config;
        gatewayPort = gateway.port;
        gatewayToken = gateway.token;
      }

      if (selected.includes("channels")) {
        await noteChannelStatus({ cfg: nextConfig, prompter });
        const channelMode = await promptChannelMode(runtime);
        if (channelMode === "configure") {
          nextConfig = await setupChannels(nextConfig, runtime, prompter, {
            allowDisable: true,
            allowSignalInstall: true,
            skipConfirm: true,
            skipStatusNote: true,
          });
        } else {
          nextConfig = await removeChannelConfigWizard(nextConfig, runtime);
        }
      }

      if (selected.includes("skills")) {
        const wsDir = resolveUserPath(workspaceDir);
        nextConfig = await setupSkills(nextConfig, wsDir, runtime, prompter);
      }

      await persistConfig();

      if (selected.includes("daemon")) {
        if (!selected.includes("gateway")) {
          const portInput = guardCancel(
            await text({
              message: "Porta do gateway para instalação do serviço",
              initialValue: String(gatewayPort),
              validate: (value) => (Number.isFinite(Number(value)) ? undefined : "Porta inválida"),
            }),
            runtime,
          );
          gatewayPort = Number.parseInt(String(portInput), 10);
        }

        await maybeInstallDaemon({ runtime, port: gatewayPort, gatewayToken });
      }

      if (selected.includes("health")) {
        const localLinks = resolveControlUiLinks({
          bind: nextConfig.gateway?.bind ?? "loopback",
          port: gatewayPort,
          customBindHost: nextConfig.gateway?.customBindHost,
          basePath: undefined,
        });
        const remoteUrl = nextConfig.gateway?.remote?.url?.trim();
        const wsUrl =
          nextConfig.gateway?.mode === "remote" && remoteUrl ? remoteUrl : localLinks.wsUrl;
        const token = nextConfig.gateway?.auth?.token ?? process.env.ZERO_GATEWAY_TOKEN;
        const password = nextConfig.gateway?.auth?.password ?? process.env.ZERO_GATEWAY_PASSWORD;
        await waitForGatewayReachable({
          url: wsUrl,
          token,
          password,
          deadlineMs: 15_000,
        });
        try {
          await healthCommand({ json: false, timeoutMs: 10_000 }, runtime);
        } catch (err) {
          runtime.error(formatHealthCheckFailure(err));
          note(
            [
              "Documentação:",
              "https://docs.zero.local/gateway/health",
              "https://docs.zero.local/gateway/troubleshooting",
            ].join("\n"),
            "Ajuda da verificação de saúde",
          );
        }
      }
    } else {
      let ranSection = false;
      let didConfigureGateway = false;

      while (true) {
        const choice = await promptConfigureSection(runtime, ranSection);
        if (choice === "__continue") break;
        ranSection = true;

        if (choice === "workspace") {
          const workspaceInput = guardCancel(
            await text({
              message: "Diretório do workspace",
              initialValue: workspaceDir,
            }),
            runtime,
          );
          workspaceDir = resolveUserPath(String(workspaceInput ?? "").trim() || DEFAULT_WORKSPACE);
          nextConfig = {
            ...nextConfig,
            agents: {
              ...nextConfig.agents,
              defaults: {
                ...nextConfig.agents?.defaults,
                workspace: workspaceDir,
              },
            },
          };
          await ensureWorkspaceAndSessions(workspaceDir, runtime);
          await persistConfig();
        }

        if (choice === "model") {
          nextConfig = await promptAuthConfig(nextConfig, runtime, prompter);
          await persistConfig();
        }

        if (choice === "web") {
          nextConfig = await promptWebToolsConfig(nextConfig, runtime);
          await persistConfig();
        }

        if (choice === "gateway") {
          const gateway = await promptGatewayConfig(nextConfig, runtime);
          nextConfig = gateway.config;
          gatewayPort = gateway.port;
          gatewayToken = gateway.token;
          didConfigureGateway = true;
          await persistConfig();
        }

        if (choice === "channels") {
          await noteChannelStatus({ cfg: nextConfig, prompter });
          const channelMode = await promptChannelMode(runtime);
          if (channelMode === "configure") {
            nextConfig = await setupChannels(nextConfig, runtime, prompter, {
              allowDisable: true,
              allowSignalInstall: true,
              skipConfirm: true,
              skipStatusNote: true,
            });
          } else {
            nextConfig = await removeChannelConfigWizard(nextConfig, runtime);
          }
          await persistConfig();
        }

        if (choice === "skills") {
          const wsDir = resolveUserPath(workspaceDir);
          nextConfig = await setupSkills(nextConfig, wsDir, runtime, prompter);
          await persistConfig();
        }

        if (choice === "daemon") {
          if (!didConfigureGateway) {
            const portInput = guardCancel(
              await text({
                message: "Porta do gateway para instalação do serviço",
                initialValue: String(gatewayPort),
                validate: (value) =>
                  Number.isFinite(Number(value)) ? undefined : "Porta inválida",
              }),
              runtime,
            );
            gatewayPort = Number.parseInt(String(portInput), 10);
          }
          await maybeInstallDaemon({
            runtime,
            port: gatewayPort,
            gatewayToken,
          });
        }

        if (choice === "health") {
          const localLinks = resolveControlUiLinks({
            bind: nextConfig.gateway?.bind ?? "loopback",
            port: gatewayPort,
            customBindHost: nextConfig.gateway?.customBindHost,
            basePath: undefined,
          });
          const remoteUrl = nextConfig.gateway?.remote?.url?.trim();
          const wsUrl =
            nextConfig.gateway?.mode === "remote" && remoteUrl ? remoteUrl : localLinks.wsUrl;
          const token = nextConfig.gateway?.auth?.token ?? process.env.ZERO_GATEWAY_TOKEN;
          const password = nextConfig.gateway?.auth?.password ?? process.env.ZERO_GATEWAY_PASSWORD;
          await waitForGatewayReachable({
            url: wsUrl,
            token,
            password,
            deadlineMs: 15_000,
          });
          try {
            await healthCommand({ json: false, timeoutMs: 10_000 }, runtime);
          } catch (err) {
            runtime.error(formatHealthCheckFailure(err));
            note(
              [
                "Documentação:",
                "https://docs.zero.local/gateway/health",
                "https://docs.zero.local/gateway/troubleshooting",
              ].join("\n"),
              "Ajuda da verificação de saúde",
            );
          }
        }
      }

      if (!ranSection) {
        if (didSetGatewayMode) {
          await persistConfig();
          outro("Modo gateway definido como local.");
          return;
        }
        outro("Nenhuma alteração selecionada.");
        return;
      }
    }

    const controlUiAssets = await ensureControlUiAssetsBuilt(runtime);
    if (!controlUiAssets.ok && controlUiAssets.message) {
      runtime.error(controlUiAssets.message);
    }

    const bind = nextConfig.gateway?.bind ?? "loopback";
    const links = resolveControlUiLinks({
      bind,
      port: gatewayPort,
      customBindHost: nextConfig.gateway?.customBindHost,
      basePath: nextConfig.gateway?.controlUi?.basePath,
    });
    // Try both new and old passwords since gateway may still have old config.
    const newPassword = nextConfig.gateway?.auth?.password ?? process.env.ZERO_GATEWAY_PASSWORD;
    const oldPassword = baseConfig.gateway?.auth?.password ?? process.env.ZERO_GATEWAY_PASSWORD;
    const token = nextConfig.gateway?.auth?.token ?? process.env.ZERO_GATEWAY_TOKEN;

    let gatewayProbe = await probeGatewayReachable({
      url: links.wsUrl,
      token,
      password: newPassword,
    });
    // If new password failed and it's different from old password, try old too.
    if (!gatewayProbe.ok && newPassword !== oldPassword && oldPassword) {
      gatewayProbe = await probeGatewayReachable({
        url: links.wsUrl,
        token,
        password: oldPassword,
      });
    }
    const gatewayStatusLine = gatewayProbe.ok
      ? "Gateway: acessível"
      : `Gateway: não detectado${gatewayProbe.detail ? ` (${gatewayProbe.detail})` : ""}`;

    note(
      [
        `Interface Web: ${links.httpUrl}`,
        `Gateway WS: ${links.wsUrl}`,
        gatewayStatusLine,
        "Documentação: https://docs.zero.local/web/control-ui",
      ].join("\n"),
      "Interface de Controle (Control UI)",
    );

    outro("Configuração concluída.");
  } catch (err) {
    if (err instanceof WizardCancelledError) {
      runtime.exit(0);
      return;
    }
    throw err;
  }
}
