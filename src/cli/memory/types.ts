
export interface MemoryCommandOptions {
    agent?: string;
    json?: boolean;
    deep?: boolean;
    index?: boolean;
    verbose?: boolean;
}

export interface SourceScan {
    source: string;
    totalFiles: number | null;
    issues: string[];
}

export interface MemorySourceScan {
    sources: SourceScan[];
    totalFiles: number | null;
    issues: string[];
}
