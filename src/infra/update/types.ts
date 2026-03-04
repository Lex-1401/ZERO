
export interface UpdateStepResult {
    name: string;
    command: string;
    cwd: string;
    durationMs: number;
    exitCode: number | null;
    stdoutTail?: string | null;
    stderrTail?: string | null;
}

export interface UpdateStepInfo {
    name: string;
    command: string;
    index: number;
    total: number;
    durationMs?: number;
    exitCode?: number | null;
    stderrTail?: string | null;
}

export interface UpdateStepProgress {
    onStepStart?: (step: UpdateStepInfo) => void;
    onStepComplete?: (step: UpdateStepInfo) => void;
}

export interface UpdateRunResult {
    status: "ok" | "error" | "skipped";
    mode: "git" | "pnpm" | "bun" | "npm" | "unknown";
    root?: string;
    reason?: string;
    before?: { sha?: string | null; version?: string | null };
    after?: { sha?: string | null; version?: string | null };
    steps: UpdateStepResult[];
    durationMs: number;
}

export interface CommandRunner {
    stdout: string;
    stderr: string;
    code: number | null;
}

export interface UpdateRunnerOptions {
    force?: boolean;
    cwd?: string;
    argv1?: string;
    timeoutMs?: number;
    logger?: {
        info: (msg: string) => void;
        error: (msg: string) => void;
    };
}

