
import path from "node:path";
import { CHROMIUM_EXE_NAMES } from "./constants.js";
import { type BrowserExecutable } from "./types.js";
import { execText, exists, findFirstExecutable, inferKindFromExecutableName } from "./utils.js";

export function readWindowsProgId(): string | null {
    const output = execText("reg", [
        "query",
        "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice",
        "/v",
        "ProgId",
    ]);
    if (!output) return null;
    const match = output.match(/ProgId\s+REG_\w+\s+(.+)$/im);
    return match?.[1]?.trim() || null;
}

export function readWindowsCommandForProgId(progId: string): string | null {
    const key =
        progId === "http"
            ? "HKCR\\http\\shell\\open\\command"
            : `HKCR\\${progId}\\shell\\open\\command`;
    const output = execText("reg", ["query", key, "/ve"]);
    if (!output) return null;
    const match = output.match(/REG_\w+\s+(.+)$/im);
    return match?.[1]?.trim() || null;
}

export function expandWindowsEnvVars(value: string): string {
    return value.replace(/%([^%]+)%/g, (_match, name) => {
        const key = String(name ?? "").trim();
        return key ? (process.env[key] ?? `%${key}%`) : _match;
    });
}

export function extractWindowsExecutablePath(command: string): string | null {
    const quoted = command.match(/"([^"]+\\.exe)"/i);
    if (quoted?.[1]) return quoted[1];
    const unquoted = command.match(/([^\\s]+\\.exe)/i);
    if (unquoted?.[1]) return unquoted[1];
    return null;
}

export function detectDefaultChromiumExecutableWindows(): BrowserExecutable | null {
    const progId = readWindowsProgId();
    const command =
        (progId ? readWindowsCommandForProgId(progId) : null) || readWindowsCommandForProgId("http");
    if (!command) return null;
    const expanded = expandWindowsEnvVars(command);
    const exePath = extractWindowsExecutablePath(expanded);
    if (!exePath) return null;
    if (!exists(exePath)) return null;
    const exeName = path.win32.basename(exePath).toLowerCase();
    if (!CHROMIUM_EXE_NAMES.has(exeName)) return null;
    return { kind: inferKindFromExecutableName(exeName), path: exePath };
}

export function findChromeExecutableWindows(): BrowserExecutable | null {
    const localAppData = process.env.LOCALAPPDATA ?? "";
    const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";

    const joinWin = path.win32.join;
    const candidates: Array<BrowserExecutable> = [];

    if (localAppData) {
        candidates.push({
            kind: "chrome",
            path: joinWin(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
        });
        candidates.push({
            kind: "brave",
            path: joinWin(localAppData, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
        });
        candidates.push({
            kind: "edge",
            path: joinWin(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
        });
        candidates.push({
            kind: "chromium",
            path: joinWin(localAppData, "Chromium", "Application", "chrome.exe"),
        });
        candidates.push({
            kind: "canary",
            path: joinWin(localAppData, "Google", "Chrome SxS", "Application", "chrome.exe"),
        });
    }

    candidates.push({
        kind: "chrome",
        path: joinWin(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    });
    candidates.push({
        kind: "chrome",
        path: joinWin(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    });
    candidates.push({
        kind: "brave",
        path: joinWin(programFiles, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
    });
    candidates.push({
        kind: "brave",
        path: joinWin(programFilesX86, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
    });
    candidates.push({
        kind: "edge",
        path: joinWin(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    });
    candidates.push({
        kind: "edge",
        path: joinWin(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
    });

    return findFirstExecutable(candidates);
}
