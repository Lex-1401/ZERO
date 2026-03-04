import fsSync from "node:fs";
import { resolveExecApprovalsPath, resolveExecApprovalsSocketPath } from "../../config/paths.js";
export { resolveExecApprovalsSocketPath };
import { createHash } from "node:crypto";
import type { ExecApprovalsFile } from "./types.js";

function md5(str: string): string {
    return createHash("md5").update(str).digest("hex");
}

export function readExecApprovalsSnapshot() {
    const path = resolveExecApprovalsPath();
    let file: ExecApprovalsFile = { version: 1 };
    let exists = false;
    let hash = "";
    let rawStr: string | null = null;

    try {
        const raw = fsSync.readFileSync(path, "utf-8");
        exists = true;
        hash = md5(raw);
        file = JSON.parse(raw) as ExecApprovalsFile;
        rawStr = raw;
    } catch {
        file = { version: 1 };
    }

    return {
        path,
        exists,
        raw: rawStr,
        hash,
        file,
    };
}

export function saveExecApprovals(file: ExecApprovalsFile) {
    const path = resolveExecApprovalsPath();
    const raw = JSON.stringify(file, null, 2);
    fsSync.writeFileSync(path, raw, "utf-8");
}

export function ensureExecApprovals() {
    const snap = readExecApprovalsSnapshot();
    if (!snap.exists) {
        saveExecApprovals(snap.file);
        return readExecApprovalsSnapshot();
    }
    return snap;
}

export function normalizeExecApprovals(file: ExecApprovalsFile): ExecApprovalsFile {
    if (!file) return { version: 1 };
    if (!file.version) file.version = 1;
    return file;
}
