
export function severityLabel(sev: "critical" | "warn" | "info"): string {
    if (sev === "critical") return "CRITICAL";
    if (sev === "warn") return "WARNING";
    return "INFO";
}

export function fmtSummary(value: { critical: number; warn: number; info: number }): string {
    return `${value.critical} critical, ${value.warn} warnings, ${value.info} info`;
}
