export async function runSecurityAudit(_opts: unknown) {
    return {
        ts: Date.now(),
        summary: { critical: 0, warn: 0, info: 0 },
        findings: [] as any[],
    };
}
