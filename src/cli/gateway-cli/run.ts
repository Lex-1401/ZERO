import fs from "node:fs";

import type { Command } from "commander";
import type { GatewayAuthMode } from "../../config/config.js";
import {
  CONFIG_PATH_ZERO,
  loadConfig,
  readConfigFileSnapshot,
  resolveGatewayPort,
} from "../../config/config.js";
import { resolveGatewayAuth } from "../../gateway/auth.js";
import { startGatewayServer } from "../../gateway/server.js";
import type { GatewayWsLogStyle } from "../../gateway/ws-logging.js";
import { setGatewayWsLogStyle } from "../../gateway/ws-logging.js";
import { setVerbose } from "../../globals.js";
import { GatewayLockError } from "../../infra/gateway-lock.js";
import { formatPortDiagnostics, inspectPortUsage } from "../../infra/ports.js";
import { setConsoleSubsystemFilter, setConsoleTimestampPrefix } from "../../logging/console.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";
import { defaultRuntime } from "../../runtime.js";
import { formatCliCommand } from "../command-format.js";
import { forceFreePortAndWait } from "../ports.js";
import { ensureDevGatewayConfig } from "./dev.js";
import { runGatewayLoop } from "./run-loop.js";
import {
  describeUnknownError,
  extractGatewayMiskeys,
  maybeExplainGatewayServiceStop,
  parsePort,
  toOptionString,
} from "./shared.js";

type GatewayRunOpts = {
  port?: unknown;
  bind?: unknown;
  token?: unknown;
  auth?: unknown;
  password?: unknown;
  tailscale?: unknown;
  tailscaleResetOnExit?: boolean;
  allowUnconfigured?: boolean;
  force?: boolean;
  verbose?: boolean;
  claudeCliLogs?: boolean;
  wsLog?: unknown;
  compact?: boolean;
  rawStream?: boolean;
  rawStreamPath?: unknown;
  dev?: boolean;
  reset?: boolean;
};

const gatewayLog = createSubsystemLogger("gateway");

async function runGatewayCommand(opts: GatewayRunOpts) {
  const isDevProfile = process.env.ZERO_PROFILE?.trim().toLowerCase() === "dev";
  const devMode = Boolean(opts.dev) || isDevProfile;
  if (opts.reset && !devMode) {
    defaultRuntime.error("Use --reset com --dev.");
    defaultRuntime.exit(1);
    return;
  }

  setConsoleTimestampPrefix(true);
  setVerbose(Boolean(opts.verbose));
  if (opts.claudeCliLogs) {
    setConsoleSubsystemFilter(["agent/claude-cli"]);
    process.env.ZERO_CLAUDE_CLI_LOG_OUTPUT = "1";
  }
  const wsLogRaw = (opts.compact ? "compact" : opts.wsLog) as string | undefined;
  const wsLogStyle: GatewayWsLogStyle =
    wsLogRaw === "compact" ? "compact" : wsLogRaw === "full" ? "full" : "auto";
  if (
    wsLogRaw !== undefined &&
    wsLogRaw !== "auto" &&
    wsLogRaw !== "compact" &&
    wsLogRaw !== "full"
  ) {
    defaultRuntime.error('Invalido --ws-log (use "auto", "full", "compact")');
    defaultRuntime.exit(1);
  }
  setGatewayWsLogStyle(wsLogStyle);

  if (opts.rawStream) {
    process.env.ZERO_RAW_STREAM = "1";
  }
  const rawStreamPath = toOptionString(opts.rawStreamPath);
  if (rawStreamPath) {
    process.env.ZERO_RAW_STREAM_PATH = rawStreamPath;
  }

  if (devMode) {
    await ensureDevGatewayConfig({ reset: Boolean(opts.reset) });
  }

  const cfg = loadConfig();
  const portOverride = parsePort(opts.port);
  if (opts.port !== undefined && portOverride === null) {
    defaultRuntime.error("Porta inválida");
    defaultRuntime.exit(1);
  }
  const port = portOverride ?? resolveGatewayPort(cfg);
  if (!Number.isFinite(port) || port <= 0) {
    defaultRuntime.error("Porta inválida");
    defaultRuntime.exit(1);
  }
  if (opts.force) {
    try {
      const { killed, waitedMs, escalatedToSigkill } = await forceFreePortAndWait(port, {
        timeoutMs: 2000,
        intervalMs: 100,
        sigtermTimeoutMs: 700,
      });
      if (killed.length === 0) {
        gatewayLog.info(`force: nenhum processo ouvindo na porta ${port}`);
      } else {
        for (const proc of killed) {
          gatewayLog.info(
            `force: encerrou pid ${proc.pid}${proc.command ? ` (${proc.command})` : ""} na porta ${port}`,
          );
        }
        if (escalatedToSigkill) {
          gatewayLog.info(`force: escalado para SIGKILL ao liberar a porta ${port}`);
        }
        if (waitedMs > 0) {
          gatewayLog.info(`force: esperou ${waitedMs}ms para liberar a porta ${port}`);
        }
      }
    } catch (err) {
      defaultRuntime.error(`Force: ${String(err)}`);
      defaultRuntime.exit(1);
      return;
    }
  }
  if (opts.token) {
    const token = toOptionString(opts.token);
    if (token) process.env.ZERO_GATEWAY_TOKEN = token;
  }
  const authModeRaw = toOptionString(opts.auth);
  const authMode: GatewayAuthMode | null =
    authModeRaw === "token" || authModeRaw === "password" ? authModeRaw : null;
  if (authModeRaw && !authMode) {
    defaultRuntime.error('Inválido --auth (use "token" ou "password")');
    defaultRuntime.exit(1);
    return;
  }
  const tailscaleRaw = toOptionString(opts.tailscale);
  const tailscaleMode =
    tailscaleRaw === "off" || tailscaleRaw === "serve" || tailscaleRaw === "funnel"
      ? tailscaleRaw
      : null;
  if (tailscaleRaw && !tailscaleMode) {
    defaultRuntime.error('Inválido --tailscale (use "off", "serve" ou "funnel")');
    defaultRuntime.exit(1);
    return;
  }
  const passwordRaw = toOptionString(opts.password);
  const tokenRaw = toOptionString(opts.token);

  const configExists = fs.existsSync(CONFIG_PATH_ZERO);
  const mode = cfg.gateway?.mode;
  if (!opts.allowUnconfigured && mode !== "local") {
    if (!configExists) {
      defaultRuntime.error(
        `Configuração ausente. Execute \`${formatCliCommand("zero setup")}\` ou defina gateway.mode=local (ou use --allow-unconfigured).`,
      );
    } else {
      defaultRuntime.error(
        `Início do Gateway bloqueado: defina gateway.mode=local (atual: ${mode ?? "não definido"}) ou use --allow-unconfigured.`,
      );
    }
    defaultRuntime.exit(1);
    return;
  }
  const bindRaw = toOptionString(opts.bind) ?? cfg.gateway?.bind ?? "loopback";
  const bind =
    bindRaw === "loopback" ||
    bindRaw === "lan" ||
    bindRaw === "auto" ||
    bindRaw === "custom" ||
    bindRaw === "tailnet"
      ? bindRaw
      : null;
  if (!bind) {
    defaultRuntime.error('Inválido --bind (use "loopback", "lan", "tailnet", "auto" ou "custom")');
    defaultRuntime.exit(1);
    return;
  }

  const snapshot = await readConfigFileSnapshot().catch(() => null);
  const miskeys = extractGatewayMiskeys(snapshot?.parsed);
  const authConfig = {
    ...cfg.gateway?.auth,
    ...(authMode ? { mode: authMode } : {}),
    ...(passwordRaw ? { password: passwordRaw } : {}),
    ...(tokenRaw ? { token: tokenRaw } : {}),
  };
  const resolvedAuth = resolveGatewayAuth({
    authConfig,
    env: process.env,
    tailscaleMode: tailscaleMode ?? cfg.gateway?.tailscale?.mode ?? "off",
  });
  const resolvedAuthMode = resolvedAuth.mode;
  const tokenValue = resolvedAuth.token;
  const passwordValue = resolvedAuth.password;

  const authHints: string[] = [];
  if (miskeys.hasGatewayToken) {
    authHints.push(
      'Encontrado "gateway.token" na configuração. Use "gateway.auth.token" em vez disso.',
    );
  }
  if (miskeys.hasRemoteToken) {
    authHints.push(
      '"gateway.remote.token" é para chamadas CLI remotas; não habilita a autenticação local do gateway.',
    );
  }
  if (resolvedAuthMode === "token" && !tokenValue) {
    defaultRuntime.error(
      [
        "A autenticação do Gateway está definida como token, mas nenhum token foi configurado.",
        "Defina gateway.auth.token (ou ZERO_GATEWAY_TOKEN), ou use --token.",
        ...authHints,
      ]
        .filter(Boolean)
        .join("\n"),
    );
    defaultRuntime.exit(1);
    return;
  }
  if (resolvedAuthMode === "password" && !passwordValue) {
    defaultRuntime.error(
      [
        "A autenticação do Gateway está definida como senha, mas nenhuma senha foi configurada.",
        "Defina gateway.auth.password (ou ZERO_GATEWAY_PASSWORD), ou use --password.",
        ...authHints,
      ]
        .filter(Boolean)
        .join("\n"),
    );
    defaultRuntime.exit(1);
    return;
  }
  if (bind !== "loopback" && resolvedAuthMode === "none") {
    defaultRuntime.error(
      [
        `Recusando vincular o gateway a ${bind} sem autenticação.`,
        "Defina gateway.auth.token (ou ZERO_GATEWAY_TOKEN) ou use --token.",
        ...authHints,
      ]
        .filter(Boolean)
        .join("\n"),
    );
    defaultRuntime.exit(1);
    return;
  }

  try {
    await runGatewayLoop({
      runtime: defaultRuntime,
      start: async () =>
        await startGatewayServer(port, {
          bind,
          auth:
            authMode || passwordRaw || tokenRaw || authModeRaw
              ? {
                  mode: authMode ?? undefined,
                  token: tokenRaw,
                  password: passwordRaw,
                }
              : undefined,
          tailscale:
            tailscaleMode || opts.tailscaleResetOnExit
              ? {
                  mode: tailscaleMode ?? undefined,
                  resetOnExit: Boolean(opts.tailscaleResetOnExit),
                }
              : undefined,
        }),
    });
  } catch (err) {
    if (
      err instanceof GatewayLockError ||
      (err && typeof err === "object" && (err as { name?: string }).name === "GatewayLockError")
    ) {
      const errMessage = describeUnknownError(err);
      defaultRuntime.error(
        `Falha ao iniciar o Gateway: ${errMessage}\nSe o gateway for supervisionado, pare-o com: ${formatCliCommand("zero gateway stop")}`,
      );
      try {
        const diagnostics = await inspectPortUsage(port);
        if (diagnostics.status === "busy") {
          for (const line of formatPortDiagnostics(diagnostics)) {
            defaultRuntime.error(line);
          }
        }
      } catch {
        // ignorar falhas de diagnóstico
      }
      await maybeExplainGatewayServiceStop();
      defaultRuntime.exit(1);
      return;
    }
    defaultRuntime.error(`Falha ao iniciar o Gateway: ${String(err)}`);
    defaultRuntime.exit(1);
  }
}

export function addGatewayRunCommand(cmd: Command): Command {
  return cmd
    .option("--port <port>", "Porta para o WebSocket do gateway")
    .option(
      "--bind <mode>",
      'Modo de bind ("loopback"|"lan"|"tailnet"|"auto"|"custom"). Padrão: config gateway.bind (ou loopback).',
    )
    .option(
      "--token <token>",
      "Token compartilhado obrigatório em connect.params.auth.token (padrão: env ZERO_GATEWAY_TOKEN se definido)",
    )
    .option("--auth <mode>", 'Modo de autenticação do Gateway ("token"|"password")')
    .option("--password <password>", "Senha para modo auth=password")
    .option("--tailscale <mode>", 'Modo de exposição Tailscale ("off"|"serve"|"funnel")')
    .option(
      "--tailscale-reset-on-exit",
      "Resetar configuração de serve/funnel do Tailscale ao encerrar",
      false,
    )
    .option(
      "--allow-unconfigured",
      "Permitir início do gateway sem gateway.mode=local na configuração",
      false,
    )
    .option("--dev", "Criar configuração + workspace de dev se ausente (sem BOOTSTRAP.md)", false)
    .option(
      "--reset",
      "Resetar configuração de dev + credenciais + sessões + workspace (requer --dev)",
      false,
    )
    .option("--force", "Encerrar qualquer listener existente na porta alvo antes de iniciar", false)
    .option("--verbose", "Logs detalhados para stdout/stderr", false)
    .option(
      "--claude-cli-logs",
      "Mostrar apenas logs do claude-cli no console (inclui stdout/stderr)",
      false,
    )
    .option("--ws-log <style>", 'Estilo de log WebSocket ("auto"|"full"|"compact")', "auto")
    .option("--compact", 'Alias para "--ws-log compact"', false)
    .option("--raw-stream", "Logar eventos raw de stream do modelo para jsonl", false)
    .option("--raw-stream-path <path>", "Caminho do jsonl de stream raw")
    .action(async (opts) => {
      await runGatewayCommand(opts);
    });
}
