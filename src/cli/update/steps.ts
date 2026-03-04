
import { trimLogTail } from "../../infra/restart-sentinel.js";
import { runCommandWithTimeout } from "../../process/exec.js";
import { type UpdateStepProgress, type UpdateStepResult } from "../../infra/update/types.js";
import { MAX_LOG_CHARS, ZERO_REPO_URL } from "./constants.js";
import { pathExists, isGitCheckout, isEmptyDir, isZEROPackage } from "./utils.js";

export async function runUpdateStep(params: {
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

export async function ensureGitCheckout(params: {
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
