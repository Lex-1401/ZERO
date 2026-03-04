
import os from "node:os";
import path from "node:path";
import { CHROMIUM_BUNDLE_IDS } from "./constants.js";
import { type BrowserExecutable } from "./types.js";
import { execText, exists, findFirstExecutable, inferKindFromIdentifier } from "./utils.js";

export function detectDefaultBrowserBundleIdMac(): string | null {
    const plistPath = path.join(
        os.homedir(),
        "Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist",
    );
    if (!exists(plistPath)) return null;
    const handlersRaw = execText(
        "/usr/bin/plutil",
        ["-extract", "LSHandlers", "json", "-o", "-", "--", plistPath],
        2000,
        5 * 1024 * 1024,
    );
    if (!handlersRaw) return null;
    let handlers: unknown;
    try {
        handlers = JSON.parse(handlersRaw);
    } catch {
        return null;
    }
    if (!Array.isArray(handlers)) return null;

    const resolveScheme = (scheme: string) => {
        let candidate: string | null = null;
        for (const entry of handlers) {
            if (!entry || typeof entry !== "object") continue;
            const record = entry as Record<string, unknown>;
            if (record.LSHandlerURLScheme !== scheme) continue;
            const role =
                (typeof record.LSHandlerRoleAll === "string" && record.LSHandlerRoleAll) ||
                (typeof record.LSHandlerRoleViewer === "string" && record.LSHandlerRoleViewer) ||
                null;
            if (role) candidate = role;
        }
        return candidate;
    };

    return resolveScheme("http") ?? resolveScheme("https");
}

export function detectDefaultChromiumExecutableMac(): BrowserExecutable | null {
    const bundleId = detectDefaultBrowserBundleIdMac();
    if (!bundleId || !CHROMIUM_BUNDLE_IDS.has(bundleId)) return null;

    const appPathRaw = execText("/usr/bin/osascript", [
        "-e",
        `POSIX path of (path to application id "${bundleId}")`,
    ]);
    if (!appPathRaw) return null;
    const appPath = appPathRaw.trim().replace(/\/$/, "");
    const exeName = execText("/usr/bin/defaults", [
        "read",
        path.join(appPath, "Contents", "Info"),
        "CFBundleExecutable",
    ]);
    if (!exeName) return null;
    const exePath = path.join(appPath, "Contents", "MacOS", exeName.trim());
    if (!exists(exePath)) return null;
    return { kind: inferKindFromIdentifier(bundleId), path: exePath };
}

export function findChromeExecutableMac(): BrowserExecutable | null {
    const candidates: Array<BrowserExecutable> = [
        {
            kind: "chrome",
            path: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        },
        {
            kind: "chrome",
            path: path.join(os.homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        },
        {
            kind: "brave",
            path: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        },
        {
            kind: "brave",
            path: path.join(os.homedir(), "Applications/Brave Browser.app/Contents/MacOS/Brave Browser"),
        },
        {
            kind: "edge",
            path: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        },
        {
            kind: "edge",
            path: path.join(os.homedir(), "Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
        },
        {
            kind: "chromium",
            path: "/Applications/Chromium.app/Contents/MacOS/Chromium",
        },
        {
            kind: "chromium",
            path: path.join(os.homedir(), "Applications/Chromium.app/Contents/MacOS/Chromium"),
        },
        {
            kind: "canary",
            path: "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
        },
        {
            kind: "canary",
            path: path.join(
                os.homedir(),
                "Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
            ),
        },
    ];

    return findFirstExecutable(candidates);
}
