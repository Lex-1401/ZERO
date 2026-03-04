import type { Command } from "commander";
import { theme } from "../terminal/theme.js";
import { formatDocsLink } from "../terminal/links.js";
import {
  listPlugins,
  infoPlugin,
  enablePlugin,
  disablePlugin,
  installPlugin,
  updatePlugins,
  doctorPlugins,
} from "./plugins/commands.js";

export function registerPluginsCli(program: Command) {
  const plugins = program
    .command("plugins")
    .description("Gerenciar plugins/extensões do ZERO")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/plugins", "docs.zero.local/cli/plugins")}\n`,
    );

  plugins
    .command("list")
    .description("Listar plugins descobertos")
    .option("--json", "Imprimir JSON")
    .option("--enabled", "Mostrar apenas plugins ativados", false)
    .option("--verbose", "Mostrar entradas detalhadas", false)
    .action(listPlugins);

  plugins
    .command("info")
    .description("Mostrar detalhes do plugin")
    .argument("<id>", "ID do plugin")
    .option("--json", "Imprimir JSON")
    .action(infoPlugin);

  plugins
    .command("enable")
    .description("Ativar um plugin na configuração")
    .argument("<id>", "ID do plugin")
    .action(enablePlugin);

  plugins
    .command("disable")
    .description("Desativar um plugin na configuração")
    .argument("<id>", "ID do plugin")
    .action(disablePlugin);

  plugins
    .command("install")
    .description("Instalar um plugin (caminho, arquivo ou spec npm)")
    .argument("<path-or-spec>", "Caminho (.ts/.js/.zip/.tgz/.tar.gz) ou uma spec de pacote npm")
    .option("-l, --link", "Vincular um caminho local em vez de copiar", false)
    .action(installPlugin);

  plugins
    .command("update")
    .description("Atualizar plugins instalados (apenas instalações npm)")
    .argument("[id]", "ID do plugin (omitir com --all)")
    .option("--all", "Atualizar todos os plugins monitorados", false)
    .option("--dry-run", "Mostrar o que mudaria sem gravar", false)
    .action(updatePlugins);

  plugins
    .command("doctor")
    .description("Relatar problemas de carregamento de plugins")
    .action(doctorPlugins);
}

