import * as os from "node:os";
import { blockedEnvKeys, blockedEnvPrefixes, DEFAULT_NODE_PATH } from "./constants.js";
import type { ExecSecurity, ExecAsk } from "../../infra/exec-approvals.js";

export function resolveExecSecurity(value?: string): ExecSecurity {
  if (value === "allowlist" || value === "full" || value === "deny") return value;
  return "deny";
}

export function resolveExecAsk(value?: string): ExecAsk {
  if (value === "always" || value === "off" || value === "on-miss") return value;
  return "on-miss";
}

export function sanitizeEnv(
  overrides?: Record<string, string> | null,
): Record<string, string> | undefined {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  for (const key of Object.keys(env)) {
    if (blockedEnvKeys.has(key)) {
      delete env[key];
      continue;
    }
    for (const prefix of blockedEnvPrefixes) {
      if (key.startsWith(prefix)) {
        delete env[key];
        break;
      }
    }
  }

  const userPath = overrides?.PATH ?? overrides?.Path ?? process.env.PATH ?? process.env.Path;
  env.PATH = userPath && userPath.trim() ? userPath : DEFAULT_NODE_PATH;
  if (!env.HOME) env.HOME = os.homedir();
  if (!env.USER) env.USER = os.userInfo().username;
  if (!env.SHELL) env.SHELL = os.platform() === "win32" ? "cmd.exe" : "/bin/sh";

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (!blockedEnvKeys.has(key) && !blockedEnvPrefixes.some((p) => key.startsWith(p))) {
        env[key] = value;
      }
    }
  }

  return env;
}

export function formatCommand(argv: string[]): string {
  if (!Array.isArray(argv) || argv.length === 0) return "";
  return argv
    .map((arg) => {
      if (!arg) return '""';
      if (/[^\w.%+=,/-]/.test(arg)) {
        return `"${arg.replace(/"/g, '\\"')}"`;
      }
      return arg;
    })
    .join(" ");
}
