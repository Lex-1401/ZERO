// @ts-nocheck

import { confirm, isCancel } from "@clack/prompts";
import path from "node:path";
import { readConfigFileSnapshot, writeConfigFile } from "../../config/config.js";
import { resolveZEROPackageRoot } from "../../infra/zero-root.js";
import {
    checkUpdateStatus,
    compareSemverStrings,
    resolveNpmChannelTag,
} from "../../infra/update-check.js";
import {
    runGatewayUpdate,
    type UpdateRunResult,
} from "../../infra/update-runner.js";
import {
    globalInstallArgs,
    resolveGlobalPackageRoot,
} from "../../infra/update-global.js";
import {
    channelToNpmTag,
    DEFAULT_GIT_CHANNEL,
    DEFAULT_PACKAGE_CHANNEL,
    normalizeUpdateChannel,
} from "../../infra/update-channels.js";
import { runCommandWithTimeout } from "../../process/exec.js";
import { defaultRuntime } from "../../runtime.js";
import { theme } from "../../terminal/theme.js";
import { stylePromptMessage } from "../../terminal/prompt-style.js";
import { syncPluginsForUpdateChannel, updateNpmInstalledPlugins } from "../../plugins/update.js";
import { formatCliCommand } from "../command-format.js";
import { UpdateCommandOptions } from "./types.js";
import {
    normalizeTag,
    pickUpdateQuip,
    readPackageVersion,
    resolveTargetVersion,
    resolveGitInstallDir,
    pathExists,
    resolveNodeRunner,
} from "./utils.js";
import { runUpdateStep, ensureGitCheckout } from "./steps.js";
import { createUpdateProgress } from "./progress.js";
import { printResult, resolveGlobalManager } from "./command-helpers.js";

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
            const { runDaemonRestart } = await import("../daemon-cli.js");
            const restarted = await runDaemonRestart();
            if (!opts.json && restarted) {
                defaultRuntime.log(theme.success("Daemon reiniciado com sucesso."));
                defaultRuntime.log("");
                process.env.ZERO_UPDATE_IN_PROGRESS = "1";
                try {
                    const { doctorCommand } = await import("../../commands/doctor.js");
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
