import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type { ZEROConfig } from "../config/config.js";
import { note } from "../terminal/note.js";
import { shortenHomePath } from "../utils.js";

const execFileAsync = promisify(execFile);

function resolveHomeDir(): string {
  return process.env.HOME ?? os.homedir();
}

export async function noteMacLaunchAgentOverrides() {
  if (process.platform !== "darwin") return;
  const markerPath = path.join(resolveHomeDir(), ".zero", "disable-launchagent");
  const hasMarker = fs.existsSync(markerPath);
  if (!hasMarker) return;

  const displayMarkerPath = shortenHomePath(markerPath);
  const lines = [
    `- A gravação do LaunchAgent está desativada via ${displayMarkerPath}.`,
    "- Para restaurar o comportamento padrão:",
    `  rm ${displayMarkerPath}`,
  ].filter((line): line is string => Boolean(line));
  note(lines.join("\n"), "Gateway (macOS)");
}

async function launchctlGetenv(name: string): Promise<string | undefined> {
  try {
    const result = await execFileAsync("/bin/launchctl", ["getenv", name], { encoding: "utf8" });
    const value = String(result.stdout ?? "").trim();
    return value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

function hasConfigGatewayCreds(cfg: ZEROConfig): boolean {
  const localToken =
    typeof cfg.gateway?.auth?.token === "string" ? cfg.gateway?.auth?.token.trim() : "";
  const localPassword =
    typeof cfg.gateway?.auth?.password === "string" ? cfg.gateway?.auth?.password.trim() : "";
  const remoteToken =
    typeof cfg.gateway?.remote?.token === "string" ? cfg.gateway?.remote?.token.trim() : "";
  const remotePassword =
    typeof cfg.gateway?.remote?.password === "string" ? cfg.gateway?.remote?.password.trim() : "";
  return Boolean(localToken || localPassword || remoteToken || remotePassword);
}

export async function noteMacLaunchctlGatewayEnvOverrides(
  cfg: ZEROConfig,
  deps?: {
    platform?: NodeJS.Platform;
    getenv?: (name: string) => Promise<string | undefined>;
    noteFn?: typeof note;
  },
) {
  const platform = deps?.platform ?? process.platform;
  if (platform !== "darwin") return;
  if (!hasConfigGatewayCreds(cfg)) return;

  const getenv = deps?.getenv ?? launchctlGetenv;
  const envToken = await getenv("ZERO_GATEWAY_TOKEN");
  const envPassword = await getenv("ZERO_GATEWAY_PASSWORD");
  if (!envToken && !envPassword) return;

  const lines = [
    "- Sobrescritas de ambiente do launchctl detectadas (pode causar erros de autorização confusos).",
    envToken
      ? "- `ZERO_GATEWAY_TOKEN` está definido; ele substitui os tokens da configuração."
      : undefined,
    envPassword
      ? "- `ZERO_GATEWAY_PASSWORD` está definido; ele substitui as senhas da configuração."
      : undefined,
    "- Limpe as sobrescritas e reinicie o aplicativo/gateway:",
    envToken ? "  launchctl unsetenv ZERO_GATEWAY_TOKEN" : undefined,
    envPassword ? "  launchctl unsetenv ZERO_GATEWAY_PASSWORD" : undefined,
  ].filter((line): line is string => Boolean(line));

  (deps?.noteFn ?? note)(lines.join("\n"), "Gateway (macOS)");
}
