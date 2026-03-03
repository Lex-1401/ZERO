import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import { loadConfig } from "../../config/config.js";
import { resolveBrowserConfig, shouldStartLocalBrowserServer } from "../../browser/config.js";
import { detectMime } from "../../media/mime.js";
import { BROWSER_PROXY_MAX_FILE_BYTES } from "./constants.js";
import type { BrowserProxyFile } from "./types.js";

export function normalizeProfileAllowlist(raw?: string[]): string[] {
  return Array.isArray(raw) ? raw.map((entry) => entry.trim()).filter(Boolean) : [];
}

export function resolveBrowserProxyConfig() {
  const cfg = loadConfig();
  const proxy = cfg.nodeHost?.browserProxy;
  const allowProfiles = normalizeProfileAllowlist(proxy?.allowProfiles);
  const enabled = proxy?.enabled !== false;
  return { enabled, allowProfiles };
}

let browserControlReady: Promise<void> | null = null;

export async function ensureBrowserControlServer(): Promise<void> {
  if (browserControlReady) return browserControlReady;
  browserControlReady = (async () => {
    const cfg = loadConfig();
    const resolved = resolveBrowserConfig(cfg.browser);
    if (!resolved.enabled) {
      throw new Error("browser control disabled");
    }
    if (!shouldStartLocalBrowserServer(resolved)) {
      throw new Error("browser control URL is non-loopback");
    }
    const mod = await import("../../browser/server.js");
    await mod.startBrowserControlServerFromConfig();
  })();
  return browserControlReady;
}

export function isProfileAllowed(params: { allowProfiles: string[]; profile?: string | null }) {
  const { allowProfiles, profile } = params;
  if (!allowProfiles.length) return true;
  if (!profile) return false;
  return allowProfiles.includes(profile.trim());
}

export function collectBrowserProxyPaths(payload: unknown): string[] {
  const paths = new Set<string>();
  const obj =
    typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : null;
  if (!obj) return [];
  if (typeof obj.path === "string" && obj.path.trim()) paths.add(obj.path.trim());
  if (typeof obj.imagePath === "string" && obj.imagePath.trim()) paths.add(obj.imagePath.trim());
  const download = obj.download;
  if (download && typeof download === "object") {
    const dlPath = (download as Record<string, unknown>).path;
    if (typeof dlPath === "string" && dlPath.trim()) paths.add(dlPath.trim());
  }
  return Array.from(paths);
}

export async function readBrowserProxyFile(filePath: string): Promise<BrowserProxyFile | null> {
  const stat = await fsPromises.stat(filePath).catch(() => null);
  if (!stat || !stat.isFile()) return null;
  if (stat.size > BROWSER_PROXY_MAX_FILE_BYTES) {
    throw new Error(
      `browser proxy file exceeds ${Math.round(BROWSER_PROXY_MAX_FILE_BYTES / (1024 * 1024))}MB`,
    );
  }
  const buffer = await fsPromises.readFile(filePath);
  const mimeType = await detectMime({ buffer, filePath });
  return { path: filePath, base64: buffer.toString("base64"), mimeType };
}
