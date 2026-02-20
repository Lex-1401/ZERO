import { formatCliCommand } from "../cli/command-format.js";
import type { ZEROConfig } from "../config/config.js";
import { readConfigFileSnapshot } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";

export function createQuietRuntime(runtime: RuntimeEnv): RuntimeEnv {
  return { ...runtime, log: () => {} };
}

export async function requireValidConfig(runtime: RuntimeEnv): Promise<ZEROConfig | null> {
  const snapshot = await readConfigFileSnapshot();
  if (snapshot.exists && !snapshot.valid) {
    const issues =
      snapshot.issues.length > 0
        ? snapshot.issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n")
        : "Problema de validação desconhecido.";
    runtime.error(`Configuração inválida:\n${issues}`);
    runtime.error(`Corrija a configuração ou execute ${formatCliCommand("zero doctor")}.`);
    runtime.exit(1);
    return null;
  }
  return snapshot.config;
}
