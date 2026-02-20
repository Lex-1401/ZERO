import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_SANDBOX_BROWSER_IMAGE,
  DEFAULT_SANDBOX_COMMON_IMAGE,
  DEFAULT_SANDBOX_IMAGE,
  resolveSandboxScope,
} from "../agents/sandbox.js";
import type { ZEROConfig } from "../config/config.js";
import { runCommandWithTimeout, runExec } from "../process/exec.js";
import type { RuntimeEnv } from "../runtime.js";
import { note } from "../terminal/note.js";
import type { DoctorPrompter } from "./doctor-prompter.js";

type SandboxScriptInfo = {
  scriptPath: string;
  cwd: string;
};

function resolveSandboxScript(scriptRel: string): SandboxScriptInfo | null {
  const candidates = new Set<string>();
  candidates.add(process.cwd());
  const argv1 = process.argv[1];
  if (argv1) {
    const normalized = path.resolve(argv1);
    candidates.add(path.resolve(path.dirname(normalized), ".."));
    candidates.add(path.resolve(path.dirname(normalized)));
  }

  for (const root of candidates) {
    const scriptPath = path.join(root, scriptRel);
    if (fs.existsSync(scriptPath)) {
      return { scriptPath, cwd: root };
    }
  }

  return null;
}

async function runSandboxScript(scriptRel: string, runtime: RuntimeEnv): Promise<boolean> {
  const script = resolveSandboxScript(scriptRel);
  if (!script) {
    note(
      `Não foi possível localizar ${scriptRel}. Execute-o a partir da raiz do repositório.`,
      "Sandbox",
    );
    return false;
  }

  runtime.log(`Executando ${scriptRel}...`);
  const result = await runCommandWithTimeout(["bash", script.scriptPath], {
    timeoutMs: 20 * 60 * 1000,
    cwd: script.cwd,
  });
  if (result.code !== 0) {
    runtime.error(
      `Falha ao executar ${scriptRel}: ${
        result.stderr.trim() || result.stdout.trim() || "erro desconhecido"
      }`,
    );
    return false;
  }

  runtime.log(`Concluído ${scriptRel}.`);
  return true;
}

async function isDockerAvailable(): Promise<boolean> {
  try {
    await runExec("docker", ["version", "--format", "{{.Server.Version}}"], {
      timeoutMs: 5_000,
    });
    return true;
  } catch {
    return false;
  }
}

async function dockerImageExists(image: string): Promise<boolean> {
  try {
    await runExec("docker", ["image", "inspect", image], { timeoutMs: 5_000 });
    return true;
  } catch (error: any) {
    const stderr = error?.stderr || error?.message || "";
    if (String(stderr).includes("No such image")) {
      return false;
    }
    throw error;
  }
}

function resolveSandboxDockerImage(cfg: ZEROConfig): string {
  const image = cfg.agents?.defaults?.sandbox?.docker?.image?.trim();
  return image ? image : DEFAULT_SANDBOX_IMAGE;
}

function resolveSandboxBrowserImage(cfg: ZEROConfig): string {
  const image = cfg.agents?.defaults?.sandbox?.browser?.image?.trim();
  return image ? image : DEFAULT_SANDBOX_BROWSER_IMAGE;
}

function updateSandboxDockerImage(cfg: ZEROConfig, image: string): ZEROConfig {
  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        sandbox: {
          ...cfg.agents?.defaults?.sandbox,
          docker: {
            ...cfg.agents?.defaults?.sandbox?.docker,
            image,
          },
        },
      },
    },
  };
}

function updateSandboxBrowserImage(cfg: ZEROConfig, image: string): ZEROConfig {
  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        sandbox: {
          ...cfg.agents?.defaults?.sandbox,
          browser: {
            ...cfg.agents?.defaults?.sandbox?.browser,
            image,
          },
        },
      },
    },
  };
}

type SandboxImageCheck = {
  label: string;
  image: string;
  buildScript?: string;
  updateConfig: (image: string) => void;
};

async function handleMissingSandboxImage(
  params: SandboxImageCheck,
  runtime: RuntimeEnv,
  prompter: DoctorPrompter,
) {
  const exists = await dockerImageExists(params.image);
  if (exists) return;

  const buildHint = params.buildScript
    ? `Construa com ${params.buildScript}.`
    : "Construa ou baixe (pull) primeiro.";
  note(`Imagem do sandbox ${params.label} ausente: ${params.image}. ${buildHint}`, "Sandbox");

  let built = false;
  if (params.buildScript) {
    const build = await prompter.confirmSkipInNonInteractive({
      message: `Construir imagem do sandbox ${params.label} agora?`,
      initialValue: true,
    });
    if (build) {
      built = await runSandboxScript(params.buildScript, runtime);
    }
  }

  if (built) return;
}

export async function maybeRepairSandboxImages(
  cfg: ZEROConfig,
  runtime: RuntimeEnv,
  prompter: DoctorPrompter,
): Promise<ZEROConfig> {
  const sandbox = cfg.agents?.defaults?.sandbox;
  const mode = sandbox?.mode ?? "off";
  if (!sandbox || mode === "off") return cfg;

  const dockerAvailable = await isDockerAvailable();
  if (!dockerAvailable) {
    note("Docker não disponível; pulando verificações de imagem do sandbox.", "Sandbox");
    return cfg;
  }

  let next = cfg;
  const changes: string[] = [];

  const dockerImage = resolveSandboxDockerImage(cfg);
  await handleMissingSandboxImage(
    {
      label: "base",
      image: dockerImage,
      buildScript:
        dockerImage === DEFAULT_SANDBOX_COMMON_IMAGE
          ? "scripts/sandbox-common-setup.sh"
          : dockerImage === DEFAULT_SANDBOX_IMAGE
            ? "scripts/sandbox-setup.sh"
            : undefined,
      updateConfig: (image) => {
        next = updateSandboxDockerImage(next, image);
        changes.push(`Atualizado agents.defaults.sandbox.docker.image → ${image}`);
      },
    },
    runtime,
    prompter,
  );

  if (sandbox.browser?.enabled) {
    await handleMissingSandboxImage(
      {
        label: "browser",
        image: resolveSandboxBrowserImage(cfg),
        buildScript: "scripts/sandbox-browser-setup.sh",
        updateConfig: (image) => {
          next = updateSandboxBrowserImage(next, image);
          changes.push(`Atualizado agents.defaults.sandbox.browser.image → ${image}`);
        },
      },
      runtime,
      prompter,
    );
  }

  if (changes.length > 0) {
    note(changes.join("\n"), "Alterações do Doctor");
  }

  return next;
}

export function noteSandboxScopeWarnings(cfg: ZEROConfig) {
  const globalSandbox = cfg.agents?.defaults?.sandbox;
  const agents = Array.isArray(cfg.agents?.list) ? cfg.agents.list : [];
  const warnings: string[] = [];

  for (const agent of agents) {
    const agentId = agent.id;
    const agentSandbox = agent.sandbox;
    if (!agentSandbox) continue;

    const scope = resolveSandboxScope({
      scope: agentSandbox.scope ?? globalSandbox?.scope,
      perSession: agentSandbox.perSession ?? globalSandbox?.perSession,
    });

    if (scope !== "shared") continue;

    const overrides: string[] = [];
    if (agentSandbox.docker && Object.keys(agentSandbox.docker).length > 0) {
      overrides.push("docker");
    }
    if (agentSandbox.browser && Object.keys(agentSandbox.browser).length > 0) {
      overrides.push("browser");
    }
    if (agentSandbox.prune && Object.keys(agentSandbox.prune).length > 0) {
      overrides.push("prune");
    }

    if (overrides.length === 0) continue;

    warnings.push(
      [
        `- agents.list (id "${agentId}") sobrescritas de sandbox ${overrides.join("/")} ignoradas.`,
        `  o escopo resolve para "shared".`,
      ].join("\n"),
    );
  }

  if (warnings.length > 0) {
    note(warnings.join("\n"), "Sandbox");
  }
}
