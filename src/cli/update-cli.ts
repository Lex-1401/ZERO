
/**
 * @fileoverview CLI de atualização do ZERO (Sentinel Update System)
 * @module src/cli/update-cli
 */

import type { Command } from "commander";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { formatHelpExamples } from "./help-format.js";
import { updateCommand } from "./update/command-main.js";
import { updateWizardCommand } from "./update/wizard-cmd.js";
import { updateStatusCommand } from "./update/status.js";

/**
 * Registra os comandos de atualização no programa Commander principal.
 * @param {Command} program - Instância do programa Commander.
 */
export function registerUpdateCli(program: Command) {
  const update = program
    .command("update")
    .description("Atualizar o ZERO para a versão mais recente")
    .option("--json", "Saída em JSON", false)
    .option("--no-restart", "Pular o reinício do serviço gateway após uma atualização bem-sucedida")
    .option("--channel <stable|beta|dev>", "Persistir canal de atualização (git + npm)")
    .option(
      "--tag <dist-tag|version>",
      "Sobrescrever dist-tag do npm ou versão para esta atualização",
    )
    .option(
      "--timeout <seconds>",
      "Timeout para cada passo da atualização em segundos (padrão: 1200)",
    )
    .option("--yes", "Pular prompts de confirmação (não interativo)", false)
    .addHelpText("after", () => {
      const examples = [
        ["zero update", "Atualizar um checkout de fonte (git)"],
        ["zero update --channel beta", "Mudar para o canal beta (git + npm)"],
        ["zero update --channel dev", "Mudar para o canal dev (git + npm)"],
        ["zero update --tag beta", "Atualização pontual para uma dist-tag ou versão"],
        ["zero update --no-restart", "Atualizar sem reiniciar o serviço"],
        ["zero update --json", "Saída em JSON"],
        ["zero update --yes", "Não interativo (aceita prompts de downgrade)"],
        ["zero update wizard", "Assistente de atualização interativo"],
        ["zero --update", "Atalho para zero update"],
      ] as const;
      const fmtExamples = examples
        .map(([cmd, desc]) => `  ${theme.command(cmd)} ${theme.muted(`# ${desc}`)}`)
        .join("\n");
      return `
${theme.heading("O que isso faz:")}
  - Checkouts Git: busca, refaz base (rebase), instala dependências, compila e executa o doctor
  - Instalações npm: atualiza via gerenciador de pacotes detectado

${theme.heading("Mudar canais:")}
  - Use --channel stable|beta|dev para persistir o canal de atualização na configuração
  - Execute zero update status para ver o canal e fonte ativos
  - Use --tag <dist-tag|version> para uma atualização npm pontual sem persistir

${theme.heading("Não interativo:")}
  - Use --yes para aceitar prompts de downgrade
  - Combine com --channel/--tag/--restart/--json/--timeout conforme necessário

${theme.heading("Exemplos:")}
${fmtExamples}

${theme.heading("Notas:")}
  - Mude os canais com --channel stable|beta|dev
  - Para instalações globais: auto-atualiza via gerenciador de pacotes detectado quando possível (veja docs/install/updating.md)
  - Downgrades requerem confirmação (podem quebrar a configuração)
  - Pula a atualização se o diretório de trabalho tiver alterações não commitadas

${theme.muted("Docs:")} ${formatDocsLink("/cli/update", "docs.zero.local/cli/update")}`;
    })
    .action(async (opts) => {
      try {
        await updateCommand({
          json: Boolean(opts.json),
          restart: Boolean(opts.restart),
          channel: opts.channel as string | undefined,
          tag: opts.tag as string | undefined,
          timeout: opts.timeout as string | undefined,
          yes: Boolean(opts.yes),
        });
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });

  update
    .command("wizard")
    .description("Assistente de atualização interativo")
    .option(
      "--timeout <seconds>",
      "Timeout para cada passo da atualização em segundos (padrão: 1200)",
    )
    .addHelpText(
      "after",
      `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/update", "docs.zero.local/cli/update")}\n`,
    )
    .action(async (opts) => {
      try {
        await updateWizardCommand({ timeout: opts.timeout as string | undefined });
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });

  update
    .command("status")
    .description("Mostrar canal de atualização e status da versão")
    .option("--json", "Saída em JSON", false)
    .option(
      "--timeout <seconds>",
      "Timeout para verificações de atualização em segundos (padrão: 3)",
    )
    .addHelpText(
      "after",
      () =>
        `\n${theme.heading("Exemplos:")}\n${formatHelpExamples([
          ["zero update status", "Mostrar canal + status da versão."],
          ["zero update status --json", "Saída em JSON."],
          ["zero update status --timeout 10", "Timeout personalizado."],
        ])}\n\n${theme.heading("Notas:")}\n${theme.muted(
          "- Mostra o canal de atualização atual (stable/beta/dev) e fonte",
        )}\n${theme.muted("- Inclui tag/branch/SHA do git para checkouts de fonte")}\n\n${theme.muted(
          "Docs:",
        )} ${formatDocsLink("/cli/update", "docs.zero.local/cli/update")}`,
    )
    .action(async (opts) => {
      try {
        await updateStatusCommand({
          json: Boolean(opts.json),
          timeout: opts.timeout as string | undefined,
        });
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });
}
