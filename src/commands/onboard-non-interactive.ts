import { formatCliCommand } from "../cli/command-format.js";
import type { ZEROConfig } from "../config/config.js";
import { readConfigFileSnapshot } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import { defaultRuntime } from "../runtime.js";
import { runNonInteractiveOnboardingLocal } from "./onboard-non-interactive/local.js";
import { runNonInteractiveOnboardingRemote } from "./onboard-non-interactive/remote.js";
import type { OnboardOptions } from "./onboard-types.js";

export async function runNonInteractiveOnboarding(
  opts: OnboardOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  const snapshot = await readConfigFileSnapshot();
  if (snapshot.exists && !snapshot.valid) {
    runtime.error(
      `Configuração inválida. Execute \`${formatCliCommand("zero doctor")}\` para repará-la, então execute o onboarding novamente.`,
    );
    runtime.exit(1);
    return;
  }

  const baseConfig: ZEROConfig = snapshot.valid ? snapshot.config : {};
  const mode = opts.mode ?? "local";
  if (mode !== "local" && mode !== "remote") {
    runtime.error(`--mode "${String(mode)}" inválido (use local ou remote).`);
    runtime.exit(1);
    return;
  }

  if (mode === "remote") {
    await runNonInteractiveOnboardingRemote({ opts, runtime, baseConfig });
    return;
  }

  await runNonInteractiveOnboardingLocal({ opts, runtime, baseConfig });
}
