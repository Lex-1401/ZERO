import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import type { ZEROConfig } from "../config/config.js";
import { resolveArchiveKind } from "../infra/archive.js";
import {
  buildWorkspaceHookStatus,
  type HookStatusEntry,
  type HookStatusReport,
} from "../hooks/hooks-status.js";
import type { HookEntry } from "../hooks/types.js";
import { loadWorkspaceHookEntries } from "../hooks/workspace.js";
import { loadConfig, writeConfigFile } from "../config/io.js";
import {
  installHooksFromNpmSpec,
  installHooksFromPath,
  resolveHookInstallDir,
} from "../hooks/install.js";
import { recordHookInstall } from "../hooks/installs.js";
import { buildPluginStatusReport } from "../plugins/status.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { renderTable } from "../terminal/table.js";
import { theme } from "../terminal/theme.js";
import { formatCliCommand } from "./command-format.js";
import { resolveUserPath, shortenHomePath } from "../utils.js";

export type HooksListOptions = {
  json?: boolean;
  eligible?: boolean;
  verbose?: boolean;
};

export type HookInfoOptions = {
  json?: boolean;
};

export type HooksCheckOptions = {
  json?: boolean;
};

export type HooksUpdateOptions = {
  all?: boolean;
  dryRun?: boolean;
};

function mergeHookEntries(pluginEntries: HookEntry[], workspaceEntries: HookEntry[]): HookEntry[] {
  const merged = new Map<string, HookEntry>();
  for (const entry of pluginEntries) {
    merged.set(entry.hook.name, entry);
  }
  for (const entry of workspaceEntries) {
    merged.set(entry.hook.name, entry);
  }
  return Array.from(merged.values());
}

function buildHooksReport(config: ZEROConfig): HookStatusReport {
  const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
  const workspaceEntries = loadWorkspaceHookEntries(workspaceDir, { config });
  const pluginReport = buildPluginStatusReport({ config, workspaceDir });
  const pluginEntries = pluginReport.hooks.map((hook) => hook.entry);
  const entries = mergeHookEntries(pluginEntries, workspaceEntries);
  return buildWorkspaceHookStatus(workspaceDir, { config, entries });
}

function formatHookStatus(hook: HookStatusEntry): string {
  if (hook.eligible) return theme.success("✓ pronto");
  if (hook.disabled) return theme.warn("⏸ desativado");
  return theme.error("✗ ausente");
}

function formatHookName(hook: HookStatusEntry): string {
  const emoji = hook.emoji ?? "🔗";
  return `${emoji} ${theme.command(hook.name)}`;
}

function formatHookSource(hook: HookStatusEntry): string {
  if (!hook.managedByPlugin) return hook.source;
  return `plugin:${hook.pluginId ?? "desconhecido"}`;
}

function formatHookMissingSummary(hook: HookStatusEntry): string {
  const missing: string[] = [];
  if (hook.missing.bins.length > 0) {
    missing.push(`binários: ${hook.missing.bins.join(", ")}`);
  }
  if (hook.missing.anyBins.length > 0) {
    missing.push(`qualquer binário: ${hook.missing.anyBins.join(", ")}`);
  }
  if (hook.missing.env.length > 0) {
    missing.push(`variáveis de ambiente: ${hook.missing.env.join(", ")}`);
  }
  if (hook.missing.config.length > 0) {
    missing.push(`configuração: ${hook.missing.config.join(", ")}`);
  }
  if (hook.missing.os.length > 0) {
    missing.push(`sistema operacional: ${hook.missing.os.join(", ")}`);
  }
  return missing.join("; ");
}

async function readInstalledPackageVersion(dir: string): Promise<string | undefined> {
  try {
    const raw = await fsp.readFile(path.join(dir, "package.json"), "utf-8");
    const parsed = JSON.parse(raw) as { version?: unknown };
    return typeof parsed.version === "string" ? parsed.version : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Format the hooks list output
 */
export function formatHooksList(report: HookStatusReport, opts: HooksListOptions): string {
  const hooks = opts.eligible ? report.hooks.filter((h) => h.eligible) : report.hooks;

  if (opts.json) {
    const jsonReport = {
      workspaceDir: report.workspaceDir,
      managedHooksDir: report.managedHooksDir,
      hooks: hooks.map((h) => ({
        name: h.name,
        description: h.description,
        emoji: h.emoji,
        eligible: h.eligible,
        disabled: h.disabled,
        source: h.source,
        pluginId: h.pluginId,
        events: h.events,
        homepage: h.homepage,
        missing: h.missing,
        managedByPlugin: h.managedByPlugin,
      })),
    };
    return JSON.stringify(jsonReport, null, 2);
  }

  if (hooks.length === 0) {
    const message = opts.eligible
      ? `Nenhum hook elegível encontrado. Execute \`${formatCliCommand("zero hooks list")}\` para ver todos os hooks.`
      : "Nenhum hook encontrado.";
    return message;
  }

  const eligible = hooks.filter((h) => h.eligible);
  const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
  const rows = hooks.map((hook) => {
    const missing = formatHookMissingSummary(hook);
    return {
      Status: formatHookStatus(hook),
      Hook: formatHookName(hook),
      Description: theme.muted(hook.description),
      Source: formatHookSource(hook),
      Missing: missing ? theme.warn(missing) : "",
    };
  });

  const columns = [
    { key: "Status", header: "Status", minWidth: 10 },
    { key: "Hook", header: "Hook", minWidth: 18, flex: true },
    { key: "Description", header: "Descrição", minWidth: 24, flex: true },
    { key: "Source", header: "Fonte", minWidth: 12, flex: true },
  ];
  if (opts.verbose) {
    columns.push({ key: "Missing", header: "Ausente", minWidth: 18, flex: true });
  }

  const lines: string[] = [];
  lines.push(
    `${theme.heading("Hooks")} ${theme.muted(`(${eligible.length}/${hooks.length} prontos)`)}`,
  );
  lines.push(
    renderTable({
      width: tableWidth,
      columns,
      rows,
    }).trimEnd(),
  );
  return lines.join("\n");
}

/**
 * Format detailed info for a single hook
 */
export function formatHookInfo(
  report: HookStatusReport,
  hookName: string,
  opts: HookInfoOptions,
): string {
  const hook = report.hooks.find((h) => h.name === hookName || h.hookKey === hookName);

  if (!hook) {
    if (opts.json) {
      return JSON.stringify({ error: "não encontrado", hook: hookName }, null, 2);
    }
    return `Hook "${hookName}" não encontrado. Execute \`${formatCliCommand("zero hooks list")}\` para ver os hooks disponíveis.`;
  }

  if (opts.json) {
    return JSON.stringify(hook, null, 2);
  }

  const lines: string[] = [];
  const emoji = hook.emoji ?? "🔗";
  const status = hook.eligible
    ? theme.success("✓ Pronto")
    : hook.disabled
      ? theme.warn("⏸ Desativado")
      : theme.error("✗ Requisitos ausentes");

  lines.push(`${emoji} ${theme.heading(hook.name)} ${status}`);
  lines.push("");
  lines.push(hook.description);
  lines.push("");

  // Detalhes
  lines.push(theme.heading("Detalhes:"));
  if (hook.managedByPlugin) {
    lines.push(`${theme.muted("  Fonte:")} ${hook.source} (${hook.pluginId ?? "desconhecido"})`);
  } else {
    lines.push(`${theme.muted("  Fonte:")} ${hook.source}`);
  }
  lines.push(`${theme.muted("  Caminho:")} ${shortenHomePath(hook.filePath)}`);
  lines.push(`${theme.muted("  Handler:")} ${shortenHomePath(hook.handlerPath)}`);
  if (hook.homepage) {
    lines.push(`${theme.muted("  Homepage:")} ${hook.homepage}`);
  }
  if (hook.events.length > 0) {
    lines.push(`${theme.muted("  Eventos:")} ${hook.events.join(", ")}`);
  }
  if (hook.managedByPlugin) {
    lines.push(
      theme.muted("  Gerenciado por plugin; ativar/desativar via CLI de hooks não disponível."),
    );
  }

  // Requirements
  const hasRequirements =
    hook.requirements.bins.length > 0 ||
    hook.requirements.anyBins.length > 0 ||
    hook.requirements.env.length > 0 ||
    hook.requirements.config.length > 0 ||
    hook.requirements.os.length > 0;

  if (hasRequirements) {
    lines.push("");
    lines.push(theme.heading("Requisitos:"));
    if (hook.requirements.bins.length > 0) {
      const binsStatus = hook.requirements.bins.map((bin) => {
        const missing = hook.missing.bins.includes(bin);
        return missing ? theme.error(`✗ ${bin}`) : theme.success(`✓ ${bin}`);
      });
      lines.push(`${theme.muted("  Binários:")} ${binsStatus.join(", ")}`);
    }
    if (hook.requirements.anyBins.length > 0) {
      const anyBinsStatus =
        hook.missing.anyBins.length > 0
          ? theme.error(`✗ (qualquer um de: ${hook.requirements.anyBins.join(", ")})`)
          : theme.success(`✓ (qualquer um de: ${hook.requirements.anyBins.join(", ")})`);
      lines.push(`${theme.muted("  Qualquer binário:")} ${anyBinsStatus}`);
    }
    if (hook.requirements.env.length > 0) {
      const envStatus = hook.requirements.env.map((env) => {
        const missing = hook.missing.env.includes(env);
        return missing ? theme.error(`✗ ${env}`) : theme.success(`✓ ${env}`);
      });
      lines.push(`${theme.muted("  Ambiente:")} ${envStatus.join(", ")}`);
    }
    if (hook.requirements.config.length > 0) {
      const configStatus = hook.configChecks.map((check) => {
        return check.satisfied ? theme.success(`✓ ${check.path}`) : theme.error(`✗ ${check.path}`);
      });
      lines.push(`${theme.muted("  Config:")} ${configStatus.join(", ")}`);
    }
    if (hook.requirements.os.length > 0) {
      const osStatus =
        hook.missing.os.length > 0
          ? theme.error(`✗ (${hook.requirements.os.join(", ")})`)
          : theme.success(`✓ (${hook.requirements.os.join(", ")})`);
      lines.push(`${theme.muted("  SO:")} ${osStatus}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format check output
 */
export function formatHooksCheck(report: HookStatusReport, opts: HooksCheckOptions): string {
  if (opts.json) {
    const eligible = report.hooks.filter((h) => h.eligible);
    const notEligible = report.hooks.filter((h) => !h.eligible);
    return JSON.stringify(
      {
        total: report.hooks.length,
        eligible: eligible.length,
        notEligible: notEligible.length,
        hooks: {
          eligible: eligible.map((h) => h.name),
          notEligible: notEligible.map((h) => ({
            name: h.name,
            missing: h.missing,
          })),
        },
      },
      null,
      2,
    );
  }

  const eligible = report.hooks.filter((h) => h.eligible);
  const notEligible = report.hooks.filter((h) => !h.eligible);

  const lines: string[] = [];
  lines.push(theme.heading("Status dos Hooks"));
  lines.push("");
  lines.push(`${theme.muted("Total de hooks:")} ${report.hooks.length}`);
  lines.push(`${theme.success("Prontos:")} ${eligible.length}`);
  lines.push(`${theme.warn("Não prontos:")} ${notEligible.length}`);

  if (notEligible.length > 0) {
    lines.push("");
    lines.push(theme.heading("Hooks não prontos:"));
    for (const hook of notEligible) {
      const reasons = [];
      if (hook.disabled) reasons.push("desativado");
      if (hook.missing.bins.length > 0) reasons.push(`binários: ${hook.missing.bins.join(", ")}`);
      if (hook.missing.anyBins.length > 0)
        reasons.push(`qualquer binário: ${hook.missing.anyBins.join(", ")}`);
      if (hook.missing.env.length > 0) reasons.push(`ambiente: ${hook.missing.env.join(", ")}`);
      if (hook.missing.config.length > 0)
        reasons.push(`configuração: ${hook.missing.config.join(", ")}`);
      if (hook.missing.os.length > 0)
        reasons.push(`sistema operacional: ${hook.missing.os.join(", ")}`);
      lines.push(`  ${hook.emoji ?? "🔗"} ${hook.name} - ${reasons.join("; ")}`);
    }
  }

  return lines.join("\n");
}

export async function enableHook(hookName: string): Promise<void> {
  const config = loadConfig();
  const report = buildHooksReport(config);
  const hook = report.hooks.find((h) => h.name === hookName);

  if (!hook) {
    throw new Error(`Hook "${hookName}" não encontrado`);
  }

  if (hook.managedByPlugin) {
    throw new Error(
      `Hook "${hookName}" é gerenciado pelo plugin "${hook.pluginId ?? "desconhecido"}" e não pode ser ativado/desativado.`,
    );
  }

  if (!hook.eligible) {
    throw new Error(`Hook "${hookName}" não é elegível (requisitos ausentes)`);
  }

  // Update config
  const entries = { ...config.hooks?.internal?.entries };
  entries[hookName] = { ...entries[hookName], enabled: true };

  const nextConfig = {
    ...config,
    hooks: {
      ...config.hooks,
      internal: {
        ...config.hooks?.internal,
        enabled: true,
        entries,
      },
    },
  };

  await writeConfigFile(nextConfig);
  defaultRuntime.log(
    `${theme.success("✓")} Hook ativado: ${hook.emoji ?? "🔗"} ${theme.command(hookName)}`,
  );
}

export async function disableHook(hookName: string): Promise<void> {
  const config = loadConfig();
  const report = buildHooksReport(config);
  const hook = report.hooks.find((h) => h.name === hookName);

  if (!hook) {
    throw new Error(`Hook "${hookName}" não encontrado`);
  }

  if (hook.managedByPlugin) {
    throw new Error(
      `Hook "${hookName}" é gerenciado pelo plugin "${hook.pluginId ?? "desconhecido"}" e não pode ser ativado/desativado.`,
    );
  }

  // Update config
  const entries = { ...config.hooks?.internal?.entries };
  entries[hookName] = { ...entries[hookName], enabled: false };

  const nextConfig = {
    ...config,
    hooks: {
      ...config.hooks,
      internal: {
        ...config.hooks?.internal,
        entries,
      },
    },
  };

  await writeConfigFile(nextConfig);
  defaultRuntime.log(
    `${theme.warn("⏸")} Hook desativado: ${hook.emoji ?? "🔗"} ${theme.command(hookName)}`,
  );
}

export function registerHooksCli(program: Command): void {
  const hooks = program
    .command("hooks")
    .description("Gerenciar hooks internos do agente")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/hooks", "docs.zero.local/cli/hooks")}\n`,
    );

  hooks
    .command("list")
    .description("Listar todos os hooks")
    .option("--eligible", "Mostrar apenas hooks elegíveis", false)
    .option("--json", "Saída como JSON", false)
    .option("-v, --verbose", "Mostrar mais detalhes incluindo requisitos ausentes", false)
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const report = buildHooksReport(config);
        defaultRuntime.log(formatHooksList(report, opts));
      } catch (err) {
        defaultRuntime.error(
          `${theme.error("Erro:")} ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(1);
      }
    });

  hooks
    .command("info <name>")
    .description("Mostrar informações detalhadas sobre um hook")
    .option("--json", "Saída como JSON", false)
    .action(async (name, opts) => {
      try {
        const config = loadConfig();
        const report = buildHooksReport(config);
        defaultRuntime.log(formatHookInfo(report, name, opts));
      } catch (err) {
        defaultRuntime.error(
          `${theme.error("Erro:")} ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(1);
      }
    });

  hooks
    .command("check")
    .description("Verificar status de elegibilidade dos hooks")
    .option("--json", "Saída como JSON", false)
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const report = buildHooksReport(config);
        defaultRuntime.log(formatHooksCheck(report, opts));
      } catch (err) {
        defaultRuntime.error(
          `${theme.error("Erro:")} ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(1);
      }
    });

  hooks
    .command("enable <name>")
    .description("Ativar um hook")
    .action(async (name) => {
      try {
        await enableHook(name);
      } catch (err) {
        defaultRuntime.error(
          `${theme.error("Erro:")} ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(1);
      }
    });

  hooks
    .command("disable <name>")
    .description("Desativar um hook")
    .action(async (name) => {
      try {
        await disableHook(name);
      } catch (err) {
        defaultRuntime.error(
          `${theme.error("Erro:")} ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(1);
      }
    });

  hooks
    .command("install")
    .description("Instalar um pacote de hooks (caminho, arquivo ou spec npm)")
    .argument("<path-or-spec>", "Caminho para um pacote de hooks ou spec de pacote npm")
    .option("-l, --link", "Vincular um caminho local em vez de copiar", false)
    .action(async (raw: string, opts: { link?: boolean }) => {
      const resolved = resolveUserPath(raw);
      const cfg = loadConfig();

      if (fs.existsSync(resolved)) {
        if (opts.link) {
          const stat = fs.statSync(resolved);
          if (!stat.isDirectory()) {
            defaultRuntime.error("Caminhos de hooks vinculados devem ser diretórios.");
            process.exit(1);
          }

          const existing = cfg.hooks?.internal?.load?.extraDirs ?? [];
          const merged = Array.from(new Set([...existing, resolved]));
          const probe = await installHooksFromPath({ path: resolved, dryRun: true });
          if (!probe.ok) {
            defaultRuntime.error(probe.error);
            process.exit(1);
          }

          let next: ZEROConfig = {
            ...cfg,
            hooks: {
              ...cfg.hooks,
              internal: {
                ...cfg.hooks?.internal,
                enabled: true,
                load: {
                  ...cfg.hooks?.internal?.load,
                  extraDirs: merged,
                },
              },
            },
          };

          if (probe.ok) {
            for (const hookName of probe.hooks) {
              next = {
                ...next,
                hooks: {
                  ...next.hooks,
                  internal: {
                    ...next.hooks?.internal,
                    entries: {
                      ...next.hooks?.internal?.entries,
                      [hookName]: {
                        ...(next.hooks?.internal?.entries?.[hookName] as object | undefined),
                        enabled: true,
                      },
                    },
                  },
                },
              };
            }

            next = recordHookInstall(next, {
              hookId: probe.hookPackId,
              source: "path",
              sourcePath: resolved,
              installPath: resolved,
              version: probe.version,
              hooks: probe.hooks,
            });
          }

          await writeConfigFile(next);
          defaultRuntime.log(`Caminho de hook vinculado: ${shortenHomePath(resolved)}`);
          defaultRuntime.log(`Reinicie o gateway para carregar os hooks.`);
          return;
        }

        const result = await installHooksFromPath({
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
          hooks: {
            ...cfg.hooks,
            internal: {
              ...cfg.hooks?.internal,
              enabled: true,
              entries: {
                ...cfg.hooks?.internal?.entries,
              },
            },
          },
        };

        if (result.ok) {
          for (const hookName of result.hooks) {
            next = {
              ...next,
              hooks: {
                ...next.hooks,
                internal: {
                  ...next.hooks?.internal,
                  entries: {
                    ...next.hooks?.internal?.entries,
                    [hookName]: {
                      ...(next.hooks?.internal?.entries?.[hookName] as object | undefined),
                      enabled: true,
                    },
                  },
                },
              },
            };
          }

          const source: "archive" | "path" = resolveArchiveKind(resolved) ? "archive" : "path";

          next = recordHookInstall(next, {
            hookId: result.hookPackId,
            source,
            sourcePath: resolved,
            installPath: result.targetDir,
            version: result.version,
            hooks: result.hooks,
          });

          await writeConfigFile(next);
          defaultRuntime.log(`Hooks instalados: ${result.hooks.join(", ")}`);
        }
        defaultRuntime.log(`Reinicie o gateway para carregar os hooks.`);
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
        raw.endsWith(".zip") ||
        raw.endsWith(".tgz") ||
        raw.endsWith(".tar.gz") ||
        raw.endsWith(".tar");
      if (looksLikePath) {
        defaultRuntime.error(`Caminho não encontrado: ${resolved}`);
        process.exit(1);
      }

      const result = await installHooksFromNpmSpec({
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
        hooks: {
          ...cfg.hooks,
          internal: {
            ...cfg.hooks?.internal,
            enabled: true,
            entries: {
              ...cfg.hooks?.internal?.entries,
            },
          },
        },
      };

      if (result.ok) {
        for (const hookName of result.hooks) {
          next = {
            ...next,
            hooks: {
              ...next.hooks,
              internal: {
                ...next.hooks?.internal,
                entries: {
                  ...next.hooks?.internal?.entries,
                  [hookName]: {
                    ...(next.hooks?.internal?.entries?.[hookName] as object | undefined),
                    enabled: true,
                  },
                },
              },
            },
          };
        }

        next = recordHookInstall(next, {
          hookId: result.hookPackId,
          source: "npm",
          spec: raw,
          installPath: result.targetDir,
          version: result.version,
          hooks: result.hooks,
        });
        await writeConfigFile(next);
        defaultRuntime.log(`Hooks instalados: ${result.hooks.join(", ")}`);
      }
      defaultRuntime.log(`Reinicie o gateway para carregar os hooks.`);
    });

  hooks
    .command("update")
    .description("Atualizar hooks instalados (apenas instalações npm)")
    .argument("[id]", "ID do pacote de hooks (omitir com --all)")
    .option("--all", "Atualizar todos os hooks monitorados", false)
    .option("--dry-run", "Mostrar o que mudaria sem gravar", false)
    .action(async (id: string | undefined, opts: HooksUpdateOptions) => {
      const cfg = loadConfig();
      const installs = cfg.hooks?.internal?.installs ?? {};
      const targets = opts.all ? Object.keys(installs) : id ? [id] : [];

      if (targets.length === 0) {
        defaultRuntime.error("Forneça um ID de hook ou use --all.");
        process.exit(1);
      }

      let nextCfg = cfg;
      let updatedCount = 0;

      for (const hookId of targets) {
        const record = installs[hookId];
        if (!record) {
          defaultRuntime.log(theme.warn(`Nenhum registro de instalação para "${hookId}".`));
          continue;
        }
        if (record.source !== "npm") {
          defaultRuntime.log(theme.warn(`Pulando "${hookId}" (fonte: ${record.source}).`));
          continue;
        }
        if (!record.spec) {
          defaultRuntime.log(theme.warn(`Pulando "${hookId}" (spec npm ausente).`));
          continue;
        }

        const installPath = record.installPath ?? resolveHookInstallDir(hookId);
        const currentVersion = await readInstalledPackageVersion(installPath);

        if (opts.dryRun) {
          const probe = await installHooksFromNpmSpec({
            spec: record.spec,
            mode: "update",
            dryRun: true,
            expectedHookPackId: hookId,
            logger: {
              info: (msg) => defaultRuntime.log(msg),
              warn: (msg) => defaultRuntime.log(theme.warn(msg)),
            },
          });
          if (!probe.ok) {
            defaultRuntime.log(theme.error(`Falha ao verificar ${hookId}: ${probe.error}`));
            continue;
          }

          const nextVersion = probe.version ?? "unknown";
          const currentLabel = currentVersion ?? "unknown";
          if (currentVersion && probe.version && currentVersion === probe.version) {
            defaultRuntime.log(`${hookId} está atualizado (${currentLabel}).`);
          } else {
            defaultRuntime.log(`Atualizaria ${hookId}: ${currentLabel} → ${nextVersion}.`);
          }
          continue;
        }

        const result = await installHooksFromNpmSpec({
          spec: record.spec,
          mode: "update",
          expectedHookPackId: hookId,
          logger: {
            info: (msg) => defaultRuntime.log(msg),
            warn: (msg) => defaultRuntime.log(theme.warn(msg)),
          },
        });
        if (!result.ok) {
          defaultRuntime.log(theme.error(`Falha ao atualizar ${hookId}: ${result.error}`));
          continue;
        }

        const nextVersion = result.version ?? (await readInstalledPackageVersion(result.targetDir));
        nextCfg = recordHookInstall(nextCfg, {
          hookId,
          source: "npm",
          spec: record.spec,
          installPath: result.targetDir,
          version: nextVersion,
          hooks: result.hooks,
        });
        updatedCount += 1;

        const currentLabel = currentVersion ?? "desconhecido";
        const nextLabel = nextVersion ?? "desconhecido";
        if (currentVersion && nextVersion && currentVersion === nextVersion) {
          defaultRuntime.log(`${hookId} já está na versão ${currentLabel}.`);
        } else {
          defaultRuntime.log(`Atualizado ${hookId}: ${currentLabel} → ${nextLabel}.`);
        }
      }

      if (updatedCount > 0) {
        await writeConfigFile(nextCfg);
        defaultRuntime.log("Reinicie o gateway para carregar os hooks.");
      }
    });

  hooks.action(async () => {
    try {
      const config = loadConfig();
      const report = buildHooksReport(config);
      defaultRuntime.log(formatHooksList(report, {}));
    } catch (err) {
      defaultRuntime.error(
        `${theme.error("Erro:")} ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(1);
    }
  });
}
