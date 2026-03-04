
import { checkUpdateStatus } from "../../infra/update-check.js";
import {
    formatUpdateChannelLabel,
    normalizeUpdateChannel,
    resolveEffectiveUpdateChannel,
} from "../../infra/update-channels.js";
import { resolveZEROPackageRoot } from "../../infra/zero-root.js";
import { readConfigFileSnapshot } from "../../config/config.js";
import { defaultRuntime } from "../../runtime.js";
import { theme } from "../../terminal/theme.js";
import { renderTable } from "../../terminal/table.js";
import {
    formatUpdateAvailableHint,
    formatUpdateOneLiner,
    resolveUpdateAvailability,
} from "../../commands/status.update.js";
import { type UpdateStatusOptions } from "./types.js";

export function formatGitStatusLine(params: {
    branch: string | null;
    tag: string | null;
    sha: string | null;
}): string {
    const parts: string[] = [];
    if (params.branch) parts.push(theme.accent(params.branch));
    if (params.tag) parts.push(theme.success(params.tag));
    if (params.sha) parts.push(theme.muted(params.sha.slice(0, 7)));
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
