
import { type ResolvedBrowserConfig } from "./config.js";
import { type BrowserExecutable } from "./executables/types.js";
import { exists } from "./executables/utils.js";
import {
  detectDefaultChromiumExecutableMac,
  findChromeExecutableMac,
} from "./executables/mac.js";
import {
  detectDefaultChromiumExecutableLinux,
  findChromeExecutableLinux,
} from "./executables/linux.js";
import {
  detectDefaultChromiumExecutableWindows,
  findChromeExecutableWindows,
} from "./executables/windows.js";

export type { BrowserExecutable };

export {
  findChromeExecutableMac,
  findChromeExecutableLinux,
  findChromeExecutableWindows,
};

export function detectDefaultChromiumExecutable(platform: NodeJS.Platform): BrowserExecutable | null {
  if (platform === "darwin") return detectDefaultChromiumExecutableMac();
  if (platform === "linux") return detectDefaultChromiumExecutableLinux();
  if (platform === "win32") return detectDefaultChromiumExecutableWindows();
  return null;
}

export function resolveBrowserExecutableForPlatform(
  resolved: ResolvedBrowserConfig,
  platform: NodeJS.Platform,
): BrowserExecutable | null {
  if (resolved.executablePath) {
    if (!exists(resolved.executablePath)) {
      throw new Error(`browser.executablePath not found: ${resolved.executablePath}`);
    }
    return { kind: "custom", path: resolved.executablePath };
  }

  const detected = detectDefaultChromiumExecutable(platform);
  if (detected) return detected;

  if (platform === "darwin") return findChromeExecutableMac();
  if (platform === "linux") return findChromeExecutableLinux();
  if (platform === "win32") return findChromeExecutableWindows();
  return null;
}
