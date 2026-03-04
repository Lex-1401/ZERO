
import path from "node:path";
import { resolveStateDir } from "../../config/paths.js";
import { type DevicePairingStateFile, type DevicePairingPendingRequest } from "./types.js";
import { readJSON, writeJSONAtomic } from "./utils.js";

const PENDING_TTL_MS = 5 * 60 * 1000;

export function resolvePaths(baseDir?: string) {
    const root = baseDir || resolveStateDir();
    return {
        stateFile: path.join(root, "device_pairing.json"),
    };
}

export function pruneExpiredPending(pendingById: Record<string, DevicePairingPendingRequest>, nowMs: number) {
    for (const [id, req] of Object.entries(pendingById)) {
        if (nowMs - req.ts > PENDING_TTL_MS) {
            delete pendingById[id];
        }
    }
}

let lock: Promise<void> = Promise.resolve();

export async function withLock<T>(fn: () => Promise<T>): Promise<T> {
    const currentLock = lock;
    let resolveLock!: () => void;
    lock = new Promise((resolve) => { resolveLock = resolve; });
    try {
        await currentLock;
        return await fn();
    } finally {
        resolveLock();
    }
}

export async function loadState(baseDir?: string): Promise<DevicePairingStateFile> {
    const paths = resolvePaths(baseDir);
    const data = await readJSON<DevicePairingStateFile>(paths.stateFile);
    const state = data || { pendingById: {}, pairedByDeviceId: {} };
    pruneExpiredPending(state.pendingById, Date.now());
    return state;
}

export async function persistState(state: DevicePairingStateFile, baseDir?: string) {
    const paths = resolvePaths(baseDir);
    await writeJSONAtomic(paths.stateFile, state);
}
