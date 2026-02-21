import path from "node:path";

import type { ZEROConfig } from "../config/config.js";
import { resolveGatewayPort, resolveIsNixMode } from "../config/paths.js";
import { findExtraGatewayServices, renderGatewayServiceCleanupHints } from "../daemon/inspect.js";
import { findLegacyGatewayServices, uninstallLegacyGatewayServices } from "../daemon/legacy.js";
import { renderSystemNodeWarning, resolveSystemNodeInfo } from "../daemon/runtime-paths.js";
import { resolveGatewayService } from "../daemon/service.js";
// import { auditGatewayServiceConfig, needsNodeRuntimeMigration, SERVICE_AUDIT_CODES } from "../daemon/service-audit.js"; // Removed for v1.0.0

const SERVICE_AUDIT_CODES = {
  gatewayEntrypointMismatch: "gatewayEntrypointMismatch",
} as const;

async function auditGatewayServiceConfig(opts: any) {
  return { issues: [] as any[] };
}

function needsNodeRuntimeMigration(issues: any[]) {
  return false;
}
import type { RuntimeEnv } from "../runtime.js";
import { note } from "../terminal/note.js";
import { buildGatewayInstallPlan, gatewayInstallErrorHint } from "./daemon-install-helpers.js";
import {
  DEFAULT_GATEWAY_DAEMON_RUNTIME,
  GATEWAY_DAEMON_RUNTIME_OPTIONS,
  type GatewayDaemonRuntime,
} from "./daemon-runtime.js";
import type { DoctorOptions, DoctorPrompter } from "./doctor-prompter.js";

function detectGatewayRuntime(programArguments: string[] | undefined): GatewayDaemonRuntime {
  const first = programArguments?.[0];
  if (first) {
    const base = path.basename(first).toLowerCase();
    if (base === "bun" || base === "bun.exe") return "bun";
    if (base === "node" || base === "node.exe") return "node";
  }
  return DEFAULT_GATEWAY_DAEMON_RUNTIME;
}

function findGatewayEntrypoint(programArguments?: string[]): string | null {
  if (!programArguments || programArguments.length === 0) return null;
  const gatewayIndex = programArguments.indexOf("gateway");
  if (gatewayIndex <= 0) return null;
  return programArguments[gatewayIndex - 1] ?? null;
}

function normalizeExecutablePath(value: string): string {
  return path.resolve(value);
}

export async function maybeMigrateLegacyGatewayService(
  cfg: ZEROConfig,
  mode: "local" | "remote",
  runtime: RuntimeEnv,
  prompter: DoctorPrompter,
) {
  const legacyServices = await findLegacyGatewayServices(process.env);
  if (legacyServices.length === 0) return;

  note(
    legacyServices.map((svc) => `- ${svc.label} (${svc.platform}, ${svc.detail})`).join("\n"),
    "Serviços de gateway legados detectados",
  );

  const migrate = await prompter.confirmSkipInNonInteractive({
    message: "Migrar serviços de gateway legados para o ZERO agora?",
    initialValue: true,
  });
  if (!migrate) return;

  try {
    await uninstallLegacyGatewayServices({
      env: process.env,
      stdout: process.stdout,
    });
  } catch (err) {
    runtime.error(`Falha na limpeza do serviço legado: ${String(err)}`);
    return;
  }

  if (resolveIsNixMode(process.env)) {
    note("Modo Nix detectado; pulando a instalação de serviços.", "Gateway");
    return;
  }

  if (mode === "remote") {
    note("O modo do Gateway é remoto; pulando a instalação do serviço local.", "Gateway");
    return;
  }

  const service = resolveGatewayService();
  const loaded = await service.isLoaded({ env: process.env });
  if (loaded) {
    note(`ZERO ${service.label} já ${service.loadedText}.`, "Gateway");
    return;
  }

  const install = await prompter.confirmSkipInNonInteractive({
    message: "Instalar serviço do gateway do ZERO agora?",
    initialValue: true,
  });
  if (!install) return;

  const daemonRuntime = await prompter.select<GatewayDaemonRuntime>(
    {
      message: "Runtime do serviço do gateway",
      options: GATEWAY_DAEMON_RUNTIME_OPTIONS,
      initialValue: DEFAULT_GATEWAY_DAEMON_RUNTIME,
    },
    DEFAULT_GATEWAY_DAEMON_RUNTIME,
  );
  const port = resolveGatewayPort(cfg, process.env);
  const { programArguments, workingDirectory, environment } = await buildGatewayInstallPlan({
    env: process.env,
    port,
    token: cfg.gateway?.auth?.token ?? process.env.ZERO_GATEWAY_TOKEN,
    runtime: daemonRuntime,
    warn: (message, title) => note(message, title),
    config: cfg,
  });
  try {
    await service.install({
      env: process.env,
      stdout: process.stdout,
      programArguments,
      workingDirectory,
      environment,
    });
  } catch (err) {
    runtime.error(`Falha na instalação do serviço do gateway: ${String(err)}`);
    note(gatewayInstallErrorHint(), "Gateway");
  }
}

export async function maybeRepairGatewayServiceConfig(
  cfg: ZEROConfig,
  mode: "local" | "remote",
  runtime: RuntimeEnv,
  prompter: DoctorPrompter,
) {
  if (resolveIsNixMode(process.env)) {
    note("Modo Nix detectado; pulando a atualização de serviços.", "Gateway");
    return;
  }

  if (mode === "remote") {
    note("O modo do Gateway é remoto; pulando a auditoria do serviço local.", "Gateway");
    return;
  }

  const service = resolveGatewayService();
  let command: Awaited<ReturnType<typeof service.readCommand>> | null = null;
  try {
    command = await service.readCommand(process.env);
  } catch {
    command = null;
  }
  if (!command) return;

  const audit = await auditGatewayServiceConfig({
    env: process.env,
    command,
  });
  const needsNodeRuntime = needsNodeRuntimeMigration(audit.issues);
  const systemNodeInfo = needsNodeRuntime
    ? await resolveSystemNodeInfo({ env: process.env })
    : null;
  const systemNodePath = systemNodeInfo?.supported ? systemNodeInfo.path : null;
  if (needsNodeRuntime && !systemNodePath) {
    const warning = renderSystemNodeWarning(systemNodeInfo);
    if (warning) note(warning, "Runtime do Gateway");
    note(
      "Node do sistema 22+ não encontrado. Instale via Homebrew/apt/choco e execute o doctor novamente para migrar do Bun/gerenciadores de versão.",
      "Runtime do Gateway",
    );
  }

  const port = resolveGatewayPort(cfg, process.env);
  const runtimeChoice = detectGatewayRuntime(command.programArguments);
  const { programArguments, workingDirectory, environment } = await buildGatewayInstallPlan({
    env: process.env,
    port,
    token: cfg.gateway?.auth?.token ?? process.env.ZERO_GATEWAY_TOKEN,
    runtime: needsNodeRuntime && systemNodePath ? "node" : runtimeChoice,
    nodePath: systemNodePath ?? undefined,
    warn: (message, title) => note(message, title),
    config: cfg,
  });
  const expectedEntrypoint = findGatewayEntrypoint(programArguments);
  const currentEntrypoint = findGatewayEntrypoint(command.programArguments);
  if (
    expectedEntrypoint &&
    currentEntrypoint &&
    normalizeExecutablePath(expectedEntrypoint) !== normalizeExecutablePath(currentEntrypoint)
  ) {
    audit.issues.push({
      code: SERVICE_AUDIT_CODES.gatewayEntrypointMismatch,
      message: "O ponto de entrada do serviço do Gateway não corresponde à instalação atual.",
      detail: `${currentEntrypoint} -> ${expectedEntrypoint}`,
      level: "recommended",
    });
  }

  if (audit.issues.length === 0) return;

  note(
    audit.issues
      .map((issue) =>
        issue.detail ? `- ${issue.message} (${issue.detail})` : `- ${issue.message}`,
      )
      .join("\n"),
    "Configuração do serviço do Gateway",
  );

  const aggressiveIssues = audit.issues.filter((issue) => issue.level === "aggressive");
  const needsAggressive = aggressiveIssues.length > 0;

  if (needsAggressive && !prompter.shouldForce) {
    note(
      "Edições de serviço personalizadas ou inesperadas detectadas. Execute novamente com --force para sobrescrever.",
      "Configuração do serviço do Gateway",
    );
  }

  const repair = needsAggressive
    ? await prompter.confirmAggressive({
        message: "Sobrescrever a configuração do serviço do gateway com os padrões atuais agora?",
        initialValue: Boolean(prompter.shouldForce),
      })
    : await prompter.confirmRepair({
        message:
          "Atualizar a configuração do serviço do gateway para os padrões recomendados agora?",
        initialValue: true,
      });
  if (!repair) return;
  try {
    await service.install({
      env: process.env,
      stdout: process.stdout,
      programArguments,
      workingDirectory,
      environment,
    });
  } catch (err) {
    runtime.error(`Falha na atualização do serviço do gateway: ${String(err)}`);
  }
}

export async function maybeScanExtraGatewayServices(options: DoctorOptions) {
  const extraServices = await findExtraGatewayServices(process.env, {
    deep: options.deep,
  });
  if (extraServices.length === 0) return;

  note(
    extraServices.map((svc) => `- ${svc.label} (${svc.scope}, ${svc.detail})`).join("\n"),
    "Outros serviços semelhantes ao gateway detectados",
  );

  const cleanupHints = renderGatewayServiceCleanupHints();
  if (cleanupHints.length > 0) {
    note(cleanupHints.map((hint) => `- ${hint}`).join("\n"), "Dicas de limpeza");
  }

  note(
    [
      "Recomendação: execute um único gateway por máquina para a maioria das configurações.",
      "Um único gateway suporta múltiplos agentes.",
      "Se você precisar de múltiplos gateways (ex: um bot de resgate no mesmo host), isole as portas + configuração/estado (veja docs: /gateway#multiple-gateways-same-host).",
    ].join("\n"),
    "Recomendação do Gateway",
  );
}
