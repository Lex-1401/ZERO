import type { Command } from "commander";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { loadNodeHostConfig } from "../../node-host/config.js";
import { runNodeHost } from "../../node-host/runner.js";
import {
  runNodeDaemonInstall,
  runNodeDaemonRestart,
  runNodeDaemonStatus,
  runNodeDaemonStop,
  runNodeDaemonUninstall,
} from "./daemon.js";
import { parsePort } from "../daemon-cli/shared.js";

function parsePortWithFallback(value: unknown, fallback: number): number {
  const parsed = parsePort(value);
  return parsed ?? fallback;
}

export function registerNodeCli(program: Command) {
  const node = program
    .command("node")
    .description("Executar um host de nó headless (system.run/system.which)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/node", "docs.zero.local/cli/node")}\n`,
    );

  node
    .command("run")
    .description("Executar o host de nó headless (primeiro plano)")
    .option("--host <host>", "Host do gateway")
    .option("--port <port>", "Porta do gateway")
    .option("--tls", "Usar TLS para a conexão com o gateway", false)
    .option(
      "--tls-fingerprint <sha256>",
      "Digital (fingerprint) do certificado TLS esperada (sha256)",
    )
    .option("--node-id <id>", "Sobrescrever ID do nó (limpa o token de pareamento)")
    .option("--display-name <name>", "Sobrescrever nome de exibição do nó")
    .action(async (opts) => {
      const existing = await loadNodeHostConfig();
      const host =
        (opts.host as string | undefined)?.trim() || existing?.gateway?.host || "127.0.0.1";
      const port = parsePortWithFallback(opts.port, existing?.gateway?.port ?? 18789);
      await runNodeHost({
        gatewayHost: host,
        gatewayPort: port,
        gatewayTls: Boolean(opts.tls) || Boolean(opts.tlsFingerprint),
        gatewayTlsFingerprint: opts.tlsFingerprint,
        nodeId: opts.nodeId,
        displayName: opts.displayName,
      });
    });

  node
    .command("status")
    .description("Mostrar status do host de nó")
    .option("--json", "Output JSON", false)
    .action(async (opts) => {
      await runNodeDaemonStatus(opts);
    });

  node
    .command("install")
    .description("Instalar o serviço de host de nó (launchd/systemd/schtasks)")
    .option("--host <host>", "Host do gateway")
    .option("--port <port>", "Porta do gateway")
    .option("--tls", "Usar TLS para a conexão com o gateway", false)
    .option(
      "--tls-fingerprint <sha256>",
      "Digital (fingerprint) do certificado TLS esperada (sha256)",
    )
    .option("--node-id <id>", "Sobrescrever ID do nó (limpa o token de pareamento)")
    .option("--display-name <name>", "Sobrescrever nome de exibição do nó")
    .option("--runtime <runtime>", "Runtime do serviço (node|bun). Padrão: node")
    .option("--force", "Reinstalar/sobrescrever se já estiver instalado", false)
    .option("--json", "Output JSON", false)
    .action(async (opts) => {
      await runNodeDaemonInstall(opts);
    });

  node
    .command("uninstall")
    .description("Desinstalar o serviço de host de nó (launchd/systemd/schtasks)")
    .option("--json", "Output JSON", false)
    .action(async (opts) => {
      await runNodeDaemonUninstall(opts);
    });

  node
    .command("stop")
    .description("Parar o serviço de host de nó (launchd/systemd/schtasks)")
    .option("--json", "Output JSON", false)
    .action(async (opts) => {
      await runNodeDaemonStop(opts);
    });

  node
    .command("restart")
    .description("Reiniciar o serviço de host de nó (launchd/systemd/schtasks)")
    .option("--json", "Output JSON", false)
    .action(async (opts) => {
      await runNodeDaemonRestart(opts);
    });
}
