import type { Command } from "commander";
import { healthCommand } from "../../commands/health.js";
import { sessionsCommand } from "../../commands/sessions.js";
import { statusCommand } from "../../commands/status.js";
import { setVerbose } from "../../globals.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { runCommandWithRuntime } from "../cli-utils.js";
import { formatHelpExamples } from "../help-format.js";
import { parsePositiveIntOrUndefined } from "./helpers.js";

function resolveVerbose(opts: { verbose?: boolean; debug?: boolean }): boolean {
  return Boolean(opts.verbose || opts.debug);
}

function parseTimeoutMs(timeout: unknown): number | null | undefined {
  const parsed = parsePositiveIntOrUndefined(timeout);
  if (timeout !== undefined && parsed === undefined) {
    defaultRuntime.error("--timeout deve ser um número inteiro positivo (milissegundos)");
    defaultRuntime.exit(1);
    return null;
  }
  return parsed;
}

export function registerStatusHealthSessionsCommands(program: Command) {
  program
    .command("status")
    .description("Mostrar saúde do canal e destinatários de sessão recentes")
    .option("--json", "Saída JSON em vez de texto", false)
    .option("--all", "Diagnóstico completo (somente leitura, colável)", false)
    .option("--usage", "Mostrar snapshots de uso/quota de provedor de modelo", false)
    .option("--deep", "Sondar canais (WhatsApp Web + Telegram + Discord + Slack + Signal)", false)
    .option("--timeout <ms>", "Timeout de sonda em milissegundos", "10000")
    .option("--verbose", "Logs verbosos", false)
    .option("--debug", "Alias para --verbose", false)
    .addHelpText(
      "after",
      () =>
        `\n${theme.heading("Exemplos:")}\n${formatHelpExamples([
          ["zero status", "Mostrar saúde do canal + resumo de sessão."],
          ["zero status --all", "Diagnóstico completo (somente leitura)."],
          ["zero status --json", "Saída legível por máquina."],
          ["zero status --usage", "Mostrar snapshots de uso/quota de provedor de modelo."],
          [
            "zero status --deep",
            "Executar sondas de canal (WA + Telegram + Discord + Slack + Signal).",
          ],
          ["zero status --deep --timeout 5000", "Apertar timeout de sonda."],
        ])}`,
    )
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/status", "docs.zero.local/cli/status")}\n`,
    )
    .action(async (opts) => {
      const verbose = resolveVerbose(opts);
      setVerbose(verbose);
      const timeout = parseTimeoutMs(opts.timeout);
      if (timeout === null) {
        return;
      }
      await runCommandWithRuntime(defaultRuntime, async () => {
        await statusCommand(
          {
            json: Boolean(opts.json),
            all: Boolean(opts.all),
            deep: Boolean(opts.deep),
            usage: Boolean(opts.usage),
            timeoutMs: timeout,
            verbose,
          },
          defaultRuntime,
        );
      });
    });

  program
    .command("health")
    .description("Buscar saúde do gateway em execução")
    .option("--json", "Saída JSON em vez de texto", false)
    .option("--timeout <ms>", "Timeout de conexão em milissegundos", "10000")
    .option("--verbose", "Logs verbosos", false)
    .option("--debug", "Alias para --verbose", false)
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/health", "docs.zero.local/cli/health")}\n`,
    )
    .action(async (opts) => {
      const verbose = resolveVerbose(opts);
      setVerbose(verbose);
      const timeout = parseTimeoutMs(opts.timeout);
      if (timeout === null) {
        return;
      }
      await runCommandWithRuntime(defaultRuntime, async () => {
        await healthCommand(
          {
            json: Boolean(opts.json),
            timeoutMs: timeout,
            verbose,
          },
          defaultRuntime,
        );
      });
    });

  program
    .command("sessions")
    .description("Listar sessões de conversa armazenadas")
    .option("--json", "Saída como JSON", false)
    .option("--verbose", "Logs verbosos", false)
    .option("--store <path>", "Caminho para store de sessão (padrão: resolvido da config)")
    .option("--active <minutes>", "Apenas mostrar sessões atualizadas nos últimos N minutos")
    .addHelpText(
      "after",
      () =>
        `\n${theme.heading("Exemplos:")}\n${formatHelpExamples([
          ["zero sessions", "Listar todas as sessões."],
          ["zero sessions --active 120", "Apenas últimas 2 horas."],
          ["zero sessions --json", "Saída legível por máquina."],
          ["zero sessions --store ./tmp/sessions.json", "Usar um store de sessão específico."],
        ])}\n\n${theme.muted(
          "Mostra uso de tokens por sessão quando o agente reporta; configure agents.defaults.contextTokens para ver % da janela do modelo.",
        )}`,
    )
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/sessions", "docs.zero.local/cli/sessions")}\n`,
    )
    .action(async (opts) => {
      setVerbose(Boolean(opts.verbose));
      await sessionsCommand(
        {
          json: Boolean(opts.json),
          store: opts.store as string | undefined,
          active: opts.active as string | undefined,
        },
        defaultRuntime,
      );
    });
}
