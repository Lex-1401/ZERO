import { runExec } from "../process/exec.js";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";

export async function ensureBinary(
  name: string,
  exec: typeof runExec = runExec,
  runtime: RuntimeEnv = defaultRuntime,
): Promise<void> {
  const isWindows = process.platform === "win32";
  const cmd = isWindows ? "where" : "which";

  // Abort early if a required CLI tool is missing.
  await exec(cmd, [name]).catch(() => {
    runtime.error(`Missing required binary: ${name}. Please install it.`);
    runtime.exit(1);
  });
}
