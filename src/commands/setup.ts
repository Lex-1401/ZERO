import fs from "node:fs/promises";

import JSON5 from "json5";

import { DEFAULT_AGENT_WORKSPACE_DIR, ensureAgentWorkspace } from "../agents/workspace.js";
import {
  type ZEROConfig,
  CONFIG_PATH_ZERO,
  writeConfigFile,
  readConfigFileSnapshot,
} from "../config/config.js";
import { runSmartScan } from "./smart-scan.js";
import { intro, outro, confirm, note } from "@clack/prompts";
import { theme } from "../terminal/theme.js";
import { formatConfigPath, logConfigUpdated } from "../config/logging.js";
import { resolveSessionTranscriptsDir } from "../config/sessions.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { shortenHomePath } from "../utils.js";

async function readConfigFileRaw(): Promise<{
  exists: boolean;
  parsed: ZEROConfig;
}> {
  try {
    const raw = await fs.readFile(CONFIG_PATH_ZERO, "utf-8");
    const parsed = JSON5.parse(raw);
    if (parsed && typeof parsed === "object") {
      return { exists: true, parsed: parsed as ZEROConfig };
    }
    return { exists: true, parsed: {} };
  } catch {
    return { exists: false, parsed: {} };
  }
}

export async function setupCommand(
  opts?: { workspace?: string; smart?: boolean },
  runtime: RuntimeEnv = defaultRuntime,
) {
  if (opts?.smart) {
    intro(theme.accent("ZERO Smart Setup"));
    const snapshot = await readConfigFileSnapshot();
    const recommendations = await runSmartScan(snapshot.config);

    if (recommendations.length > 0) {
      note(
        recommendations
          .map(
            (r) =>
              `${theme.accent(r.title)} (${r.type})\n  └─ ${r.description} (Motivo: ${theme.muted(r.reason)})`,
          )
          .join("\n\n"),
        "Sugestões Detectadas",
      );

      const apply = await confirm({
        message: "Deseja aplicar todas as recomendações sugeridas?",
        initialValue: true,
      });

      if (apply) {
        let nextConfig = { ...snapshot.config };
        for (const r of recommendations) {
          if (r.id === "enable_sandbox") {
            nextConfig.tools = {
              ...nextConfig.tools,
              exec: { ...nextConfig.tools?.exec, host: "sandbox" },
            };
            nextConfig.agents = {
              ...nextConfig.agents,
              defaults: {
                ...nextConfig.agents?.defaults,
                sandbox: { ...nextConfig.agents?.defaults?.sandbox, mode: "all" },
              },
            };
          } else if (r.id === "high_perf_model") {
            nextConfig.agents = {
              ...nextConfig.agents,
              defaults: {
                ...nextConfig.agents?.defaults,
                model: { ...nextConfig.agents?.defaults?.model, primary: r.recommendedValue },
              },
            };
          } else if (r.id === "macos_daemon") {
            nextConfig.gateway = { ...nextConfig.gateway, mode: "local" };
            // In a real scenario, we'd also trigger the service install here or via doctor
          }
        }
        await writeConfigFile(nextConfig);
      }
      outro("Scan inteligente concluído.");
    }
  }

  const desiredWorkspace =
    typeof opts?.workspace === "string" && opts.workspace.trim()
      ? opts.workspace.trim()
      : undefined;

  const existingRaw = await readConfigFileRaw();
  const cfg = existingRaw.parsed;
  const defaults = cfg.agents?.defaults ?? {};

  const workspace = desiredWorkspace ?? defaults.workspace ?? DEFAULT_AGENT_WORKSPACE_DIR;

  const next: ZEROConfig = {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...defaults,
        workspace,
      },
    },
  };

  if (!existingRaw.exists || defaults.workspace !== workspace) {
    await writeConfigFile(next);
    if (!existingRaw.exists) {
      runtime.log(`Gravado ${formatConfigPath()}`);
    } else {
      logConfigUpdated(runtime, { suffix: "(definido agents.defaults.workspace)" });
    }
  } else {
    runtime.log(`Configuração OK: ${formatConfigPath()}`);
  }

  const ws = await ensureAgentWorkspace({
    dir: workspace,
    ensureBootstrapFiles: !next.agents?.defaults?.skipBootstrap,
  });
  runtime.log(`Workspace OK: ${shortenHomePath(ws.dir)}`);

  const sessionsDir = resolveSessionTranscriptsDir();
  await fs.mkdir(sessionsDir, { recursive: true });
  runtime.log(`Sessions OK: ${shortenHomePath(sessionsDir)}`);
}
