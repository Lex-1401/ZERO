import type { Command } from "commander";
import { dashboardCommand } from "../../commands/dashboard.js";
import { doctorCommand } from "../../commands/doctor.js";
import { resetCommand } from "../../commands/reset.js";
import { uninstallCommand } from "../../commands/uninstall.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { runCommandWithRuntime } from "../cli-utils.js";

export function registerMaintenanceCommands(program: Command) {
  program
    .command("doctor")
    .description("Verificações de saúde + correções rápidas para gateway e canais")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/doctor", "docs.zero.local/cli/doctor")}\n`,
    )
    .option(
      "--no-workspace-suggestions",
      "Desabilitar sugestões de sistema de memória do workspace",
      false,
    )
    .option("--yes", "Aceitar padrões sem prompts", false)
    .option("--repair", "Aplicar reparos recomendados sem prompts", false)
    .option("--fix", "Aplicar reparos recomendados (alias para --repair)", false)
    .option(
      "--force",
      "Aplicar reparos agressivos (sobrescreve config de serviço customizada)",
      false,
    )
    .option("--non-interactive", "Rodar sem prompts (apenas migrações seguras)", false)
    .option("--generate-gateway-token", "Gerar e configurar um token de gateway", false)
    .option("--deep", "Scanear serviços do sistema por instalações extras do gateway", false)
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await doctorCommand(defaultRuntime, {
          workspaceSuggestions: opts.workspaceSuggestions,
          yes: Boolean(opts.yes),
          repair: Boolean(opts.repair) || Boolean(opts.fix),
          force: Boolean(opts.force),
          nonInteractive: Boolean(opts.nonInteractive),
          generateGatewayToken: Boolean(opts.generateGatewayToken),
          deep: Boolean(opts.deep),
        });
      });
    });

  program
    .command("dashboard")
    .description("Abrir a UI de Controle com seu token atual")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/dashboard", "docs.zero.local/cli/dashboard")}\n`,
    )
    .option("--no-open", "Imprimir URL mas não iniciar navegador", false)
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await dashboardCommand(defaultRuntime, {
          noOpen: Boolean(opts.noOpen),
        });
      });
    });

  program
    .command("reset")
    .description("Resetar config/estado local (mantém o CLI instalado)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/reset", "docs.zero.local/cli/reset")}\n`,
    )
    .option("--scope <scope>", "config|config+creds+sessions|full (padrão: prompt interativo)")
    .option("--yes", "Pular prompts de confirmação", false)
    .option("--non-interactive", "Desabilitar prompts (requer --scope + --yes)", false)
    .option("--dry-run", "Imprimir ações sem remover arquivos", false)
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await resetCommand(defaultRuntime, {
          scope: opts.scope,
          yes: Boolean(opts.yes),
          nonInteractive: Boolean(opts.nonInteractive),
          dryRun: Boolean(opts.dryRun),
        });
      });
    });

  program
    .command("uninstall")
    .description("Desinstalar o serviço gateway + dados locais (CLI permanece)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/uninstall", "docs.zero.local/cli/uninstall")}\n`,
    )
    .option("--service", "Remover o serviço gateway", false)
    .option("--state", "Remover estado + config", false)
    .option("--workspace", "Remover diretórios de workspace", false)
    .option("--app", "Remover o app macOS", false)
    .option("--all", "Remover serviço + estado + workspace + app", false)
    .option("--yes", "Pular prompts de confirmação", false)
    .option("--non-interactive", "Desabilitar prompts (requer --yes)", false)
    .option("--dry-run", "Imprimir ações sem remover arquivos", false)
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await uninstallCommand(defaultRuntime, {
          service: Boolean(opts.service),
          state: Boolean(opts.state),
          workspace: Boolean(opts.workspace),
          app: Boolean(opts.app),
          all: Boolean(opts.all),
          yes: Boolean(opts.yes),
          nonInteractive: Boolean(opts.nonInteractive),
          dryRun: Boolean(opts.dryRun),
        });
      });
    });
}
