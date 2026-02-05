import type { ZEROConfig } from "../../config/config.js";
import { writeConfigFile } from "../../config/config.js";
import { logConfigUpdated } from "../../config/logging.js";
import type { RuntimeEnv } from "../../runtime.js";
import { formatCliCommand } from "../../cli/command-format.js";
import { applyWizardMetadata } from "../onboard-helpers.js";
import type { OnboardOptions } from "../onboard-types.js";

export async function runNonInteractiveOnboardingRemote(params: {
  opts: OnboardOptions;
  runtime: RuntimeEnv;
  baseConfig: ZEROConfig;
}) {
  const { opts, runtime, baseConfig } = params;
  const mode = "remote" as const;

  const remoteUrl = opts.remoteUrl?.trim();
  if (!remoteUrl) {
    runtime.error("--remote-url ausente para o modo remote.");
    runtime.exit(1);
    return;
  }

  let nextConfig: ZEROConfig = {
    ...baseConfig,
    gateway: {
      ...baseConfig.gateway,
      mode: "remote",
      remote: {
        url: remoteUrl,
        token: opts.remoteToken?.trim() || undefined,
      },
    },
  };
  nextConfig = applyWizardMetadata(nextConfig, { command: "onboard", mode });
  await writeConfigFile(nextConfig);
  logConfigUpdated(runtime);

  const payload = {
    mode,
    remoteUrl,
    auth: opts.remoteToken ? "token" : "none",
  };
  if (opts.json) {
    runtime.log(JSON.stringify(payload, null, 2));
  } else {
    runtime.log(`Gateway remoto: ${remoteUrl}`);
    runtime.log(`Autenticação: ${payload.auth}`);
    runtime.log(
      `Dica: execute \`${formatCliCommand("zero configure --section web")}\` para armazenar sua chave de API do Brave para o web_search. Documentação: https://docs.zero.local/tools/web`,
    );
  }
}
