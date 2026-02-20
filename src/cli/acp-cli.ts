import type { Command } from "commander";

import { runAcpClientInteractive } from "../acp/client.js";
import { serveAcpGateway } from "../acp/server.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";

export function registerAcpCli(program: Command) {
  const acp = program.command("acp").description("Executar uma ponte ACP apoiada pelo Gateway");

  acp
    .option(
      "--url <url>",
      "URL WebSocket do Gateway (padrão: gateway.remote.url quando configurado)",
    )
    .option("--token <token>", "Token do Gateway (se necessário)")
    .option("--password <password>", "Senha do Gateway (se necessário)")
    .option("--session <key>", "Chave de sessão padrão (ex: agent:main:main)")
    .option("--session-label <label>", "Label da sessão padrão para resolver")
    .option("--require-existing", "Falhar se a chave/label da sessão não existir", false)
    .option("--reset-session", "Resetar a chave da sessão antes do primeiro uso", false)
    .option("--no-prefix-cwd", "Não prefixar prompts com o diretório de trabalho", false)
    .option("--verbose, -v", "Logs detalhados para stderr", false)
    .addHelpText(
      "after",
      () => `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/acp", "docs.zero.local/cli/acp")}\n`,
    )
    .action((opts) => {
      try {
        serveAcpGateway({
          gatewayUrl: opts.url as string | undefined,
          gatewayToken: opts.token as string | undefined,
          gatewayPassword: opts.password as string | undefined,
          defaultSessionKey: opts.session as string | undefined,
          defaultSessionLabel: opts.sessionLabel as string | undefined,
          requireExistingSession: Boolean(opts.requireExisting),
          resetSession: Boolean(opts.resetSession),
          prefixCwd: !opts.noPrefixCwd,
          verbose: Boolean(opts.verbose),
        });
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });

  acp
    .command("client")
    .description("Executar um cliente ACP interativo contra a ponte ACP local")
    .option("--cwd <dir>", "Diretório de trabalho para a sessão ACP")
    .option("--server <command>", "Comando do servidor ACP (padrão: zero)")
    .option("--server-args <args...>", "Argumentos extras para o servidor ACP")
    .option("--server-verbose", "Habilitar logs detalhados no servidor ACP", false)
    .option("--verbose, -v", "Logs detalhados do cliente", false)
    .action(async (opts) => {
      try {
        await runAcpClientInteractive({
          cwd: opts.cwd as string | undefined,
          serverCommand: opts.server as string | undefined,
          serverArgs: opts.serverArgs as string[] | undefined,
          serverVerbose: Boolean(opts.serverVerbose),
          verbose: Boolean(opts.verbose),
        });
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });
}
