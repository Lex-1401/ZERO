
import {
    detectGlobalInstallManagerByPresence,
    detectGlobalInstallManagerForRoot,
    type GlobalInstallManager,
} from "../../infra/update-global.js";
import { runCommandWithTimeout } from "../../process/exec.js";
import { theme } from "../../terminal/theme.js";
import { defaultRuntime } from "../../runtime.js";
import { type UpdateRunResult, type UpdateCommandOptions } from "./types.js";
import { formatDuration } from "./utils.js";

export async function resolveGlobalManager(params: {
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

export function formatStepStatus(exitCode: number | null): string {
    if (exitCode === 0) return theme.success("✓");
    if (exitCode === null) return theme.warn("?");
    return theme.error("✗");
}

export type PrintResultOptions = UpdateCommandOptions & {
    hideSteps?: boolean;
};

export function printResult(result: UpdateRunResult, opts: PrintResultOptions) {
    if (opts.json) {
        defaultRuntime.log(JSON.stringify(result, null, 2));
        return;
    }

    if (!opts.hideSteps && result.steps.length > 0) {
        for (const step of result.steps) {
            const status = formatStepStatus(step.exitCode);
            const label = step.name;
            const duration = theme.muted(`(${formatDuration(step.durationMs)})`);
            defaultRuntime.log(`${status} ${label} ${duration}`);
        }
    }

    if (result.status === "error") {
        defaultRuntime.log("");
        defaultRuntime.error(`Erro na atualização no passo: ${result.reason}`);
        return;
    }

    if (result.status === "skipped") {
        return;
    }

    const from = result.before?.version ?? result.before?.sha?.slice(0, 7) ?? "desconhecido";
    const to = result.after?.version ?? result.after?.sha?.slice(0, 7) ?? "desconhecido";

    defaultRuntime.log("");
    defaultRuntime.log(`${theme.success("✓")} ZERO atualizado com sucesso: ${theme.muted(from)} → ${theme.accent(to)}`);
    defaultRuntime.log("");
    defaultRuntime.log(`Tempo total: ${theme.muted(formatDuration(result.durationMs))}`);
}
