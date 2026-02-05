import { readConfigFileSnapshot } from "../config/config.js";
import { assertSupportedRuntime } from "../infra/runtime-guard.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { resolveUserPath } from "../utils.js";
import { DEFAULT_WORKSPACE, handleReset } from "./onboard-helpers.js";
import { runInteractiveOnboarding } from "./onboard-interactive.js";
import { runNonInteractiveOnboarding } from "./onboard-non-interactive.js";
import { formatCliCommand } from "../cli/command-format.js";
import type { OnboardOptions } from "./onboard-types.js";

export async function onboardCommand(opts: OnboardOptions, runtime: RuntimeEnv = defaultRuntime) {
  assertSupportedRuntime(runtime);
  const authChoice = opts.authChoice === "oauth" ? ("setup-token" as const) : opts.authChoice;
  const flow = opts.flow === "manual" ? ("advanced" as const) : opts.flow;
  const normalizedOpts =
    authChoice === opts.authChoice && flow === opts.flow ? opts : { ...opts, authChoice, flow };

  if (normalizedOpts.nonInteractive && normalizedOpts.acceptRisk !== true) {
    runtime.error(
      [
        "O onboarding não interativo requer reconhecimento explícito de risco.",
        "Leia: https://docs.zero.local/security",
        `Execute novamente com: ${formatCliCommand("zero onboard --non-interactive --accept-risk ...")}`,
      ].join("\n"),
    );
    runtime.exit(1);
    return;
  }

  if (normalizedOpts.reset) {
    const snapshot = await readConfigFileSnapshot();
    const baseConfig = snapshot.valid ? snapshot.config : {};
    const workspaceDefault =
      normalizedOpts.workspace ?? baseConfig.agents?.defaults?.workspace ?? DEFAULT_WORKSPACE;
    await handleReset("full", resolveUserPath(workspaceDefault), runtime);
  }

  if (process.platform === "win32") {
    runtime.log(
      [
        "Windows detectado.",
        "O suporte nativo utiliza 'Scheduled Tasks' para o daemon.",
        "Dica: Execute o PowerShell como Administrador se tiver problemas de permissão.",
        "Se preferir Linux, o WSL2 também é totalmente suportado.",
      ].join("\n"),
    );
  }

  if (normalizedOpts.nonInteractive) {
    await runNonInteractiveOnboarding(normalizedOpts, runtime);
    return;
  }

  await runInteractiveOnboarding(normalizedOpts, runtime);
}

export type { OnboardOptions } from "./onboard-types.js";
