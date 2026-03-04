
import fs from "node:fs";
import path from "node:path";

export function resolveTranscriptPath(params: {
    sessionId: string;
    storePath: string | undefined;
    sessionFile?: string;
}): string | null {
    if (!params.storePath) return null;
    return path.join(params.storePath, params.sessionFile || `transcript-${params.sessionId}.jsonl`);
}

export function ensureTranscriptFile(params: { transcriptPath: string; sessionId: string }) {
    if (fs.existsSync(params.transcriptPath)) return { ok: true };
    try {
        fs.mkdirSync(path.dirname(params.transcriptPath), { recursive: true });
        fs.writeFileSync(params.transcriptPath, "");
        return { ok: true };
    } catch (err: any) {
        return { ok: false, error: err.message };
    }
}
