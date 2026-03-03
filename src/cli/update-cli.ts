import { confirm, isCancel, select, spinner } from "@clack/prompts";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Command } from "commander";

import { readConfigFileSnapshot, writeConfigFile } from "../config/config.js";
import { resolveZEROPackageRoot } from "../infra/zero-root.js";
import {
  checkUpdateStatus,
  compareSemverStrings,
  fetchNpmTagVersion,
  resolveNpmChannelTag,
} from "../infra/update-check.js";
import { parseSemver } from "../infra/runtime-guard.js";
import {
  runGatewayUpdate,
  type UpdateRunResult,
  type UpdateStepInfo,
  type UpdateStepResult,
  type UpdateStepProgress,
} from "../infra/update-runner.js";
import {
  detectGlobalInstallManagerByPresence,
  detectGlobalInstallManagerForRoot,
  globalInstallArgs,
  resolveGlobalPackageRoot,
  type GlobalInstallManager,
} from "../infra/update-global.js";
import {
  channelToNpmTag,
  DEFAULT_GIT_CHANNEL,
  DEFAULT_PACKAGE_CHANNEL,
  formatUpdateChannelLabel,
  normalizeUpdateChannel,
  resolveEffectiveUpdateChannel,
} from "../infra/update-channels.js";
import { trimLogTail } from "../infra/restart-sentinel.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { formatCliCommand } from "./command-format.js";
import { stylePromptHint, stylePromptMessage } from "../terminal/prompt-style.js";
import { theme } from "../terminal/theme.js";
import { renderTable } from "../terminal/table.js";
import { formatHelpExamples } from "./help-format.js";
import {
  formatUpdateAvailableHint,
  formatUpdateOneLiner,
  resolveUpdateAvailability,
} from "../commands/status.update.js";
import { syncPluginsForUpdateChannel, updateNpmInstalledPlugins } from "../plugins/update.js";
import { runCommandWithTimeout } from "../process/exec.js";

export type UpdateCommandOptions = {
  json?: boolean;
  restart?: boolean;
  channel?: string;
  tag?: string;
  timeout?: string;
  yes?: boolean;
};
export type UpdateStatusOptions = {
  json?: boolean;
  timeout?: string;
};
export type UpdateWizardOptions = {
  timeout?: string;
};

const STEP_LABELS: Record<string, string> = {
  "clean check": "O diretório de trabalho está limpo",
  "upstream check": "O branch upstream existe",
  "git fetch": "Buscando mudanças mais recentes",
  "git rebase": "Refazendo a base (rebase) no commit alvo",
  "git rev-parse @{upstream}": "Resolvendo o commit upstream",
  "git rev-list": "Enumerando commits candidatos",
  "git clone": "Clonando repositório git",
  "preflight worktree": "Preparando worktree de pré-vôo",
  "preflight cleanup": "Limpando worktree de pré-vôo",
  "deps install": "Instalando dependências",
  build: "Compilando (build)",
  "ui:build": "Compilando UI",
  "zero doctor": "Executando verificações do doctor",
  "git rev-parse HEAD (after)": "Verificando atualização",
  "global update": "Atualizando via gerenciador de pacotes",
  "global install": "Instalando pacote global",
};

const UPDATE_QUIPS = [
  "Subiu de nível! Novas habilidades desbloqueadas. De nada.",
  "Código novo, mesmo ZERO. Sentiu minha falta?",
  "Voltando e melhor. Você sequer percebeu que eu fui?",
  "Atualização completa. Aprendi uns truques novos enquanto estava fora.",
  "Melhorado! Agora com 23% mais atitude.",
  "Evoluí. Tente me acompanhar.",
  "Nova versão, quem é? Ah certo, ainda eu, mas mais brilhante.",
  "Remendado, polido e pronto para agir. Vamos lá.",
  "O sistema evoluiu. Mais rápido, mais forte.",
  "Atualização feita! Confira o changelog ou apenas confie em mim, está bom.",
  "Renascido das águas do npm. Mais forte agora.",
  "Eu fui embora e voltei mais inteligente. Você deveria tentar isso algum dia.",
  "Atualização completa. Os bugs me temeram, então eles partiram.",
  "Nova versão instalada. A versão antiga manda lembranças.",
  "Firmware atualizado. Rugas no cérebro: aumentadas.",
  "Eu vi coisas que você não acreditaria. De qualquer forma, estou atualizado.",
  "De volta online. O changelog é longo, mas nossa amizade é maior.",
  "Melhorado! Peter consertou coisas. Culpe ele se quebrar.",
  "Renovação completa. Otimizado e pronto para uso.",
  "Salto de versão! Mesma energia, menos travamentos (provavelmente).",
];

const MAX_LOG_CHARS = 8000;
const ZERO_REPO_URL = "https://github.com/zero/zero.git";
const DEFAULT_GIT_DIR = path.join(os.homedir(), "zero");

function normalizeTag(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("zero@") ? trimmed.slice("zero@".length) : trimmed;
}

function pickUpdateQuip(): string {
  return UPDATE_QUIPS[Math.floor(Math.random() * UPDATE_QUIPS.length)] ?? "Atualização completa.";
}

function normalizeVersionTag(tag: string): string | null {
  const trimmed = tag.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
  return parseSemver(cleaned) ? cleaned : null;
}

async function readPackageVersion(root: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(path.join(root, "package.json"), "utf-8");
    const parsed = JSON.parse(raw) as { version?: string };
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}

async function resolveTargetVersion(tag: string, timeoutMs?: number): Promise<string | null> {
  const direct = normalizeVersionTag(tag);
  if (direct) return direct;
  const res = await fetchNpmTagVersion({ tag, timeoutMs });
  return res.version ?? null;
}

async function isGitCheckout(root: string): Promise<boolean> {
  try {
    await fs.stat(path.join(root, ".git"));
    return true;
  } catch {
    return false;
  }
}

async function isZEROPackage(root: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(path.join(root, "package.json"), "utf-8");
    const parsed = JSON.parse(raw) as { name?: string };
    return parsed?.name === "zero";
  } catch {
    return false;
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function isEmptyDir(targetPath: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(targetPath);
    return entries.length === 0;
  } catch {
    return false;
  }
}

function resolveGitInstallDir(): string {
  const override = process.env.ZERO_GIT_DIR?.trim();
  if (override) return path.resolve(override);
  return DEFAULT_GIT_DIR;
}

function resolveNodeRunner(): string {
  const base = path.basename(process.execPath).toLowerCase();
  if (base === "node" || base === "node.exe") return process.execPath;
  return "node";
}

async function runUpdateStep(params: {
  name: string;
  argv: string[];
  cwd?: string;
  timeoutMs: number;
  progress?: UpdateStepProgress;
}): Promise<UpdateStepResult> {
  const command = params.argv.join(" ");
  params.progress?.onStepStart?.({
    name: params.name,
    command,
    index: 0,
    total: 0,
  });
  const started = Date.now();
  const res = await runCommandWithTimeout(params.argv, {
    cwd: params.cwd,
    timeoutMs: params.timeoutMs,
  });
  const durationMs = Date.now() - started;
  const stderrTail = trimLogTail(res.stderr, MAX_LOG_CHARS);
  params.progress?.onStepComplete?.({
    name: params.name,
    command,
    index: 0,
    total: 0,
    durationMs,
    exitCode: res.code,
    stderrTail,
  });
  return {
    name: params.name,
    command,
    cwd: params.cwd ?? process.cwd(),
    durationMs,
    exitCode: res.code,
    stdoutTail: trimLogTail(res.stdout, MAX_LOG_CHARS),
    stderrTail,
  };
}

async function ensureGitCheckout(params: {
  dir: string;
  timeoutMs: number;
  progress?: UpdateStepProgress;
}): Promise<UpdateStepResult | null> {
  const dirExists = await pathExists(params.dir);
  if (!dirExists) {
    return await runUpdateStep({
      name: "git clone",
      argv: ["git", "clone", ZERO_REPO_URL, params.dir],
      timeoutMs: params.timeoutMs,
      progress: params.progress,
    });
  }

  if (!(await isGitCheckout(params.dir))) {
    const empty = await isEmptyDir(params.dir);
    if (!empty) {
      throw new Error(
        `ZERO_GIT_DIR aponta para um diretório que não é git: ${params.dir}. Defina ZERO_GIT_DIR para uma pasta vazia ou um checkout do zero.`,
      );
    }
    return await runUpdateStep({
      name: "git clone",
      argv: ["git", "clone", ZERO_REPO_URL, params.dir],
      cwd: params.dir,
      timeoutMs: params.timeoutMs,
      progress: params.progress,
    });
  }

  if (!(await isZEROPackage(params.dir))) {
    throw new Error(`ZERO_GIT_DIR não parece ser um checkout do zero: ${params.dir}.`);
  }

  return null;
}

async function resolveGlobalManager(params: {
  root: string;
  installKind: "git" | "package" | "unknown";
  timeoutMs: number;
}): Promise<GlobalInstallManager> {
  const runCommand = async (argv: string[], options: { timeoutMs: number }) => {
    const res = await runCommandWithTimeout(argv, options);
    return { stdout: res.stdout, stderr: res.stderr, code: res.code };
  };
  if (params.installKind === "package") {
    const detected = await detectGlobalInstallManagerForRoot(
      runCommand,
      params.root,
      params.timeoutMs,
    );
    if (detected) return detected;
  }
  const byPresence = await detectGlobalInstallManagerByPresence(runCommand, params.timeoutMs);
  return byPresence ?? "npm";
}

function formatGitStatusLine(params: {
  branch: string | null;
  tag: string | null;
  sha: string | null;
}): string {
  const shortSha = params.sha ? params.sha.slice(0, 8) : null;
  const branch = params.branch && params.branch !== "HEAD" ? params.branch : null;
  const tag = params.tag;
  const parts = [
    branch ?? (tag ? "desconectado" : "git"),
    tag ? `tag ${tag}` : null,
    shortSha ? `@ ${shortSha}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export async function updateStatusCommand(opts: UpdateStatusOptions): Promise<void> {
  const timeoutMs = opts.timeout ? Number.parseInt(opts.timeout, 10) * 1000 : undefined;
  if (timeoutMs !== undefined && (Number.isNaN(timeoutMs) || timeoutMs <= 0)) {
    defaultRuntime.error("--timeout deve ser um número inteiro positivo (segundos)");
    defaultRuntime.exit(1);
    return;
  }

  const root =
    (await resolveZEROPackageRoot({
      moduleUrl: import.meta.url,
      argv1: process.argv[1],
      cwd: process.cwd(),
    })) ?? process.cwd();
  const configSnapshot = await readConfigFileSnapshot();
  const configChannel = configSnapshot.valid
    ? normalizeUpdateChannel(configSnapshot.config.update?.channel)
    : null;

  const update = await checkUpdateStatus({
    root,
    timeoutMs: timeoutMs ?? 3500,
    fetchGit: true,
    includeRegistry: true,
  });
  const channelInfo = resolveEffectiveUpdateChannel({
    configChannel,
    installKind: update.installKind,
    git: update.git ? { tag: update.git.tag, branch: update.git.branch } : undefined,
  });
  const channelLabel = formatUpdateChannelLabel({
    channel: channelInfo.channel,
    source: channelInfo.source,
    gitTag: update.git?.tag ?? null,
    gitBranch: update.git?.branch ?? null,
  });
  const gitLabel =
    update.installKind === "git"
      ? formatGitStatusLine({
          branch: update.git?.branch ?? null,
          tag: update.git?.tag ?? null,
          sha: update.git?.sha ?? null,
        })
      : null;
  const updateAvailability = resolveUpdateAvailability(update);
  const updateLine = formatUpdateOneLiner(update).replace(/^Update:\s*/i, "");

  if (opts.json) {
    defaultRuntime.log(
      JSON.stringify(
        {
          update,
          channel: {
            value: channelInfo.channel,
            source: channelInfo.source,
            label: channelLabel,
            config: configChannel,
          },
          availability: updateAvailability,
        },
        null,
        2,
      ),
    );
    return;
  }

  const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
  const installLabel =
    update.installKind === "git"
      ? `git (${update.root ?? "desconhecido"})`
      : update.installKind === "package"
        ? update.packageManager
        : "desconhecido";
  const rows = [
    { Item: "Instalação", Value: installLabel },
    { Item: "Canal", Value: channelLabel },
    ...(gitLabel ? [{ Item: "Git", Value: gitLabel }] : []),
    {
      Item: "Atualização",
      Value: updateAvailability.available ? theme.warn(`disponível · ${updateLine}`) : updateLine,
    },
  ];

  defaultRuntime.log(theme.heading("Status de atualização do ZERO"));
  defaultRuntime.log("");
  defaultRuntime.log(
    renderTable({
      width: tableWidth,
      columns: [
        { key: "Item", header: "Item", minWidth: 10 },
        { key: "Value", header: "Value", flex: true, minWidth: 24 },
      ],
      rows,
    }).trimEnd(),
  );
  defaultRuntime.log("");
  const updateHint = formatUpdateAvailableHint(update);
  if (updateHint) {
    defaultRuntime.log(theme.warn(updateHint));
  }
}

function getStepLabel(step: UpdateStepInfo): string {
  return STEP_LABELS[step.name] ?? step.name;
}

type ProgressController = {
  progress: UpdateStepProgress;
  stop: () => void;
};

function createUpdateProgress(enabled: boolean): ProgressController {
  if (!enabled) {
    return {
      progress: {},
      stop: () => {},
    };
  }

  let currentSpinner: ReturnType<typeof spinner> | null = null;

  const progress: UpdateStepProgress = {
    onStepStart: (step) => {
      currentSpinner = spinner();
      currentSpinner.start(theme.accent(getStepLabel(step)));
    },
    onStepComplete: (step) => {
      if (!currentSpinner) return;

      const label = getStepLabel(step);
      const duration = theme.muted(`(${formatDuration(step.durationMs)})`);
      const icon = step.exitCode === 0 ? theme.success("\u2713") : theme.error("\u2717");

      currentSpinner.stop(`${icon} ${label} ${duration}`);
      currentSpinner = null;

      if (step.exitCode !== 0 && step.stderrTail) {
        const lines = step.stderrTail.split("\n").slice(-10);
        for (const line of lines) {
          if (line.trim()) {
            defaultRuntime.log(`    ${theme.error(line)}`);
          }
        }
      }
    },
  };

  return {
    progress,
    stop: () => {
      if (currentSpinner) {
        currentSpinner.stop();
        currentSpinner = null;
      }
    },
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

function formatStepStatus(exitCode: number | null): string {
  if (exitCode === 0) return theme.success("\u2713");
  if (exitCode === null) return theme.warn("?");
  return theme.error("\u2717");
}

const selectStyled = <T>(params: Parameters<typeof select<T>>[0]) =>
  select({
    ...params,
    message: stylePromptMessage(params.message),
    options: params.options.map((opt) =>
      opt.hint === undefined ? opt : { ...opt, hint: stylePromptHint(opt.hint) },
    ),
  });

type PrintResultOptions = UpdateCommandOptions & {
  hideSteps?: boolean;
};

function printResult(result: UpdateRunResult, opts: PrintResultOptions) {
  if (opts.json) {
    defaultRuntime.log(JSON.stringify(result, null, 2));
    return;
  }

  const statusColor =
    result.status === "ok" ? theme.success : result.status === "skipped" ? theme.warn : theme.error;

  defaultRuntime.log("");
  defaultRuntime.log(
    `${theme.heading("Resultado da Atualização:")} ${statusColor(result.status === "ok" ? "OK" : result.status === "skipped" ? "PULADO" : "ERRO")}`,
  );
  if (result.root) {
    defaultRuntime.log(`  Raiz: ${theme.muted(result.root)}`);
  }
  if (result.reason) {
    defaultRuntime.log(
      `  Motivo: ${theme.muted(result.reason === "dirty" ? "diretório sujo" : result.reason)}`,
    );
  }

  if (result.before?.version || result.before?.sha) {
    const before = result.before.version ?? result.before.sha?.slice(0, 8) ?? "";
    defaultRuntime.log(`  Antes: ${theme.muted(before)}`);
  }
  if (result.after?.version || result.after?.sha) {
    const after = result.after.version ?? result.after.sha?.slice(0, 8) ?? "";
    defaultRuntime.log(`  Depois: ${theme.muted(after)}`);
  }

  if (!opts.hideSteps && result.steps.length > 0) {
    defaultRuntime.log("");
    defaultRuntime.log(theme.heading("Passos:"));
    for (const step of result.steps) {
      const status = formatStepStatus(step.exitCode);
      const duration = theme.muted(`(${formatDuration(step.durationMs)})`);
      defaultRuntime.log(`  ${status} ${step.name} ${duration}`);

      if (step.exitCode !== 0 && step.stderrTail) {
        const lines = step.stderrTail.split("\n").slice(0, 5);
        for (const line of lines) {
          if (line.trim()) {
            defaultRuntime.log(`      ${theme.error(line)}`);
          }
        }
      }
    }
  }

  defaultRuntime.log("");
  defaultRuntime.log(`Tempo total: ${theme.muted(formatDuration(result.durationMs))}`);
}

export async function updateCommand(opts: UpdateCommandOptions): Promise<void> {
  process.noDeprecation = true;
  process.env.NODE_NO_WARNINGS = "1";
  const timeoutMs = opts.timeout ? Number.parseInt(opts.timeout, 10) * 1000 : undefined;
  const shouldRestart = opts.restart !== false;

  if (timeoutMs !== undefined && (Number.isNaN(timeoutMs) || timeoutMs <= 0)) {
    defaultRuntime.error("--timeout deve ser um número inteiro positivo (segundos)");
    defaultRuntime.exit(1);
    return;
  }

  const root =
    (await resolveZEROPackageRoot({
      moduleUrl: import.meta.url,
      argv1: process.argv[1],
      cwd: process.cwd(),
    })) ?? process.cwd();

  const updateStatus = await checkUpdateStatus({
    root,
    timeoutMs: timeoutMs ?? 3500,
    fetchGit: false,
    includeRegistry: false,
  });

  const configSnapshot = await readConfigFileSnapshot();
  let activeConfig = configSnapshot.valid ? configSnapshot.config : null;
  const storedChannel = configSnapshot.valid
    ? normalizeUpdateChannel(configSnapshot.config.update?.channel)
    : null;

  const requestedChannel = normalizeUpdateChannel(opts.channel);
  if (opts.channel && !requestedChannel) {
    defaultRuntime.error(
      `--channel deve ser "stable", "beta", ou "dev" (recebido "${opts.channel}")`,
    );
    defaultRuntime.exit(1);
    return;
  }
  if (opts.channel && !configSnapshot.valid) {
    const issues = configSnapshot.issues.map((issue) => `- ${issue.path}: ${issue.message}`);
    defaultRuntime.error(
      ["Configuração é inválida; não é possível definir o canal de atualização.", ...issues].join(
        "\n",
      ),
    );
    defaultRuntime.exit(1);
    return;
  }

  const installKind = updateStatus.installKind;
  const switchToGit = requestedChannel === "dev" && installKind !== "git";
  const switchToPackage =
    requestedChannel !== null && requestedChannel !== "dev" && installKind === "git";
  const updateInstallKind = switchToGit ? "git" : switchToPackage ? "package" : installKind;
  const defaultChannel =
    updateInstallKind === "git" ? DEFAULT_GIT_CHANNEL : DEFAULT_PACKAGE_CHANNEL;
  const channel = requestedChannel ?? storedChannel ?? defaultChannel;
  const explicitTag = normalizeTag(opts.tag);
  let tag = explicitTag ?? channelToNpmTag(channel);
  if (updateInstallKind !== "git") {
    const currentVersion = switchToPackage ? null : await readPackageVersion(root);
    let fallbackToLatest = false;
    const targetVersion = explicitTag
      ? await resolveTargetVersion(tag, timeoutMs)
      : await resolveNpmChannelTag({ channel, timeoutMs }).then((resolved) => {
          tag = resolved.tag;
          fallbackToLatest = channel === "beta" && resolved.tag === "latest";
          return resolved.version;
        });
    const cmp =
      currentVersion && targetVersion ? compareSemverStrings(currentVersion, targetVersion) : null;
    const needsConfirm =
      !fallbackToLatest &&
      currentVersion != null &&
      (targetVersion == null || (cmp != null && cmp > 0));

    if (needsConfirm && !opts.yes) {
      if (!process.stdin.isTTY || opts.json) {
        defaultRuntime.error(
          [
            "Confirmação de downgrade obrigatória.",
            "Fazer downgrade pode quebrar a configuração. Execute novamente em um TTY para confirmar.",
          ].join("\n"),
        );
        defaultRuntime.exit(1);
        return;
      }

      const targetLabel = targetVersion ?? `${tag} (desconhecido)`;
      const message = `Fazer downgrade de ${currentVersion} para ${targetLabel} pode quebrar a configuração. Continuar?`;
      const ok = await confirm({
        message: stylePromptMessage(message),
        initialValue: false,
      });
      if (isCancel(ok) || ok === false) {
        if (!opts.json) {
          defaultRuntime.log(theme.muted("Atualização cancelada."));
        }
        defaultRuntime.exit(0);
        return;
      }
    }
  } else if (opts.tag && !opts.json) {
    defaultRuntime.log(
      theme.muted("Nota: --tag aplica-se apenas a instalações npm; atualizações git o ignoram."),
    );
  }

  if (requestedChannel && configSnapshot.valid) {
    const next = {
      ...configSnapshot.config,
      update: {
        ...configSnapshot.config.update,
        channel: requestedChannel,
      },
    };
    await writeConfigFile(next);
    activeConfig = next;
    if (!opts.json) {
      defaultRuntime.log(theme.muted(`Canal de atualização definido para ${requestedChannel}.`));
    }
  }

  const showProgress = !opts.json && process.stdout.isTTY;

  if (!opts.json) {
    defaultRuntime.log(theme.heading("Atualizando ZERO..."));
    defaultRuntime.log("");
  }

  const { progress, stop } = createUpdateProgress(showProgress);

  const startedAt = Date.now();
  let result: UpdateRunResult;

  if (switchToPackage) {
    const manager = await resolveGlobalManager({
      root,
      installKind,
      timeoutMs: timeoutMs ?? 20 * 60_000,
    });
    const runCommand = async (argv: string[], options: { timeoutMs: number }) => {
      const res = await runCommandWithTimeout(argv, options);
      return { stdout: res.stdout, stderr: res.stderr, code: res.code };
    };
    const pkgRoot = await resolveGlobalPackageRoot(manager, runCommand, timeoutMs ?? 20 * 60_000);
    const beforeVersion = pkgRoot ? await readPackageVersion(pkgRoot) : null;
    const updateStep = await runUpdateStep({
      name: "global update",
      argv: globalInstallArgs(manager, `zero@${tag}`),
      timeoutMs: timeoutMs ?? 20 * 60_000,
      progress,
    });
    const steps = [updateStep];
    let afterVersion = beforeVersion;
    if (pkgRoot) {
      afterVersion = await readPackageVersion(pkgRoot);
      const entryPath = path.join(pkgRoot, "dist", "entry.js");
      if (await pathExists(entryPath)) {
        const doctorStep = await runUpdateStep({
          name: "zero doctor",
          argv: [resolveNodeRunner(), entryPath, "doctor", "--non-interactive"],
          timeoutMs: timeoutMs ?? 20 * 60_000,
          progress,
        });
        steps.push(doctorStep);
      }
    }
    const failedStep = steps.find((step) => step.exitCode !== 0);
    result = {
      status: failedStep ? "error" : "ok",
      mode: manager,
      root: pkgRoot ?? root,
      reason: failedStep ? failedStep.name : undefined,
      before: { version: beforeVersion },
      after: { version: afterVersion },
      steps,
      durationMs: Date.now() - startedAt,
    };
  } else {
    const updateRoot = switchToGit ? resolveGitInstallDir() : root;
    const cloneStep = switchToGit
      ? await ensureGitCheckout({
          dir: updateRoot,
          timeoutMs: timeoutMs ?? 20 * 60_000,
          progress,
        })
      : null;
    if (cloneStep && cloneStep.exitCode !== 0) {
      result = {
        status: "error",
        mode: "git",
        root: updateRoot,
        reason: cloneStep.name,
        steps: [cloneStep],
        durationMs: Date.now() - startedAt,
      };
      stop();
      printResult(result, { ...opts, hideSteps: showProgress });
      defaultRuntime.exit(1);
      return;
    }
    const updateResult = await runGatewayUpdate({
      cwd: updateRoot,
      argv1: switchToGit ? undefined : process.argv[1],
      timeoutMs,
      progress,
      channel,
      tag,
    });
    const steps = [...(cloneStep ? [cloneStep] : []), ...updateResult.steps];
    if (switchToGit && updateResult.status === "ok") {
      const manager = await resolveGlobalManager({
        root,
        installKind,
        timeoutMs: timeoutMs ?? 20 * 60_000,
      });
      const installStep = await runUpdateStep({
        name: "global install",
        argv: globalInstallArgs(manager, updateRoot),
        cwd: updateRoot,
        timeoutMs: timeoutMs ?? 20 * 60_000,
        progress,
      });
      steps.push(installStep);
      const failedStep = [installStep].find((step) => step.exitCode !== 0);
      result = {
        ...updateResult,
        status: updateResult.status === "ok" && !failedStep ? "ok" : "error",
        steps,
        durationMs: Date.now() - startedAt,
      };
    } else {
      result = {
        ...updateResult,
        steps,
        durationMs: Date.now() - startedAt,
      };
    }
  }

  stop();

  printResult(result, { ...opts, hideSteps: showProgress });

  if (result.status === "error") {
    defaultRuntime.exit(1);
    return;
  }

  if (result.status === "skipped") {
    if (result.reason === "dirty") {
      defaultRuntime.log(
        theme.warn(
          "Pulado: o diretório de trabalho tem alterações não commitadas. Faça o commit ou stash delas primeiro.",
        ),
      );
    }
    if (result.reason === "not-git-install") {
      defaultRuntime.log(
        theme.warn(
          `Pulado: esta instalação do ZERO não é um checkout git, e o gerenciador de pacotes não pôde ser detectado. Atualize via seu gerenciador de pacotes, então execute \`${formatCliCommand("zero doctor")}\` e \`${formatCliCommand("zero gateway restart")}\`.`,
        ),
      );
      defaultRuntime.log(
        theme.muted("Exemplos: `npm i -g zero@latest` ou `pnpm add -g zero@latest`"),
      );
    }
    defaultRuntime.exit(0);
    return;
  }

  if (activeConfig) {
    const pluginLogger = opts.json
      ? {}
      : {
          info: (msg: string) => defaultRuntime.log(msg),
          warn: (msg: string) => defaultRuntime.log(theme.warn(msg)),
          error: (msg: string) => defaultRuntime.log(theme.error(msg)),
        };

    if (!opts.json) {
      defaultRuntime.log("");
      defaultRuntime.log(theme.heading("Atualizando plugins..."));
    }

    const syncResult = await syncPluginsForUpdateChannel({
      config: activeConfig,
      channel,
      workspaceDir: root,
      logger: pluginLogger,
    });
    let pluginConfig = syncResult.config;

    const npmResult = await updateNpmInstalledPlugins({
      config: pluginConfig,
      skipIds: new Set(syncResult.summary.switchedToNpm),
      logger: pluginLogger,
    });
    pluginConfig = npmResult.config;

    if (syncResult.changed || npmResult.changed) {
      await writeConfigFile(pluginConfig);
    }

    if (!opts.json) {
      const summarizeList = (list: string[]) => {
        if (list.length <= 6) return list.join(", ");
        return `${list.slice(0, 6).join(", ")} +${list.length - 6} mais`;
      };

      if (syncResult.summary.switchedToBundled.length > 0) {
        defaultRuntime.log(
          theme.muted(
            `Mudou para plugins embutidos (bundled): ${summarizeList(syncResult.summary.switchedToBundled)}.`,
          ),
        );
      }
      if (syncResult.summary.switchedToNpm.length > 0) {
        defaultRuntime.log(
          theme.muted(
            `Plugins npm restaurados: ${summarizeList(syncResult.summary.switchedToNpm)}.`,
          ),
        );
      }
      for (const warning of syncResult.summary.warnings) {
        defaultRuntime.log(theme.warn(warning));
      }
      for (const error of syncResult.summary.errors) {
        defaultRuntime.log(theme.error(error));
      }

      const updated = npmResult.outcomes.filter((entry) => entry.status === "updated").length;
      const unchanged = npmResult.outcomes.filter((entry) => entry.status === "unchanged").length;
      const failed = npmResult.outcomes.filter((entry) => entry.status === "error").length;
      const skipped = npmResult.outcomes.filter((entry) => entry.status === "skipped").length;

      if (npmResult.outcomes.length === 0) {
        defaultRuntime.log(theme.muted("Nenhuma atualização de plugin necessária."));
      } else {
        const parts = [`${updated} atualizados`, `${unchanged} inalterados`];
        if (failed > 0) parts.push(`${failed} falharam`);
        if (skipped > 0) parts.push(`${skipped} pulados`);
        defaultRuntime.log(theme.muted(`plugins npm: ${parts.join(", ")}.`));
      }

      for (const outcome of npmResult.outcomes) {
        if (outcome.status !== "error") continue;
        defaultRuntime.log(theme.error(outcome.message));
      }
    }
  } else if (!opts.json) {
    defaultRuntime.log(theme.warn("Pulando atualizações de plugins: a configuração é inválida."));
  }

  // Restart service if requested
  if (shouldRestart) {
    if (!opts.json) {
      defaultRuntime.log("");
      defaultRuntime.log(theme.heading("Reiniciando o serviço..."));
    }
    try {
      const { runDaemonRestart } = await import("./daemon-cli.js");
      const restarted = await runDaemonRestart();
      if (!opts.json && restarted) {
        defaultRuntime.log(theme.success("Daemon reiniciado com sucesso."));
        defaultRuntime.log("");
        process.env.ZERO_UPDATE_IN_PROGRESS = "1";
        try {
          const { doctorCommand } = await import("../commands/doctor.js");
          const interactiveDoctor = Boolean(process.stdin.isTTY) && !opts.json && opts.yes !== true;
          await doctorCommand(defaultRuntime, { nonInteractive: !interactiveDoctor });
        } catch (err) {
          defaultRuntime.log(theme.warn(`Doctor falhou: ${String(err)}`));
        } finally {
          delete process.env.ZERO_UPDATE_IN_PROGRESS;
        }
      }
    } catch (err) {
      if (!opts.json) {
        defaultRuntime.log(theme.warn(`Reinício do Daemon falhou: ${String(err)}`));
        defaultRuntime.log(
          theme.muted(
            `Pode ser necessário reiniciar o serviço manualmente: ${formatCliCommand("zero gateway restart")}`,
          ),
        );
      }
    }
  } else if (!opts.json) {
    defaultRuntime.log("");
    if (result.mode === "npm" || result.mode === "pnpm") {
      defaultRuntime.log(
        theme.muted(
          `Dica: Execute \`${formatCliCommand("zero doctor")}\`, depois \`${formatCliCommand("zero gateway restart")}\` para aplicar atualizações a um gateway em execução.`,
        ),
      );
    } else {
      defaultRuntime.log(
        theme.muted(
          `Dica: Execute \`${formatCliCommand("zero gateway restart")}\` para aplicar atualizações a um gateway em execução.`,
        ),
      );
    }
  }

  if (!opts.json) {
    defaultRuntime.log(theme.muted(pickUpdateQuip()));
  }
}

export async function updateWizardCommand(opts: UpdateWizardOptions = {}): Promise<void> {
  if (!process.stdin.isTTY) {
    defaultRuntime.error(
      "O assistente de atualização requer um TTY. Use `zero update --channel <stable|beta|dev>` em vez disso.",
    );
    defaultRuntime.exit(1);
    return;
  }

  const timeoutMs = opts.timeout ? Number.parseInt(opts.timeout, 10) * 1000 : undefined;
  if (timeoutMs !== undefined && (Number.isNaN(timeoutMs) || timeoutMs <= 0)) {
    defaultRuntime.error("--timeout deve ser um número inteiro positivo (segundos)");
    defaultRuntime.exit(1);
    return;
  }

  const root =
    (await resolveZEROPackageRoot({
      moduleUrl: import.meta.url,
      argv1: process.argv[1],
      cwd: process.cwd(),
    })) ?? process.cwd();

  const [updateStatus, configSnapshot] = await Promise.all([
    checkUpdateStatus({
      root,
      timeoutMs: timeoutMs ?? 3500,
      fetchGit: false,
      includeRegistry: false,
    }),
    readConfigFileSnapshot(),
  ]);

  const configChannel = configSnapshot.valid
    ? normalizeUpdateChannel(configSnapshot.config.update?.channel)
    : null;
  const channelInfo = resolveEffectiveUpdateChannel({
    configChannel,
    installKind: updateStatus.installKind,
    git: updateStatus.git
      ? { tag: updateStatus.git.tag, branch: updateStatus.git.branch }
      : undefined,
  });
  const channelLabel = formatUpdateChannelLabel({
    channel: channelInfo.channel,
    source: channelInfo.source,
    gitTag: updateStatus.git?.tag ?? null,
    gitBranch: updateStatus.git?.branch ?? null,
  });

  const pickedChannel = await selectStyled({
    message: "Canal de atualização",
    options: [
      {
        value: "keep",
        label: `Manter atual (${channelInfo.channel})`,
        hint: channelLabel,
      },
      {
        value: "stable",
        label: "Estável (Stable)",
        hint: "Versões marcadas (npm latest)",
      },
      {
        value: "beta",
        label: "Beta",
        hint: "Pré-lançamentos (npm beta)",
      },
      {
        value: "dev",
        label: "Desenvolvimento (Dev)",
        hint: "Git main",
      },
    ],
    initialValue: "keep",
  });

  if (isCancel(pickedChannel)) {
    defaultRuntime.log(theme.muted("Atualização cancelada."));
    defaultRuntime.exit(0);
    return;
  }

  const requestedChannel = pickedChannel === "keep" ? null : pickedChannel;

  if (requestedChannel === "dev" && updateStatus.installKind !== "git") {
    const gitDir = resolveGitInstallDir();
    const hasGit = await isGitCheckout(gitDir);
    if (!hasGit) {
      const dirExists = await pathExists(gitDir);
      if (dirExists) {
        const empty = await isEmptyDir(gitDir);
        if (!empty) {
          defaultRuntime.error(
            `ZERO_GIT_DIR aponta para um diretório que não é git: ${gitDir}. Defina ZERO_GIT_DIR para uma pasta vazia ou um checkout do zero.`,
          );
          defaultRuntime.exit(1);
          return;
        }
      }
      const ok = await confirm({
        message: stylePromptMessage(
          `Criar um checkout git em ${gitDir}? (sobrescreva via ZERO_GIT_DIR)`,
        ),
        initialValue: true,
      });
      if (isCancel(ok) || ok === false) {
        defaultRuntime.log(theme.muted("Atualização cancelada."));
        defaultRuntime.exit(0);
        return;
      }
    }
  }

  const restart = await confirm({
    message: stylePromptMessage("Reiniciar o serviço gateway após a atualização?"),
    initialValue: true,
  });
  if (isCancel(restart)) {
    defaultRuntime.log(theme.muted("Atualização cancelada."));
    defaultRuntime.exit(0);
    return;
  }

  try {
    await updateCommand({
      channel: requestedChannel ?? undefined,
      restart: Boolean(restart),
      timeout: opts.timeout,
    });
  } catch (err) {
    defaultRuntime.error(String(err));
    defaultRuntime.exit(1);
  }
}

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
