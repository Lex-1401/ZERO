
import { confirm, isCancel } from "@clack/prompts";
import { readConfigFileSnapshot } from "../../config/config.js";
import { resolveZEROPackageRoot } from "../../infra/zero-root.js";
import { checkUpdateStatus } from "../../infra/update-check.js";
import {
    formatUpdateChannelLabel,
    normalizeUpdateChannel,
    resolveEffectiveUpdateChannel,
} from "../../infra/update-channels.js";
import { defaultRuntime } from "../../runtime.js";
import { theme } from "../../terminal/theme.js";
import { stylePromptMessage } from "../../terminal/prompt-style.js";
import { UpdateWizardOptions } from "./types.js";
import {
    isGitCheckout,
    pathExists,
    isEmptyDir,
    resolveGitInstallDir,
    selectStyled,
} from "./utils.js";
import { updateCommand } from "./command-main.js";

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
