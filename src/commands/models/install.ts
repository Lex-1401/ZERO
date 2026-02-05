import { spawn } from "node:child_process";
import { theme } from "../../terminal/theme.js";
import type { RuntimeEnv } from "../../runtime.js";

export async function modelsInstallCommand(model: string, runtime: RuntimeEnv): Promise<void> {
  runtime.log(theme.info(`Installing model '${model}' via Ollama...`));

  return new Promise((resolve, reject) => {
    const process = spawn("ollama", ["pull", model], { stdio: "inherit" });

    process.on("close", (code) => {
      if (code === 0) {
        runtime.log(theme.success(`Successfully installed '${model}'.`));
        resolve();
      } else {
        const error = new Error(`Ollama install failed with code ${code}`);
        runtime.error(theme.error(error.message));
        reject(error);
      }
    });

    process.on("error", (err) => {
      const error = new Error(
        `Failed to start ollama process: ${err.message}. Is Ollama installed?`,
      );
      runtime.error(theme.error(error.message));
      reject(error);
    });
  });
}
