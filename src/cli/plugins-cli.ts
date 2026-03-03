import fs from "node:fs";
import path from "node:path";
import type { Command } from "commander";

import { loadConfig, writeConfigFile } from "../config/config.js";
import type { ZEROConfig } from "../config/config.js";
import { resolveArchiveKind } from "../infra/archive.js";
import { installPluginFromNpmSpec, installPluginFromPath } from "../plugins/install.js";
import { recordPluginInstall } from "../plugins/installs.js";
import { applyExclusiveSlotSelection } from "../plugins/slots.js";
import type { PluginRecord } from "../plugins/registry.js";
import { buildPluginStatusReport } from "../plugins/status.js";
import { updateNpmInstalledPlugins } from "../plugins/update.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { renderTable } from "../terminal/table.js";
import { theme } from "../terminal/theme.js";
import { resolveUserPath, shortenHomeInString, shortenHomePath } from "../utils.js";

export type PluginsListOptions = {
  json?: boolean;
  enabled?: boolean;
  verbose?: boolean;
};

export type PluginInfoOptions = {
  json?: boolean;
};

export type PluginUpdateOptions = {
  all?: boolean;
  dryRun?: boolean;
};

function formatPluginLine(plugin: PluginRecord, verbose = false): string {
  const status =
    plugin.status === "loaded"
      ? theme.success("carregado")
      : plugin.status === "disabled"
        ? theme.warn("desativado")
        : theme.error("erro");
  const name = theme.command(plugin.name || plugin.id);
  const idSuffix = plugin.name && plugin.name !== plugin.id ? theme.muted(` (${plugin.id})`) : "";
  const desc = plugin.description
    ? theme.muted(
        plugin.description.length > 60
          ? `${plugin.description.slice(0, 57)}...`
          : plugin.description,
      )
    : theme.muted("(sem descrição)");

  if (!verbose) {
    return `${name}${idSuffix} ${status} - ${desc}`;
  }

  const parts = [
    `${name}${idSuffix} ${status}`,
    `  fonte: ${theme.muted(shortenHomeInString(plugin.source))}`,
    `  origem: ${plugin.origin}`,
  ];
  if (plugin.version) parts.push(`  versão: ${plugin.version}`);
  if (plugin.providerIds.length > 0) {
    parts.push(`  provedores: ${plugin.providerIds.join(", ")}`);
  }
  if (plugin.error) parts.push(theme.error(`  erro: ${plugin.error}`));
  return parts.join("\n");
}

function applySlotSelectionForPlugin(
  config: ZEROConfig,
  pluginId: string,
): { config: ZEROConfig; warnings: string[] } {
  const report = buildPluginStatusReport({ config });
  const plugin = report.plugins.find((entry) => entry.id === pluginId);
  if (!plugin) {
    return { config, warnings: [] };
  }
  const result = applyExclusiveSlotSelection({
    config,
    selectedId: plugin.id,
    selectedKind: plugin.kind,
    registry: report,
  });
  return { config: result.config, warnings: result.warnings };
}

function logSlotWarnings(warnings: string[]) {
  if (warnings.length === 0) return;
  for (const warning of warnings) {
    defaultRuntime.log(theme.warn(warning));
  }
}

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
    .action((opts: PluginsListOptions) => {
      const report = buildPluginStatusReport();
      const list = opts.enabled
        ? report.plugins.filter((p) => p.status === "loaded")
        : report.plugins;

      if (opts.json) {
        const payload = {
          workspaceDir: report.workspaceDir,
          plugins: list,
          diagnostics: report.diagnostics,
        };
        defaultRuntime.log(JSON.stringify(payload, null, 2));
        return;
      }

      if (list.length === 0) {
        defaultRuntime.log(theme.muted("Nenhum plugin encontrado."));
        return;
      }

      const loaded = list.filter((p) => p.status === "loaded").length;
      defaultRuntime.log(
        `${theme.heading("Plugins")} ${theme.muted(`(${loaded}/${list.length} carregados)`)}`,
      );

      if (!opts.verbose) {
        const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
        const rows = list.map((plugin) => {
          const desc = plugin.description ? theme.muted(plugin.description) : "";
          const sourceLine = desc ? `${plugin.source}\n${desc}` : plugin.source;
          return {
            Name: plugin.name || plugin.id,
            ID: plugin.name && plugin.name !== plugin.id ? plugin.id : "",
            Status:
              plugin.status === "loaded"
                ? theme.success("carregado")
                : plugin.status === "disabled"
                  ? theme.warn("desativado")
                  : theme.error("erro"),
            Source: sourceLine,
            Version: plugin.version ?? "",
          };
        });
        defaultRuntime.log(
          renderTable({
            width: tableWidth,
            columns: [
              { key: "Name", header: "Nome", minWidth: 14, flex: true },
              { key: "ID", header: "ID", minWidth: 10, flex: true },
              { key: "Status", header: "Status", minWidth: 10 },
              { key: "Source", header: "Fonte", minWidth: 26, flex: true },
              { key: "Version", header: "Versão", minWidth: 8 },
            ],
            rows,
          }).trimEnd(),
        );
        return;
      }

      const lines: string[] = [];
      for (const plugin of list) {
        lines.push(formatPluginLine(plugin, true));
        lines.push("");
      }
      defaultRuntime.log(lines.join("\n").trim());
    });

  plugins
    .command("info")
    .description("Mostrar detalhes do plugin")
    .argument("<id>", "ID do plugin")
    .option("--json", "Imprimir JSON")
    .action((id: string, opts: PluginInfoOptions) => {
      const report = buildPluginStatusReport();
      const plugin = report.plugins.find((p) => p.id === id || p.name === id);
      if (!plugin) {
        defaultRuntime.error(`Plugin não encontrado: ${id}`);
        process.exit(1);
      }
      const cfg = loadConfig();
      const install = cfg.plugins?.installs?.[plugin.id];

      if (opts.json) {
        defaultRuntime.log(JSON.stringify(plugin, null, 2));
        return;
      }

      const lines: string[] = [];
      lines.push(theme.heading(plugin.name || plugin.id));
      if (plugin.name && plugin.name !== plugin.id) {
        lines.push(theme.muted(`id: ${plugin.id}`));
      }
      if (plugin.description) lines.push(plugin.description);
      lines.push("");
      lines.push(`${theme.muted("Status:")} ${plugin.status}`);
      lines.push(`${theme.muted("Fonte:")} ${shortenHomeInString(plugin.source)}`);
      lines.push(`${theme.muted("Origem:")} ${plugin.origin}`);
      if (plugin.version) lines.push(`${theme.muted("Versão:")} ${plugin.version}`);
      if (plugin.toolNames.length > 0) {
        lines.push(`${theme.muted("Ferramentas:")} ${plugin.toolNames.join(", ")}`);
      }
      if (plugin.hookNames.length > 0) {
        lines.push(`${theme.muted("Hooks:")} ${plugin.hookNames.join(", ")}`);
      }
      if (plugin.gatewayMethods.length > 0) {
        lines.push(`${theme.muted("Métodos gateway:")} ${plugin.gatewayMethods.join(", ")}`);
      }
      if (plugin.providerIds.length > 0) {
        lines.push(`${theme.muted("Provedores:")} ${plugin.providerIds.join(", ")}`);
      }
      if (plugin.cliCommands.length > 0) {
        lines.push(`${theme.muted("Comandos CLI:")} ${plugin.cliCommands.join(", ")}`);
      }
      if (plugin.services.length > 0) {
        lines.push(`${theme.muted("Serviços:")} ${plugin.services.join(", ")}`);
      }
      if (plugin.error) lines.push(`${theme.error("Erro:")} ${plugin.error}`);
      if (install) {
        lines.push("");
        lines.push(`${theme.muted("Instalação:")} ${install.source}`);
        if (install.spec) lines.push(`${theme.muted("Spec:")} ${install.spec}`);
        if (install.sourcePath)
          lines.push(`${theme.muted("Caminho da fonte:")} ${shortenHomePath(install.sourcePath)}`);
        if (install.installPath)
          lines.push(
            `${theme.muted("Caminho da instalação:")} ${shortenHomePath(install.installPath)}`,
          );
        if (install.version) lines.push(`${theme.muted("Versão registrada:")} ${install.version}`);
        if (install.installedAt)
          lines.push(`${theme.muted("Instalado em:")} ${install.installedAt}`);
      }
      defaultRuntime.log(lines.join("\n"));
    });

  plugins
    .command("enable")
    .description("Ativar um plugin na configuração")
    .argument("<id>", "ID do plugin")
    .action(async (id: string) => {
      const cfg = loadConfig();
      let next: ZEROConfig = {
        ...cfg,
        plugins: {
          ...cfg.plugins,
          entries: {
            ...cfg.plugins?.entries,
            [id]: {
              ...(cfg.plugins?.entries as Record<string, { enabled?: boolean }> | undefined)?.[id],
              enabled: true,
            },
          },
        },
      };
      const slotResult = applySlotSelectionForPlugin(next, id);
      next = slotResult.config;
      await writeConfigFile(next);
      logSlotWarnings(slotResult.warnings);
      defaultRuntime.log(`Plugin "${id}" ativado. Reinicie o gateway para aplicar.`);
    });

  plugins
    .command("disable")
    .description("Desativar um plugin na configuração")
    .argument("<id>", "ID do plugin")
    .action(async (id: string) => {
      const cfg = loadConfig();
      const next = {
        ...cfg,
        plugins: {
          ...cfg.plugins,
          entries: {
            ...cfg.plugins?.entries,
            [id]: {
              ...(cfg.plugins?.entries as Record<string, { enabled?: boolean }> | undefined)?.[id],
              enabled: false,
            },
          },
        },
      };
      await writeConfigFile(next);
      defaultRuntime.log(`Plugin "${id}" desativado. Reinicie o gateway para aplicar.`);
    });

  plugins
    .command("install")
    .description("Instalar um plugin (caminho, arquivo ou spec npm)")
    .argument("<path-or-spec>", "Caminho (.ts/.js/.zip/.tgz/.tar.gz) ou uma spec de pacote npm")
    .option("-l, --link", "Vincular um caminho local em vez de copiar", false)
    .action(async (raw: string, opts: { link?: boolean }) => {
      const resolved = resolveUserPath(raw);
      const cfg = loadConfig();

      if (fs.existsSync(resolved)) {
        if (opts.link) {
          const existing = cfg.plugins?.load?.paths ?? [];
          const merged = Array.from(new Set([...existing, resolved]));
          const probe = await installPluginFromPath({ path: resolved, dryRun: true });
          if (!probe.ok) {
            defaultRuntime.error(probe.error);
            process.exit(1);
          }

          let next: ZEROConfig = {
            ...cfg,
            plugins: {
              ...cfg.plugins,
              load: {
                ...cfg.plugins?.load,
                paths: merged,
              },
              entries: {
                ...cfg.plugins?.entries,
                [probe.pluginId]: {
                  ...(cfg.plugins?.entries?.[probe.pluginId] as object | undefined),
                  enabled: true,
                },
              },
            },
          };
          next = recordPluginInstall(next, {
            pluginId: probe.pluginId,
            source: "path",
            sourcePath: resolved,
            installPath: resolved,
            version: probe.version,
          });
          const slotResult = applySlotSelectionForPlugin(next, probe.pluginId);
          next = slotResult.config;
          await writeConfigFile(next);
          logSlotWarnings(slotResult.warnings);
          defaultRuntime.log(`Caminho de plugin vinculado: ${shortenHomePath(resolved)}`);
          defaultRuntime.log(`Reinicie o gateway para carregar os plugins.`);
          return;
        }

        const result = await installPluginFromPath({
          path: resolved,
          logger: {
            info: (msg) => defaultRuntime.log(msg),
            warn: (msg) => defaultRuntime.log(theme.warn(msg)),
          },
        });
        if (!result.ok) {
          defaultRuntime.error(result.error);
          process.exit(1);
        }

        let next: ZEROConfig = {
          ...cfg,
          plugins: {
            ...cfg.plugins,
            entries: {
              ...cfg.plugins?.entries,
              [result.pluginId]: {
                ...(cfg.plugins?.entries?.[result.pluginId] as object | undefined),
                enabled: true,
              },
            },
          },
        };
        const source: "archive" | "path" = resolveArchiveKind(resolved) ? "archive" : "path";
        next = recordPluginInstall(next, {
          pluginId: result.pluginId,
          source,
          sourcePath: resolved,
          installPath: result.targetDir,
          version: result.version,
        });
        const slotResult = applySlotSelectionForPlugin(next, result.pluginId);
        next = slotResult.config;
        await writeConfigFile(next);
        logSlotWarnings(slotResult.warnings);
        defaultRuntime.log(`Plugin instalado: ${result.pluginId}`);
        defaultRuntime.log(`Reinicie o gateway para carregar os plugins.`);
        return;
      }

      if (opts.link) {
        defaultRuntime.error("`--link` requer um caminho local.");
        process.exit(1);
      }

      const looksLikePath =
        raw.startsWith(".") ||
        raw.startsWith("~") ||
        path.isAbsolute(raw) ||
        raw.endsWith(".ts") ||
        raw.endsWith(".js") ||
        raw.endsWith(".mjs") ||
        raw.endsWith(".cjs") ||
        raw.endsWith(".tgz") ||
        raw.endsWith(".tar.gz") ||
        raw.endsWith(".tar") ||
        raw.endsWith(".zip");
      if (looksLikePath) {
        defaultRuntime.error(`Caminho não encontrado: ${resolved}`);
        process.exit(1);
      }

      const result = await installPluginFromNpmSpec({
        spec: raw,
        logger: {
          info: (msg) => defaultRuntime.log(msg),
          warn: (msg) => defaultRuntime.log(theme.warn(msg)),
        },
      });
      if (!result.ok) {
        defaultRuntime.error(result.error);
        process.exit(1);
      }

      let next: ZEROConfig = {
        ...cfg,
        plugins: {
          ...cfg.plugins,
          entries: {
            ...cfg.plugins?.entries,
            [result.pluginId]: {
              ...(cfg.plugins?.entries?.[result.pluginId] as object | undefined),
              enabled: true,
            },
          },
        },
      };
      next = recordPluginInstall(next, {
        pluginId: result.pluginId,
        source: "npm",
        spec: raw,
        installPath: result.targetDir,
        version: result.version,
      });
      const slotResult = applySlotSelectionForPlugin(next, result.pluginId);
      next = slotResult.config;
      await writeConfigFile(next);
      logSlotWarnings(slotResult.warnings);
      defaultRuntime.log(`Plugin instalado: ${result.pluginId}`);
      defaultRuntime.log(`Reinicie o gateway para carregar os plugins.`);
    });

  plugins
    .command("update")
    .description("Atualizar plugins instalados (apenas instalações npm)")
    .argument("[id]", "ID do plugin (omitir com --all)")
    .option("--all", "Atualizar todos os plugins monitorados", false)
    .option("--dry-run", "Mostrar o que mudaria sem gravar", false)
    .action(async (id: string | undefined, opts: PluginUpdateOptions) => {
      const cfg = loadConfig();
      const installs = cfg.plugins?.installs ?? {};
      const targets = opts.all ? Object.keys(installs) : id ? [id] : [];

      if (targets.length === 0) {
        if (opts.all) {
          defaultRuntime.log("Nenhum plugin instalado via npm para atualizar.");
          return;
        }
        defaultRuntime.error("Forneça um ID de plugin ou use --all.");
        process.exit(1);
      }

      const result = await updateNpmInstalledPlugins({
        config: cfg,
        pluginIds: targets,
        dryRun: opts.dryRun,
        logger: {
          info: (msg) => defaultRuntime.log(msg),
          warn: (msg) => defaultRuntime.log(theme.warn(msg)),
        },
      });

      for (const outcome of result.outcomes) {
        if (outcome.status === "error") {
          defaultRuntime.log(theme.error(outcome.message));
          continue;
        }
        if (outcome.status === "skipped") {
          defaultRuntime.log(theme.warn(outcome.message));
          continue;
        }
        defaultRuntime.log(outcome.message);
      }

      if (!opts.dryRun && result.changed) {
        await writeConfigFile(result.config);
        defaultRuntime.log("Reinicie o gateway para carregar os plugins.");
      }
    });

  plugins
    .command("doctor")
    .description("Relatar problemas de carregamento de plugins")
    .action(() => {
      const report = buildPluginStatusReport();
      const errors = report.plugins.filter((p) => p.status === "error");
      const diags = report.diagnostics.filter((d) => d.level === "error");

      if (errors.length === 0 && diags.length === 0) {
        defaultRuntime.log("Nenhum problema de plugin detectado.");
        return;
      }

      const lines: string[] = [];
      if (errors.length > 0) {
        lines.push(theme.error("Erros de plugin:"));
        for (const entry of errors) {
          lines.push(`- ${entry.id}: ${entry.error ?? "falha ao carregar"} (${entry.source})`);
        }
      }
      if (diags.length > 0) {
        if (lines.length > 0) lines.push("");
        lines.push(theme.warn("Diagnósticos:"));
        for (const diag of diags) {
          const target = diag.pluginId ? `${diag.pluginId}: ` : "";
          lines.push(`- ${target}${diag.message}`);
        }
      }
      const docs = formatDocsLink("/plugin", "docs.zero.local/plugin");
      lines.push("");
      lines.push(`${theme.muted("Docs:")} ${docs}`);
      defaultRuntime.log(lines.join("\n"));
    });
}
