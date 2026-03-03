import type { Command } from "commander";
import { onboardCommand } from "../../commands/onboard.js";
import { setupCommand } from "../../commands/setup.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { hasExplicitOptions } from "../command-options.js";
import { runCommandWithRuntime } from "../cli-utils.js";

export function registerSetupCommand(program: Command) {
  program
    .command("setup")
    .description("Inicializar ~/.zero/zero.json e o workspace do agente")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/setup", "docs.zero.local/cli/setup")}\n`,
    )
    .option(
      "--workspace <dir>",
      "Diretório de workspace do agente (padrão: ~/zero; armazenado como agents.defaults.workspace)",
    )
    .option("--wizard", "Executar o wizard de onboarding interativo", false)
    .option("--non-interactive", "Executar o wizard sem prompts", false)
    .option("--mode <mode>", "Modo wizard: local|remote")
    .option("--remote-url <url>", "URL WebSocket do Gateway Remoto")
    .option("--remote-token <token>", "Token do Gateway Remoto (opcional)")
    .option("--smart", "Executar scan inteligente do sistema para sugerir configurações", false)
    .action(async (opts, command) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        const hasWizardFlags = hasExplicitOptions(command, [
          "wizard",
          "nonInteractive",
          "mode",
          "remoteUrl",
          "remoteToken",
        ]);
        if (opts.wizard || hasWizardFlags) {
          await onboardCommand(
            {
              workspace: opts.workspace as string | undefined,
              nonInteractive: Boolean(opts.nonInteractive),
              mode: opts.mode as "local" | "remote" | undefined,
              remoteUrl: opts.remoteUrl as string | undefined,
              remoteToken: opts.remoteToken as string | undefined,
            },
            defaultRuntime,
          );
          return;
        }
        await setupCommand(
          {
            workspace: opts.workspace as string | undefined,
            smart: Boolean(opts.smart),
          },
          defaultRuntime,
        );
      });
    });
}
