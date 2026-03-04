
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { type DeviceAuthToken, type DeviceAuthTokenSummary } from "./types.js";

export async function readJSON<T>(filePath: string): Promise<T | null> {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        return JSON.parse(content) as T;
    } catch {
        return null;
    }
}

export async function writeJSONAtomic(filePath: string, value: unknown) {
    const tempPath = `${filePath}.${randomUUID()}.tmp`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tempPath, JSON.stringify(value, null, 2), "utf-8");
    await fs.rename(tempPath, filePath);
}

export function normalizeDeviceId(deviceId: string) {
    return deviceId.trim().toLowerCase();
}

export function normalizeRole(role: string | undefined): string | null {
    const t = role?.trim();
    return t ? t.toLowerCase() : null;
}

export function mergeRoles(...items: Array<string | string[] | undefined>): string[] | undefined {
    const set = new Set<string>();
    for (const item of items) {
        if (!item) continue;
        if (Array.isArray(item)) {
            for (const r of item) {
                const nr = normalizeRole(r);
                if (nr) set.add(nr);
            }
        } else {
            const nr = normalizeRole(item as string);
            if (nr) set.add(nr);
        }
    }
    return set.size > 0 ? Array.from(set).sort() : undefined;
}

export function mergeScopes(...items: Array<string[] | undefined>): string[] | undefined {
    const set = new Set<string>();
    for (const item of items) {
        if (!item) continue;
        for (const s of item) {
            const ts = s.trim().toLowerCase();
            if (ts) set.add(ts);
        }
    }
    return set.size > 0 ? Array.from(set).sort() : undefined;
}

export function normalizeScopes(scopes: string[] | undefined): string[] {
    if (!scopes) return [];
    return Array.from(new Set(scopes.map((s) => s.trim().toLowerCase()).filter(Boolean))).sort();
}

export function scopesAllow(requested: string[], allowed: string[]): boolean {
    if (allowed.includes("*")) return true;
    return requested.every((r) => allowed.includes(r));
}

export function newToken() {
    return randomUUID().replace(/-/g, "");
}

export function summarizeDeviceTokens(tokens: Record<string, DeviceAuthToken> | undefined): DeviceAuthTokenSummary[] | undefined {
    if (!tokens) return undefined;
    return Object.values(tokens).map((t) => ({
        role: t.role,
        scopes: t.scopes,
        createdAtMs: t.createdAtMs,
        rotatedAtMs: t.rotatedAtMs,
        revokedAtMs: t.revokedAtMs,
        lastUsedAtMs: t.lastUsedAtMs,
    }));
}
