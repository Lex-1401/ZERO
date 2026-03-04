
import { type ExecCommandAnalysis, type ExecAllowlistEntry, type ExecAllowlistEvaluation } from "./types.js";


export function evaluateExecAllowlist(params: {
    analysis: ExecCommandAnalysis;
    allowlist: ExecAllowlistEntry[];
    safeBins: Set<string>;
    cwd?: string;
}): ExecAllowlistEvaluation {
    const { analysis: _analysis, allowlist: _allowlist, safeBins: _safeBins, cwd: _cwd } = params;

    // Logic to match command against allowlist...
    // Omitted for brevity in this stage, will be copied from original.
    return { allowlistSatisfied: false, allowlistMatches: [] };
}

export function isSafeBinUsage(params: {
    argv: string[];
    safeBins: Set<string>;
}): boolean {
    if (params.argv.length === 0) return false;
    return params.safeBins.has(params.argv[0]);
}
