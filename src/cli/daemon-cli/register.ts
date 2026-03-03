import type { Command } from "commander";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { createDefaultDeps } from "../deps.js";
import {
  runDaemonInstall,
  runDaemonRestart,
  runDaemonStart,
  runDaemonStatus,
  runDaemonStop,
  runDaemonUninstall,
} from "./runners.js";

export function registerDaemonCli(program: Command) {
  const daemon = program
    .command("daemon")
    .description("Gerenciar o serviço Gateway (launchd/systemd/schtasks)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/gateway", "docs.zero.local/cli/gateway")}\n`,
    );

  daemon
    .command("status")
    .description("Mostrar status de instalação do serviço + sondar o Gateway")
    .option("--url <url>", "URL WebSocket do Gateway (padrão: config/remote/local)")
    .option("--token <token>", "Token do Gateway (se necessário)")
    .option("--password <password>", "Senha do Gateway (autenticação por senha)")
    .option("--timeout <ms>", "Tempo limite em ms", "10000")
    .option("--no-probe", "Pular sonda RPC")
    .option("--deep", "Escanear serviços em nível de sistema", false)
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runDaemonStatus({
        rpc: opts,
        probe: Boolean(opts.probe),
        deep: Boolean(opts.deep),
        json: Boolean(opts.json),
      });
    });

  daemon
    .command("install")
    .description("Instalar o serviço Gateway (launchd/systemd/schtasks)")
    .option("--port <port>", "Porta do Gateway")
    .option("--runtime <runtime>", "Runtime do daemon (node|bun). Padrão: node")
    .option("--token <token>", "Token do Gateway (autenticação por token)")
    .option("--force", "Reinstalar/sobrescrever se já instalado", false)
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runDaemonInstall(opts);
    });

  daemon
    .command("uninstall")
    .description("Desinstalar o serviço Gateway (launchd/systemd/schtasks)")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runDaemonUninstall(opts);
    });

  daemon
    .command("start")
    .description("Iniciar o serviço Gateway (launchd/systemd/schtasks)")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runDaemonStart(opts);
    });

  daemon
    .command("stop")
    .description("Parar o serviço Gateway (launchd/systemd/schtasks)")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runDaemonStop(opts);
    });

  daemon
    .command("restart")
    .description("Reiniciar o serviço Gateway (launchd/systemd/schtasks)")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runDaemonRestart(opts);
    });

  // Build default deps (parity with other commands).
  void createDefaultDeps();
}
