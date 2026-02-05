import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { Command } from "commander";

import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import { loadConfig } from "../config/config.js";
import { resolveSessionTranscriptsDirForAgent } from "../config/sessions/paths.js";
import { setVerbose } from "../globals.js";
import { withProgress, withProgressTotals } from "./progress.js";
import { formatErrorMessage, withManager } from "./cli-utils.js";
import { getMemorySearchManager, type MemorySearchManagerResult } from "../memory/index.js";
import { listMemoryFiles } from "../memory/internal.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { colorize, isRich, theme } from "../terminal/theme.js";
import { resolveStateDir } from "../config/paths.js";
import { shortenHomeInString, shortenHomePath } from "../utils.js";

type MemoryCommandOptions = {
  agent?: string;
  json?: boolean;
  deep?: boolean;
  index?: boolean;
  verbose?: boolean;
};

type MemoryManager = NonNullable<MemorySearchManagerResult["manager"]>;

type MemorySourceName = "memory" | "sessions";

type SourceScan = {
  source: MemorySourceName;
  totalFiles: number | null;
  issues: string[];
};

type MemorySourceScan = {
  sources: SourceScan[];
  totalFiles: number | null;
  issues: string[];
};

function formatSourceLabel(source: string, workspaceDir: string, agentId: string): string {
  if (source === "memory") {
    return shortenHomeInString(
      `memory (MEMORY.md + ${path.join(workspaceDir, "memory")}${path.sep}*.md)`,
    );
  }
  if (source === "sessions") {
    const stateDir = resolveStateDir(process.env, os.homedir);
    return shortenHomeInString(
      `sessions (${path.join(stateDir, "agents", agentId, "sessions")}${path.sep}*.jsonl)`,
    );
  }
  return source;
}

function resolveAgent(cfg: ReturnType<typeof loadConfig>, agent?: string) {
  const trimmed = agent?.trim();
  if (trimmed) return trimmed;
  return resolveDefaultAgentId(cfg);
}

function resolveAgentIds(cfg: ReturnType<typeof loadConfig>, agent?: string): string[] {
  const trimmed = agent?.trim();
  if (trimmed) return [trimmed];
  const list = cfg.agents?.list ?? [];
  if (list.length > 0) {
    return list.map((entry) => entry.id).filter(Boolean);
  }
  return [resolveDefaultAgentId(cfg)];
}

async function checkReadableFile(pathname: string): Promise<{ exists: boolean; issue?: string }> {
  try {
    await fs.access(pathname, fsSync.constants.R_OK);
    return { exists: true };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { exists: false };
    return {
      exists: true,
      issue: `${shortenHomePath(pathname)} não legível (${code ?? "erro"})`,
    };
  }
}

async function scanSessionFiles(agentId: string): Promise<SourceScan> {
  const issues: string[] = [];
  const sessionsDir = resolveSessionTranscriptsDirForAgent(agentId);
  try {
    const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
    const totalFiles = entries.filter(
      (entry) => entry.isFile() && entry.name.endsWith(".jsonl"),
    ).length;
    return { source: "sessions", totalFiles, issues };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      issues.push(`diretório de sessões ausente (${shortenHomePath(sessionsDir)})`);
      return { source: "sessions", totalFiles: 0, issues };
    }
    issues.push(
      `diretório de sessões não acessível (${shortenHomePath(sessionsDir)}): ${code ?? "erro"}`,
    );
    return { source: "sessions", totalFiles: null, issues };
  }
}

async function scanMemoryFiles(workspaceDir: string): Promise<SourceScan> {
  const issues: string[] = [];
  const memoryFile = path.join(workspaceDir, "MEMORY.md");
  const altMemoryFile = path.join(workspaceDir, "memory.md");
  const memoryDir = path.join(workspaceDir, "memory");

  const primary = await checkReadableFile(memoryFile);
  const alt = await checkReadableFile(altMemoryFile);
  if (primary.issue) issues.push(primary.issue);
  if (alt.issue) issues.push(alt.issue);

  let dirReadable: boolean | null = null;
  try {
    await fs.access(memoryDir, fsSync.constants.R_OK);
    dirReadable = true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      issues.push(`diretório de memória ausente (${shortenHomePath(memoryDir)})`);
      dirReadable = false;
    } else {
      issues.push(
        `diretório de memória não acessível (${shortenHomePath(memoryDir)}): ${code ?? "erro"}`,
      );
      dirReadable = null;
    }
  }

  let listed: string[] = [];
  let listedOk = false;
  try {
    listed = await listMemoryFiles(workspaceDir);
    listedOk = true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (dirReadable !== null) {
      issues.push(
        `falha na varredura do diretório de memória (${shortenHomePath(memoryDir)}): ${code ?? "erro"}`,
      );
      dirReadable = null;
    }
  }

  let totalFiles: number | null = 0;
  if (dirReadable === null) {
    totalFiles = null;
  } else {
    const files = new Set<string>(listedOk ? listed : []);
    if (!listedOk) {
      if (primary.exists) files.add(memoryFile);
      if (alt.exists) files.add(altMemoryFile);
    }
    totalFiles = files.size;
  }

  if ((totalFiles ?? 0) === 0 && issues.length === 0) {
    issues.push(`nenhum arquivo de memória encontrado em ${shortenHomePath(workspaceDir)}`);
  }

  return { source: "memory", totalFiles, issues };
}

async function scanMemorySources(params: {
  workspaceDir: string;
  agentId: string;
  sources: MemorySourceName[];
}): Promise<MemorySourceScan> {
  const scans: SourceScan[] = [];
  for (const source of params.sources) {
    if (source === "memory") {
      scans.push(await scanMemoryFiles(params.workspaceDir));
    }
    if (source === "sessions") {
      scans.push(await scanSessionFiles(params.agentId));
    }
  }
  const issues = scans.flatMap((scan) => scan.issues);
  const totals = scans.map((scan) => scan.totalFiles);
  const numericTotals = totals.filter((total): total is number => total !== null);
  const totalFiles = totals.some((total) => total === null)
    ? null
    : numericTotals.reduce((sum, total) => sum + total, 0);
  return { sources: scans, totalFiles, issues };
}

export async function runMemoryStatus(opts: MemoryCommandOptions) {
  setVerbose(Boolean(opts.verbose));
  const cfg = loadConfig();
  const agentIds = resolveAgentIds(cfg, opts.agent);
  const allResults: Array<{
    agentId: string;
    status: ReturnType<MemoryManager["status"]>;
    embeddingProbe?: Awaited<ReturnType<MemoryManager["probeEmbeddingAvailability"]>>;
    indexError?: string;
    scan?: MemorySourceScan;
  }> = [];

  for (const agentId of agentIds) {
    await withManager<MemoryManager>({
      getManager: () => getMemorySearchManager({ cfg, agentId }),
      onMissing: (error) => defaultRuntime.log(error ?? "Busca de memória desativada."),
      onCloseError: (err) =>
        defaultRuntime.error(
          `Falha ao fechar o gerenciador de memória: ${formatErrorMessage(err)}`,
        ),
      close: (manager) => manager.close(),
      run: async (manager) => {
        const deep = Boolean(opts.deep || opts.index);
        let embeddingProbe:
          | Awaited<ReturnType<typeof manager.probeEmbeddingAvailability>>
          | undefined;
        let indexError: string | undefined;
        if (deep) {
          await withProgress({ label: "Verificando memória…", total: 2 }, async (progress) => {
            progress.setLabel("Sondando vetor…");
            await manager.probeVectorAvailability();
            progress.tick();
            progress.setLabel("Sondando embeddings…");
            embeddingProbe = await manager.probeEmbeddingAvailability();
            progress.tick();
          });
          if (opts.index) {
            await withProgressTotals(
              {
                label: "Indexando memória…",
                total: 0,
                fallback: opts.verbose ? "line" : undefined,
              },
              async (update, progress) => {
                try {
                  await manager.sync({
                    reason: "cli",
                    progress: (syncUpdate) => {
                      update({
                        completed: syncUpdate.completed,
                        total: syncUpdate.total,
                        label: syncUpdate.label,
                      });
                      if (syncUpdate.label) progress.setLabel(syncUpdate.label);
                    },
                  });
                } catch (err) {
                  indexError = formatErrorMessage(err);
                  defaultRuntime.error(`Falha no índice de memória: ${indexError}`);
                  process.exitCode = 1;
                }
              },
            );
          }
        } else {
          await manager.probeVectorAvailability();
        }
        const status = manager.status();
        const sources = (
          status.sources?.length ? status.sources : ["memory"]
        ) as MemorySourceName[];
        const scan = await scanMemorySources({
          workspaceDir: status.workspaceDir,
          agentId,
          sources,
        });
        allResults.push({ agentId, status, embeddingProbe, indexError, scan });
      },
    });
  }

  if (opts.json) {
    defaultRuntime.log(JSON.stringify(allResults, null, 2));
    return;
  }

  const rich = isRich();
  const heading = (text: string) => colorize(rich, theme.heading, text);
  const muted = (text: string) => colorize(rich, theme.muted, text);
  const info = (text: string) => colorize(rich, theme.info, text);
  const success = (text: string) => colorize(rich, theme.success, text);
  const warn = (text: string) => colorize(rich, theme.warn, text);
  const accent = (text: string) => colorize(rich, theme.accent, text);

  const providerLabel = "Provedor";
  const modelLabel = "Modelo";
  const sourcesLabel = "Fontes";
  const indexedLabelText = "Indexado";
  const dirtyLabel = "Sujo";
  const storeLabel = "Armazenamento";
  const workspaceLabel = "Espaço de trabalho";
  const embeddingsLabel = "Embeddings";
  const embeddingsErrorLabel = "Erro de embeddings";
  const bySourceLabel = "Por fonte";
  const fallbackLabel = "Fallback";
  const vectorLabel = "Vetor";
  const vectorDimsLabel = "Dimensões do vetor";
  const vectorPathLabel = "Caminho do vetor";
  const vectorErrorLabel = "Erro do vetor";
  const ftsLabel = "FTS";
  const ftsErrorLabel = "Erro de FTS";
  const cacheLabel = "Cache de embeddings";
  const cacheCapLabel = "Capacidade do cache";
  const batchLabel = "Lote";
  const batchErrorLabel = "Erro de lote";
  const indexErrorLabel = "Erro de índice";
  const issuesLabel = "Problemas";

  for (const result of allResults) {
    const { agentId, status, embeddingProbe, indexError, scan } = result;
    const totalFiles = scan?.totalFiles ?? null;
    const filesLabel =
      totalFiles === null
        ? `${status.files}/? arquivos · ${status.chunks} blocos`
        : `${status.files}/${totalFiles} arquivos · ${status.chunks} blocos`;
    if (opts.index) {
      const line = indexError
        ? `Falha no índice de memória: ${indexError}`
        : "Índice de memória completo.";
      defaultRuntime.log(line);
    }
    const lines = [
      `${heading("Busca de Memória")} ${muted(`(${agentId})`)}`,
      `${muted(`${providerLabel}:`)} ${info(status.provider)} ${muted(
        `(solicitado: ${status.requestedProvider})`,
      )}`,
      `${muted(`${modelLabel}:`)} ${info(status.model)}`,
      status.sources?.length
        ? `${muted(`${sourcesLabel}:`)} ${info(status.sources.join(", "))}`
        : null,
      `${muted(`${indexedLabelText}:`)} ${success(filesLabel)}`,
      `${muted(`${dirtyLabel}:`)} ${status.dirty ? warn("sim") : muted("não")}`,
      `${muted(`${storeLabel}:`)} ${info(shortenHomePath(status.dbPath))}`,
      `${muted(`${workspaceLabel}:`)} ${info(shortenHomePath(status.workspaceDir))}`,
    ].filter(Boolean) as string[];
    if (embeddingProbe) {
      const state = embeddingProbe.ok ? "pronto" : "indisponível";
      const stateColor = embeddingProbe.ok ? theme.success : theme.warn;
      lines.push(`${muted(`${embeddingsLabel}:`)} ${colorize(rich, stateColor, state)}`);
      if (embeddingProbe.error) {
        lines.push(`${muted(`${embeddingsErrorLabel}:`)} ${warn(embeddingProbe.error)}`);
      }
    }
    if (status.sourceCounts?.length) {
      lines.push(muted(`${bySourceLabel}:`));
      for (const entry of status.sourceCounts) {
        const total = scan?.sources.find(
          (scanEntry) => scanEntry.source === entry.source,
        )?.totalFiles;
        const counts =
          total === null
            ? `${entry.files}/? arquivos · ${entry.chunks} blocos`
            : `${entry.files}/${total} arquivos · ${entry.chunks} blocos`;
        lines.push(`  ${accent(entry.source)} ${muted("·")} ${muted(counts)}`);
      }
    }
    if (status.fallback) {
      lines.push(`${muted(`${fallbackLabel}:`)} ${warn(status.fallback.from)}`);
    }
    if (status.vector) {
      const vectorState = status.vector.enabled
        ? status.vector.available === undefined
          ? "desconhecido"
          : status.vector.available
            ? "pronto"
            : "indisponível"
        : "desativado";
      const vectorColor =
        vectorState === "pronto"
          ? theme.success
          : vectorState === "indisponível"
            ? theme.warn
            : theme.muted;
      lines.push(`${muted(`${vectorLabel}:`)} ${colorize(rich, vectorColor, vectorState)}`);
      if (status.vector.dims) {
        lines.push(`${muted(`${vectorDimsLabel}:`)} ${info(String(status.vector.dims))}`);
      }
      if (status.vector.extensionPath) {
        lines.push(
          `${muted(`${vectorPathLabel}:`)} ${info(shortenHomePath(status.vector.extensionPath))}`,
        );
      }
      if (status.vector.loadError) {
        lines.push(`${muted(`${vectorErrorLabel}:`)} ${warn(status.vector.loadError)}`);
      }
    }
    if (status.fts) {
      const ftsState = status.fts.enabled
        ? status.fts.available
          ? "pronto"
          : "indisponível"
        : "desativado";
      const ftsColor =
        ftsState === "pronto"
          ? theme.success
          : ftsState === "indisponível"
            ? theme.warn
            : theme.muted;
      lines.push(`${muted(`${ftsLabel}:`)} ${colorize(rich, ftsColor, ftsState)}`);
      if (status.fts.error) {
        lines.push(`${muted(`${ftsErrorLabel}:`)} ${warn(status.fts.error)}`);
      }
    }
    if (status.cache) {
      const cacheState = status.cache.enabled ? "ativado" : "desativado";
      const cacheColor = status.cache.enabled ? theme.success : theme.muted;
      const suffix =
        status.cache.enabled && typeof status.cache.entries === "number"
          ? ` (${status.cache.entries} entradas)`
          : "";
      lines.push(`${muted(`${cacheLabel}:`)} ${colorize(rich, cacheColor, cacheState)}${suffix}`);
      if (status.cache.enabled && typeof status.cache.maxEntries === "number") {
        lines.push(`${muted(`${cacheCapLabel}:`)} ${info(String(status.cache.maxEntries))}`);
      }
    }
    if (status.batch) {
      const batchState = status.batch.enabled ? "ativado" : "desativado";
      const batchColor = status.batch.enabled ? theme.success : theme.warn;
      const batchSuffix = ` (falhas ${status.batch.failures}/${status.batch.limit})`;
      lines.push(
        `${muted(`${batchLabel}:`)} ${colorize(rich, batchColor, batchState)}${muted(batchSuffix)}`,
      );
      if (status.batch.lastError) {
        lines.push(`${muted(`${batchErrorLabel}:`)} ${warn(status.batch.lastError)}`);
      }
    }
    if (status.fallback?.reason) {
      lines.push(muted(status.fallback.reason));
    }
    if (indexError) {
      lines.push(`${muted(`${indexErrorLabel}:`)} ${warn(indexError)}`);
    }
    if (scan?.issues.length) {
      lines.push(muted(`${issuesLabel}:`));
      for (const issue of scan.issues) {
        lines.push(`  ${warn(issue)}`);
      }
    }
    defaultRuntime.log(lines.join("\n"));
    defaultRuntime.log("");
  }
}

export function registerMemoryCli(program: Command) {
  const memory = program
    .command("memory")
    .description("Ferramentas de busca na memória")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/memory", "docs.zero.local/cli/memory")}\n`,
    );

  memory
    .command("status")
    .description("Mostrar status do índice de busca na memória")
    .option("--agent <id>", "ID do agente (padrão: agente padrão)")
    .option("--json", "Imprimir JSON")
    .option("--deep", "Sondar disponibilidade do provedor de embedding")
    .option("--index", "Reindexar se estiver sujo (implica --deep)")
    .option("--verbose", "Logs detalhados", false)
    .action(async (opts: MemoryCommandOptions) => {
      await runMemoryStatus(opts);
    });

  memory
    .command("index")
    .description("Reindexar arquivos de memória")
    .option("--agent <id>", "ID do agente (padrão: agente padrão)")
    .option("--force", "Forçar reindexação completa", false)
    .option("--verbose", "Logs detalhados", false)
    .action(async (opts: MemoryCommandOptions & { force?: boolean }) => {
      setVerbose(Boolean(opts.verbose));
      const cfg = loadConfig();
      const agentIds = resolveAgentIds(cfg, opts.agent);
      for (const agentId of agentIds) {
        await withManager<MemoryManager>({
          getManager: () => getMemorySearchManager({ cfg, agentId }),
          onMissing: (error) => defaultRuntime.log(error ?? "Busca de memória desativada."),
          onCloseError: (err) =>
            defaultRuntime.error(
              `Falha ao fechar o gerenciador de memória: ${formatErrorMessage(err)}`,
            ),
          close: (manager) => manager.close(),
          run: async (manager) => {
            try {
              if (opts.verbose) {
                const status = manager.status();
                const rich = isRich();
                const heading = (text: string) => colorize(rich, theme.heading, text);
                const muted = (text: string) => colorize(rich, theme.muted, text);
                const info = (text: string) => colorize(rich, theme.info, text);
                const warn = (text: string) => colorize(rich, theme.warn, text);
                const labelProvider = "Provedor";
                const labelModel = "Modelo";
                const labelSources = "Fontes";
                const labelFallback = "Fallback";
                const sourceLabels = status.sources.map((source) =>
                  formatSourceLabel(source, status.workspaceDir, agentId),
                );

                const lines = [
                  `${heading("Índice de Memória")} ${muted(`(${agentId})`)}`,
                  `${muted(`${labelProvider}:`)} ${info(status.provider)} ${muted(
                    `(solicitado: ${status.requestedProvider})`,
                  )}`,
                  `${muted(`${labelModel}:`)} ${info(status.model)}`,
                  sourceLabels.length
                    ? `${muted(`${labelSources}:`)} ${info(sourceLabels.join(", "))}`
                    : null,
                ].filter(Boolean) as string[];
                if (status.fallback) {
                  lines.push(`${muted(`${labelFallback}:`)} ${warn(status.fallback.from)}`);
                }
                defaultRuntime.log(lines.join("\n"));
                defaultRuntime.log("");
              }
              const startedAt = Date.now();
              let lastLabel = "Indexando memória…";
              let lastCompleted = 0;
              let lastTotal = 0;
              const formatElapsed = () => {
                const elapsedMs = Math.max(0, Date.now() - startedAt);
                const seconds = Math.floor(elapsedMs / 1000);
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
              };
              const formatEta = () => {
                if (lastTotal <= 0 || lastCompleted <= 0) return null;
                const elapsedMs = Math.max(1, Date.now() - startedAt);
                const rate = lastCompleted / elapsedMs;
                if (!Number.isFinite(rate) || rate <= 0) return null;
                const remainingMs = Math.max(0, (lastTotal - lastCompleted) / rate);
                const seconds = Math.floor(remainingMs / 1000);
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
              };
              const buildLabel = () => {
                const elapsed = formatElapsed();
                const eta = formatEta();
                return eta
                  ? `${lastLabel} · decorrido ${elapsed} · restante ${eta}`
                  : `${lastLabel} · decorrido ${elapsed}`;
              };
              await withProgressTotals(
                {
                  label: "Indexando memória…",
                  total: 0,
                  fallback: opts.verbose ? "line" : undefined,
                },
                async (update, progress) => {
                  const interval = setInterval(() => {
                    progress.setLabel(buildLabel());
                  }, 1000);
                  try {
                    await manager.sync({
                      reason: "cli",
                      force: opts.force,
                      progress: (syncUpdate) => {
                        if (syncUpdate.label) lastLabel = syncUpdate.label;
                        lastCompleted = syncUpdate.completed;
                        lastTotal = syncUpdate.total;
                        update({
                          completed: syncUpdate.completed,
                          total: syncUpdate.total,
                          label: buildLabel(),
                        });
                        progress.setLabel(buildLabel());
                      },
                    });
                  } finally {
                    clearInterval(interval);
                  }
                },
              );
              defaultRuntime.log(`Índice de memória atualizado (${agentId}).`);
            } catch (err) {
              const message = formatErrorMessage(err);
              defaultRuntime.error(`Falha no índice de memória (${agentId}): ${message}`);
              process.exitCode = 1;
            }
          },
        });
      }
    });

  memory
    .command("search")
    .description("Buscar arquivos de memória")
    .argument("<query>", "Consulta de busca")
    .option("--agent <id>", "ID do agente (padrão: agente padrão)")
    .option("--max-results <n>", "Máximo de resultados", (value: string) => Number(value))
    .option("--min-score <n>", "Pontuação mínima", (value: string) => Number(value))
    .option("--json", "Imprimir JSON")
    .action(
      async (
        query: string,
        opts: MemoryCommandOptions & {
          maxResults?: number;
          minScore?: number;
        },
      ) => {
        const cfg = loadConfig();
        const agentId = resolveAgent(cfg, opts.agent);
        await withManager<MemoryManager>({
          getManager: () => getMemorySearchManager({ cfg, agentId }),
          onMissing: (error) => defaultRuntime.log(error ?? "Busca de memória desativada."),
          onCloseError: (err) =>
            defaultRuntime.error(
              `Falha ao fechar o gerenciador de memória: ${formatErrorMessage(err)}`,
            ),
          close: (manager) => manager.close(),
          run: async (manager) => {
            let results: Awaited<ReturnType<typeof manager.search>>;
            try {
              results = await manager.search(query, {
                maxResults: opts.maxResults,
                minScore: opts.minScore,
              });
            } catch (err) {
              const message = formatErrorMessage(err);
              defaultRuntime.error(`Busca de memória falhou: ${message}`);
              process.exitCode = 1;
              return;
            }
            if (opts.json) {
              defaultRuntime.log(JSON.stringify({ results }, null, 2));
              return;
            }
            if (results.length === 0) {
              defaultRuntime.log("Nenhum resultado.");
              return;
            }
            const rich = isRich();
            const lines: string[] = [];
            for (const result of results) {
              lines.push(
                `${colorize(rich, theme.success, result.score.toFixed(3))} ${colorize(
                  rich,
                  theme.accent,
                  `${shortenHomePath(result.path)}:${result.startLine}-${result.endLine}`,
                )}`,
              );
              lines.push(colorize(rich, theme.muted, result.snippet));
              lines.push("");
            }
            defaultRuntime.log(lines.join("\n").trim());
          },
        });
      },
    );
}
