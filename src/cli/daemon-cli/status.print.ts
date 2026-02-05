import { resolveControlUiLinks } from "../../commands/onboard-helpers.js";
import {
  resolveGatewayLaunchAgentLabel,
  resolveGatewaySystemdServiceName,
} from "../../daemon/constants.js";
import { renderGatewayServiceCleanupHints } from "../../daemon/inspect.js";
import { resolveGatewayLogPaths } from "../../daemon/launchd.js";
import {
  isSystemdUnavailableDetail,
  renderSystemdUnavailableHints,
} from "../../daemon/systemd-hints.js";
import { isWSLEnv } from "../../infra/wsl.js";
import { getResolvedLoggerSettings } from "../../logging.js";
import { defaultRuntime } from "../../runtime.js";
import { colorize, isRich, theme } from "../../terminal/theme.js";
import { shortenHomePath } from "../../utils.js";
import { formatCliCommand } from "../command-format.js";
import {
  filterDaemonEnv,
  formatRuntimeStatus,
  renderRuntimeHints,
  safeDaemonEnv,
} from "./shared.js";
import {
  type DaemonStatus,
  renderPortDiagnosticsForCli,
  resolvePortListeningAddresses,
} from "./status.gather.js";

function sanitizeDaemonStatusForJson(status: DaemonStatus): DaemonStatus {
  const command = status.service.command;
  if (!command?.environment) return status;
  const safeEnv = filterDaemonEnv(command.environment);
  const nextCommand = {
    ...command,
    environment: Object.keys(safeEnv).length > 0 ? safeEnv : undefined,
  };
  return {
    ...status,
    service: {
      ...status.service,
      command: nextCommand,
    },
  };
}

export function printDaemonStatus(status: DaemonStatus, opts: { json: boolean }) {
  if (opts.json) {
    const sanitized = sanitizeDaemonStatusForJson(status);
    defaultRuntime.log(JSON.stringify(sanitized, null, 2));
    return;
  }

  const rich = isRich();
  const label = (value: string) => colorize(rich, theme.muted, value);
  const accent = (value: string) => colorize(rich, theme.accent, value);
  const infoText = (value: string) => colorize(rich, theme.info, value);
  const okText = (value: string) => colorize(rich, theme.success, value);
  const warnText = (value: string) => colorize(rich, theme.warn, value);
  const errorText = (value: string) => colorize(rich, theme.error, value);
  const spacer = () => defaultRuntime.log("");

  const { service, rpc, legacyServices, extraServices } = status;
  const serviceStatus = service.loaded
    ? okText(service.loadedText)
    : warnText(service.notLoadedText);
  defaultRuntime.log(`${label("Serviço:")} ${accent(service.label)} (${serviceStatus})`);
  try {
    const logFile = getResolvedLoggerSettings().file;
    defaultRuntime.log(`${label("Logs em arquivo:")} ${infoText(shortenHomePath(logFile))}`);
  } catch {
    // ignore missing config/log resolution
  }
  if (service.command?.programArguments?.length) {
    defaultRuntime.log(
      `${label("Comando:")} ${infoText(service.command.programArguments.join(" "))}`,
    );
  }
  if (service.command?.sourcePath) {
    defaultRuntime.log(
      `${label("Arquivo de serviço:")} ${infoText(shortenHomePath(service.command.sourcePath))}`,
    );
  }
  if (service.command?.workingDirectory) {
    defaultRuntime.log(
      `${label("Dir. de trabalho:")} ${infoText(shortenHomePath(service.command.workingDirectory))}`,
    );
  }
  const daemonEnvLines = safeDaemonEnv(service.command?.environment);
  if (daemonEnvLines.length > 0) {
    defaultRuntime.log(`${label("Ambiente do serviço:")} ${daemonEnvLines.join(" ")}`);
  }
  spacer();

  if (service.configAudit?.issues.length) {
    defaultRuntime.error(warnText("A configuração do serviço parece desatualizada ou não padrão."));
    for (const issue of service.configAudit.issues) {
      const detail = issue.detail ? ` (${issue.detail})` : "";
      defaultRuntime.error(
        `${warnText("Problema na config do serviço:")} ${issue.message}${detail}`,
      );
    }
    defaultRuntime.error(
      warnText(
        `Recomendação: execute "${formatCliCommand("zero doctor")}" (ou "${formatCliCommand("zero doctor --repair")}").`,
      ),
    );
  }

  if (status.config) {
    const cliCfg = `${shortenHomePath(status.config.cli.path)}${status.config.cli.exists ? "" : " (ausente)"}${status.config.cli.valid ? "" : " (inválida)"}`;
    defaultRuntime.log(`${label("Config (cli):")} ${infoText(cliCfg)}`);
    if (!status.config.cli.valid && status.config.cli.issues?.length) {
      for (const issue of status.config.cli.issues.slice(0, 5)) {
        defaultRuntime.error(
          `${errorText("Problema na config:")} ${issue.path || "<root>"}: ${issue.message}`,
        );
      }
    }
    if (status.config.daemon) {
      const daemonCfg = `${shortenHomePath(status.config.daemon.path)}${status.config.daemon.exists ? "" : " (ausente)"}${status.config.daemon.valid ? "" : " (inválida)"}`;
      defaultRuntime.log(`${label("Config (serviço):")} ${infoText(daemonCfg)}`);
      if (!status.config.daemon.valid && status.config.daemon.issues?.length) {
        for (const issue of status.config.daemon.issues.slice(0, 5)) {
          defaultRuntime.error(
            `${errorText("Problema na config do serviço:")} ${issue.path || "<root>"}: ${issue.message}`,
          );
        }
      }
    }
    if (status.config.mismatch) {
      defaultRuntime.error(
        errorText(
          "Causa raiz: CLI e serviço estão usando caminhos de config diferentes (provável incompatibilidade de perfil/dir de estado).",
        ),
      );
      defaultRuntime.error(
        errorText(
          `Correção: execute novamente \`${formatCliCommand("zero gateway install --force")}\` a partir do mesmo --profile / ZERO_STATE_DIR que você espera.`,
        ),
      );
    }
    spacer();
  }

  if (status.gateway) {
    const bindHost = status.gateway.bindHost ?? "n/a";
    defaultRuntime.log(
      `${label("Gateway:")} bind=${infoText(status.gateway.bindMode)} (${infoText(bindHost)}), port=${infoText(String(status.gateway.port))} (${infoText(status.gateway.portSource)})`,
    );
    defaultRuntime.log(`${label("Probe target:")} ${infoText(status.gateway.probeUrl)}`);
    const controlUiEnabled = status.config?.daemon?.controlUi?.enabled ?? true;
    if (!controlUiEnabled) {
      defaultRuntime.log(`${label("Dashboard:")} ${warnText("desativado")}`);
    } else {
      const links = resolveControlUiLinks({
        port: status.gateway.port,
        bind: status.gateway.bindMode,
        customBindHost: status.gateway.customBindHost,
        basePath: status.config?.daemon?.controlUi?.basePath,
      });
      defaultRuntime.log(`${label("Dashboard:")} ${infoText(links.httpUrl)}`);
    }
    if (status.gateway.probeNote) {
      defaultRuntime.log(`${label("Nota da sonda:")} ${infoText(status.gateway.probeNote)}`);
    }
    spacer();
  }

  const runtimeLine = formatRuntimeStatus(service.runtime);
  if (runtimeLine) {
    const runtimeStatus = service.runtime?.status ?? "desconhecido";
    const runtimeColor =
      runtimeStatus === "running"
        ? theme.success
        : runtimeStatus === "stopped"
          ? theme.error
          : runtimeStatus === "desconhecido"
            ? theme.muted
            : theme.warn;
    defaultRuntime.log(`${label("Runtime:")} ${colorize(rich, runtimeColor, runtimeLine)}`);
  }

  if (rpc && !rpc.ok && service.loaded && service.runtime?.status === "running") {
    defaultRuntime.log(
      warnText(
        "Aquecimento: agentes de inicialização podem levar alguns segundos. Tente novamente em breve.",
      ),
    );
  }
  if (rpc) {
    if (rpc.ok) {
      defaultRuntime.log(`${label("Sonda RPC:")} ${okText("ok")}`);
    } else {
      defaultRuntime.error(`${label("Sonda RPC:")} ${errorText("falhou")}`);
      if (rpc.url) defaultRuntime.error(`${label("Alvo RPC:")} ${rpc.url}`);
      const lines = String(rpc.error ?? "desconhecido")
        .split(/\r?\n/)
        .filter(Boolean);
      for (const line of lines.slice(0, 12)) {
        defaultRuntime.error(`  ${errorText(line)}`);
      }
    }
    spacer();
  }

  const systemdUnavailable =
    process.platform === "linux" && isSystemdUnavailableDetail(service.runtime?.detail);
  if (systemdUnavailable) {
    defaultRuntime.error(errorText("serviços de usuário systemd indisponíveis."));
    for (const hint of renderSystemdUnavailableHints({ wsl: isWSLEnv() })) {
      defaultRuntime.error(errorText(hint));
    }
    spacer();
  }

  if (service.runtime?.missingUnit) {
    defaultRuntime.error(errorText("Unidade de serviço não encontrada."));
    for (const hint of renderRuntimeHints(service.runtime)) {
      defaultRuntime.error(errorText(hint));
    }
  } else if (service.loaded && service.runtime?.status === "stopped") {
    defaultRuntime.error(
      errorText(
        "O serviço está carregado, mas não está em execução (provavelmente encerrou imediatamente).",
      ),
    );
    for (const hint of renderRuntimeHints(
      service.runtime,
      (service.command?.environment ?? process.env) as NodeJS.ProcessEnv,
    )) {
      defaultRuntime.error(errorText(hint));
    }
    spacer();
  }

  if (service.runtime?.cachedLabel) {
    const env = (service.command?.environment ?? process.env) as NodeJS.ProcessEnv;
    const labelValue = resolveGatewayLaunchAgentLabel(env.ZERO_PROFILE);
    defaultRuntime.error(
      errorText(
        `Label do LaunchAgent cacheado, mas plist ausente. Limpe com: launchctl bootout gui/$UID/${labelValue}`,
      ),
    );
    defaultRuntime.error(errorText(`Então reinstale: ${formatCliCommand("zero gateway install")}`));
    spacer();
  }

  for (const line of renderPortDiagnosticsForCli(status, rpc?.ok)) {
    defaultRuntime.error(errorText(line));
  }

  if (status.port) {
    const addrs = resolvePortListeningAddresses(status);
    if (addrs.length > 0) {
      defaultRuntime.log(`${label("Escutando em:")} ${infoText(addrs.join(", "))}`);
    }
  }

  if (status.portCli && status.portCli.port !== status.port?.port) {
    defaultRuntime.log(
      `${label("Nota:")} A config do CLI resolve a porta do gateway=${status.portCli.port} (${status.portCli.status}).`,
    );
  }

  if (
    service.loaded &&
    service.runtime?.status === "running" &&
    status.port &&
    status.port.status !== "busy"
  ) {
    defaultRuntime.error(
      errorText(
        `A porta do Gateway ${status.port.port} não está escutando (o serviço parece em execução).`,
      ),
    );
    if (status.lastError) {
      defaultRuntime.error(`${errorText("Último erro do gateway:")} ${status.lastError}`);
    }
    if (process.platform === "linux") {
      const env = (service.command?.environment ?? process.env) as NodeJS.ProcessEnv;
      const unit = resolveGatewaySystemdServiceName(env.ZERO_PROFILE);
      defaultRuntime.error(
        errorText(`Logs: journalctl --user -u ${unit}.service -n 200 --no-pager`),
      );
    } else if (process.platform === "darwin") {
      const logs = resolveGatewayLogPaths(
        (service.command?.environment ?? process.env) as NodeJS.ProcessEnv,
      );
      defaultRuntime.error(`${errorText("Logs:")} ${shortenHomePath(logs.stdoutPath)}`);
      defaultRuntime.error(`${errorText("Errors:")} ${shortenHomePath(logs.stderrPath)}`);
    }
    spacer();
  }

  if (legacyServices.length > 0) {
    defaultRuntime.error(errorText("Serviços de gateway legados detectados:"));
    for (const svc of legacyServices) {
      defaultRuntime.error(`- ${errorText(svc.label)} (${svc.detail})`);
    }
    defaultRuntime.error(errorText(`Limpeza: ${formatCliCommand("zero doctor")}`));
    spacer();
  }

  if (extraServices.length > 0) {
    defaultRuntime.error(
      errorText("Outros serviços parecidos com gateway detectados (melhor esforço):"),
    );
    for (const svc of extraServices) {
      defaultRuntime.error(`- ${errorText(svc.label)} (${svc.scope}, ${svc.detail})`);
    }
    for (const hint of renderGatewayServiceCleanupHints()) {
      defaultRuntime.error(`${errorText("Dica de limpeza:")} ${hint}`);
    }
    spacer();
  }

  if (legacyServices.length > 0 || extraServices.length > 0) {
    defaultRuntime.error(
      errorText(
        "Recomendação: execute um único gateway por máquina para a maioria das configurações. Um gateway suporta múltiplos agentes (veja docs: /gateway#multiple-gateways-same-host).",
      ),
    );
    defaultRuntime.error(
      errorText(
        "Se você precisar de múltiplos gateways (ex: um bot de resgate no mesmo host), isole as portas + config/estado (veja docs: /gateway#multiple-gateways-same-host).",
      ),
    );
    spacer();
  }

  defaultRuntime.log(`${label("Problemas?")} execute ${formatCliCommand("zero status")}`);
  defaultRuntime.log(`${label("Solução de problemas:")} https://docs.zero.local/troubleshooting`);
}
