
export interface HooksListOptions {
    json?: boolean;
    eligible?: boolean;
    verbose?: boolean;
}

export interface HookInfoOptions {
    json?: boolean;
}

export interface HooksCheckOptions {
    json?: boolean;
}

export interface HooksUpdateOptions {
    all?: boolean;
    dryRun?: boolean;
}

export interface HookStatusEntry {
    name: string;
    source: string;
    enabled: boolean;
    active: boolean;
    description?: string;
    missing?: string[];
}

export interface HookStatusReport {
    entries: HookStatusEntry[];
    summary: {
        total: number;
        enabled: number;
        active: number;
        error: number;
    };
}
