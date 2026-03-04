
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { type BrowserExecutable } from "./types.js";

export function exists(filePath: string) {
    try {
        return fs.existsSync(filePath);
    } catch {
        return false;
    }
}

export function execText(
    command: string,
    args: string[],
    timeoutMs = 1200,
    maxBuffer = 1024 * 1024,
): string | null {
    try {
        const output = execFileSync(command, args, {
            timeout: timeoutMs,
            encoding: "utf8",
            maxBuffer,
        });
        return String(output ?? "").trim() || null;
    } catch {
        return null;
    }
}

export function inferKindFromIdentifier(identifier: string): BrowserExecutable["kind"] {
    const id = identifier.toLowerCase();
    if (id.includes("brave")) return "brave";
    if (id.includes("edge")) return "edge";
    if (id.includes("chromium")) return "chromium";
    if (id.includes("canary")) return "canary";
    if (
        id.includes("opera") ||
        id.includes("vivaldi") ||
        id.includes("yandex") ||
        id.includes("thebrowser")
    ) {
        return "chromium";
    }
    return "chrome";
}

export function inferKindFromExecutableName(name: string): BrowserExecutable["kind"] {
    const lower = name.toLowerCase();
    if (lower.includes("brave")) return "brave";
    if (lower.includes("edge") || lower.includes("msedge")) return "edge";
    if (lower.includes("chromium")) return "chromium";
    if (lower.includes("canary") || lower.includes("sxs")) return "canary";
    if (lower.includes("opera") || lower.includes("vivaldi") || lower.includes("yandex"))
        return "chromium";
    return "chrome";
}

export function findFirstExecutable(candidates: Array<BrowserExecutable>): BrowserExecutable | null {
    for (const candidate of candidates) {
        if (exists(candidate.path)) return candidate;
    }
    return null;
}
