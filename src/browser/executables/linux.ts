
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CHROMIUM_DESKTOP_IDS, CHROMIUM_EXE_NAMES } from "./constants.js";
import { type BrowserExecutable } from "./types.js";
import { execText, exists, findFirstExecutable, inferKindFromExecutableName } from "./utils.js";

export function findDesktopFilePath(desktopId: string): string | null {
    const candidates = [
        path.join(os.homedir(), ".local", "share", "applications", desktopId),
        path.join("/usr/local/share/applications", desktopId),
        path.join("/usr/share/applications", desktopId),
        path.join("/var/lib/snapd/desktop/applications", desktopId),
    ];
    for (const candidate of candidates) {
        if (exists(candidate)) return candidate;
    }
    return null;
}

export function readDesktopExecLine(desktopPath: string): string | null {
    try {
        const raw = fs.readFileSync(desktopPath, "utf8");
        const lines = raw.split(/\r?\n/);
        for (const line of lines) {
            if (line.startsWith("Exec=")) {
                return line.slice("Exec=".length).trim();
            }
        }
    } catch {
        // ignore
    }
    return null;
}

export function splitExecLine(line: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = "";
    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if ((ch === '"' || ch === "'") && (!inQuotes || ch === quoteChar)) {
            if (inQuotes) {
                inQuotes = false;
                quoteChar = "";
            } else {
                inQuotes = true;
                quoteChar = ch;
            }
            continue;
        }
        if (!inQuotes && /\s/.test(ch)) {
            if (current) {
                tokens.push(current);
                current = "";
            }
            continue;
        }
        current += ch;
    }
    if (current) tokens.push(current);
    return tokens;
}

export function extractExecutableFromExecLine(execLine: string): string | null {
    const tokens = splitExecLine(execLine);
    for (const token of tokens) {
        if (!token) continue;
        if (token === "env") continue;
        if (token.includes("=") && !token.startsWith("/") && !token.includes("\\")) continue;
        return token.replace(/^["']|["']$/g, "");
    }
    return null;
}

export function resolveLinuxExecutablePath(command: string): string | null {
    const cleaned = command.trim().replace(/%[a-zA-Z]/g, "");
    if (!cleaned) return null;
    if (cleaned.startsWith("/")) return cleaned;
    const resolved = execText("which", [cleaned], 800);
    return resolved ? resolved.trim() : null;
}

export function detectDefaultChromiumExecutableLinux(): BrowserExecutable | null {
    const desktopId =
        execText("xdg-settings", ["get", "default-web-browser"]) ||
        execText("xdg-mime", ["query", "default", "x-scheme-handler/http"]);
    if (!desktopId) return null;
    const trimmed = desktopId.trim();
    if (!CHROMIUM_DESKTOP_IDS.has(trimmed)) return null;
    const desktopPath = findDesktopFilePath(trimmed);
    if (!desktopPath) return null;
    const execLine = readDesktopExecLine(desktopPath);
    if (!execLine) return null;
    const command = extractExecutableFromExecLine(execLine);
    if (!command) return null;
    const resolved = resolveLinuxExecutablePath(command);
    if (!resolved) return null;
    const exeName = path.posix.basename(resolved).toLowerCase();
    if (!CHROMIUM_EXE_NAMES.has(exeName)) return null;
    return { kind: inferKindFromExecutableName(exeName), path: resolved };
}

export function findChromeExecutableLinux(): BrowserExecutable | null {
    const candidates: Array<BrowserExecutable> = [
        { kind: "chrome", path: "/usr/bin/google-chrome" },
        { kind: "chrome", path: "/usr/bin/google-chrome-stable" },
        { kind: "chrome", path: "/usr/bin/chrome" },
        { kind: "brave", path: "/usr/bin/brave-browser" },
        { kind: "brave", path: "/usr/bin/brave-browser-stable" },
        { kind: "brave", path: "/usr/bin/brave" },
        { kind: "brave", path: "/snap/bin/brave" },
        { kind: "edge", path: "/usr/bin/microsoft-edge" },
        { kind: "edge", path: "/usr/bin/microsoft-edge-stable" },
        { kind: "chromium", path: "/usr/bin/chromium" },
        { kind: "chromium", path: "/usr/bin/chromium-browser" },
        { kind: "chromium", path: "/snap/bin/chromium" },
    ];

    return findFirstExecutable(candidates);
}
