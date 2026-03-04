
import { spinner } from "@clack/prompts";
import { type UpdateStepInfo, type UpdateStepProgress } from "../../infra/update/types.js";
import { defaultRuntime } from "../../runtime.js";
import { theme } from "../../terminal/theme.js";
import { STEP_LABELS } from "./constants.js";
import { formatDuration } from "./utils.js";

export function getStepLabel(step: UpdateStepInfo): string {
    return STEP_LABELS[step.name] ?? step.name;
}

export type ProgressController = {
    progress: UpdateStepProgress;
    stop: () => void;
};

export function createUpdateProgress(enabled: boolean): ProgressController {
    if (!enabled) {
        return {
            progress: {},
            stop: () => { },
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
            const duration = theme.muted(`(${formatDuration(step.durationMs ?? 0)})`);
            const icon = step.exitCode === 0 ? theme.success("✓") : theme.error("✗");

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
