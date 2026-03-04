import { buildGatewayInstallPlan, gatewayInstallErrorHint } from "./daemon-install-helpers.js";
import { resolveGatewayService } from "../daemon/service.js";
import { withProgress } from "../cli/progress.js";
import type { RuntimeEnv } from "../runtime.js";
import { note } from "../terminal/note.js";
import { confirm, select } from "./configure.shared.js";
import {
  DEFAULT_GATEWAY_DAEMON_RUNTIME,
  GATEWAY_DAEMON_RUNTIME_OPTIONS,
  type GatewayDaemonRuntime,
} from "./daemon-runtime.js";
import { guardCancel } from "./onboard-helpers.js";
import { ensureSystemdUserLingerInteractive } from "./systemd-linger.js";
import { loadConfig } from "../config/config.js";

export async function maybeInstallDaemon(params: {
  runtime: RuntimeEnv;
  port: number;
  gatewayToken?: string;
  daemonRuntime?: GatewayDaemonRuntime;
}) {
  const service = resolveGatewayService();
  const loaded = await service.isLoaded({ env: process.env });
  let shouldCheckLinger = false;
  let shouldInstall = true;
  let daemonRuntime = params.daemonRuntime ?? DEFAULT_GATEWAY_DAEMON_RUNTIME;
  if (loaded) {
    const action = guardCancel(
      await select({
        message: "O serviço do gateway já está instalado",
        options: [
          { value: "restart", label: "Reiniciar" },
          { value: "reinstall", label: "Reinstalar" },
          { value: "skip", label: "Pular" },
        ],
      }),
      params.runtime,
    );
    if (action === "restart") {
      await withProgress(
        { label: "Serviço do gateway", indeterminate: true, delayMs: 0 },
        async (progress) => {
          progress.setLabel("Reiniciando o serviço do gateway…");
          await service.restart({
            env: process.env,
            stdout: process.stdout,
          });
          progress.setLabel("Serviço do gateway reiniciado.");
        },
      );
      shouldCheckLinger = true;
      shouldInstall = false;
    }
    if (action === "skip") return;
    if (action === "reinstall") {
      await withProgress(
        { label: "Serviço do gateway", indeterminate: true, delayMs: 0 },
        async (progress) => {
          progress.setLabel("Desinstalando o serviço do gateway…");
          await service.uninstall({ env: process.env, stdout: process.stdout });
          progress.setLabel("Serviço do gateway desinstalado.");
        },
      );
    }
  }

  if (shouldInstall) {
    let installError: string | null = null;
    await withProgress(
      { label: "Gateway service", indeterminate: true, delayMs: 0 },
      async (progress) => {
        if (!params.daemonRuntime) {
          daemonRuntime = guardCancel(
            await select({
              message: "Runtime do serviço do gateway",
              options: GATEWAY_DAEMON_RUNTIME_OPTIONS,
              initialValue: DEFAULT_GATEWAY_DAEMON_RUNTIME,
            }),
            params.runtime,
          ) as GatewayDaemonRuntime;
        }

        progress.setLabel("Preparando o serviço do gateway…");

        const cfg = loadConfig();
        const { programArguments, workingDirectory, environment } = await buildGatewayInstallPlan({
          env: process.env,
          port: params.port,
          token: params.gatewayToken,
          runtime: daemonRuntime,
          warn: (message, title) => note(message, title),
          config: cfg,
        });

        progress.setLabel("Instalando o serviço do gateway…");
        try {
          await service.install({
            env: process.env,
            stdout: process.stdout,
            programArguments,
            workingDirectory,
            environment,
          });
          progress.setLabel("Serviço do gateway instalado.");
        } catch (err) {
          installError = err instanceof Error ? err.message : String(err);
          progress.setLabel("A instalação do serviço do gateway falhou.");
        }
      },
    );
    if (installError) {
      note("A instalação do serviço do gateway falhou: " + installError, "Gateway");
      note(gatewayInstallErrorHint(), "Gateway");
      return;
    }
    shouldCheckLinger = true;
  }

  if (shouldCheckLinger) {
    await ensureSystemdUserLingerInteractive({
      runtime: params.runtime,
      prompter: {
        confirm: async (p) => guardCancel(await confirm(p), params.runtime) === true,
        note,
      },
      reason:
        "Instalações Linux usam um serviço de usuário do systemd. Sem o lingering, o systemd encerra a sessão do usuário ao fazer logout/ociosidade e encerra o gateway.",
      requireConfirm: true,
    });
  }
}
