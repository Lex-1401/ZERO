import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { loadDotEnv } from "../infra/dotenv.js";
import { normalizeEnv } from "../infra/env.js";
import { isMainModule } from "../infra/is-main.js";
import { ensureZEROCliOnPath } from "../infra/path-env.js";
import { assertSupportedRuntime } from "../infra/runtime-guard.js";
import { formatUncaughtError } from "../infra/errors.js";
import { installUnhandledRejectionHandler } from "../infra/unhandled-rejections.js";
import { enableConsoleCapture } from "../logging.js";
import { getPrimaryCommand } from "./argv.js";
import { tryRouteCli } from "./route.js";

/**
 * Normalizes the process arguments by transforming the `--update` flag into a dedicated `update` command.
 *
 * [PT] Reescreve os argumentos do processo para converter a flag `--update` no comando `update`.
 *
 * This normalization facilitates a more intuitive CLI interface, allowing `zero --update`
 * to be semantically equivalent to `zero update`, thereby streamlining self-update workflows.
 *
 * @param argv - The raw command-line argument array.
 * @returns A restructured argument array with the flag rewritten as a command.
 */
export function rewriteUpdateFlagArgv(argv: string[]): string[] {
  const index = argv.indexOf("--update");
  if (index === -1) return argv;

  const next = [...argv];
  next.splice(index, 1, "update");
  return next;
}

/**
 * The primary execution entry point for the ZERO CLI.
 *
 * [PT] A função principal de execução para a CLI do ZERO.
 *
 * This function orchestrates the CLI's initialization sequence, ensuring environmental
 * stability and runtime compliance. Key responsibilities include:
 * 1. **Argument Sanitization**: Handling platform-specific (Windows) argument inconsistencies.
 * 2. **Environment Bootstraps**: Loading `.env` configurations and normalizing process variables.
 * 3. **Runtime Validation**: Enforcing Node.js version requirements via `assertSupportedRuntime`.
 * 4. **Routing & Dispatch**: Delegating to specialized sub-CLIs or the primary Commander-based program.
 * 5. **Error Governance**: Installing global exception and rejection handlers for graceful failure recovery.
 * 6. **Telemetry Setup**: Enabling structured console logging and telemetry capture.
 *
 * @param argv - The process arguments to be parsed (defaults to `process.argv`).
 * @returns A Promise that resolves once the dispatched command has completed execution.
 */
export async function runCli(argv: string[] = process.argv) {
  const normalizedArgv = stripWindowsNodeExec(argv);
  loadDotEnv({ quiet: true });
  normalizeEnv();
  console.log("[debug] ZERO_CONFIG_PATH:", process.env.ZERO_CONFIG_PATH);
  console.log("[debug] ZERO_AGENT_MODEL:", process.env.ZERO_AGENT_MODEL);
  ensureZEROCliOnPath();

  // Enforce the minimum supported runtime before doing any work.
  assertSupportedRuntime();

  if (await tryRouteCli(normalizedArgv)) return;

  // Capture all console output into structured logs while keeping stdout/stderr behavior.
  enableConsoleCapture();

  const { buildProgram } = await import("./program.js");
  const program = buildProgram();

  // Global error handlers to prevent silent crashes from unhandled rejections/exceptions.
  // These log the error and exit gracefully instead of crashing without trace.
  installUnhandledRejectionHandler();

  process.on("uncaughtException", (error) => {
    console.error("[zero] Uncaught exception:", formatUncaughtError(error));
    process.exit(1);
  });

  const parseArgv = rewriteUpdateFlagArgv(normalizedArgv);
  // Register the primary subcommand if one exists (for lazy-loading)
  const primary = getPrimaryCommand(parseArgv);
  if (primary) {
    const { registerSubCliByName } = await import("./program/register.subclis.js");
    await registerSubCliByName(program, primary);
  }
  await program.parseAsync(parseArgv);
}

/**
 * Aggressively sanitizes the argument list on Windows environments to identify and excise
 * redundant Node.js executable paths.
 *
 * [PT] Sanitiza agressivamente a lista de argumentos no Windows para remover o caminho do executável do Node.js.
 *
 * Windows argument parsing during shell invocation can be non-deterministic, often injecting
 * the Node.js binary path in unexpected indices. This utility employs heuristic normalization
 * and path comparisons to ensure a stable `[node, script, ...args]` sequence.
 *
 * @param argv - The raw process arguments.
 * @returns A sanitized and consistent argument array.
 * @internal
 */
function stripWindowsNodeExec(argv: string[]): string[] {
  if (process.platform !== "win32") return argv;
  const stripControlChars = (value: string): string => {
    let out = "";
    for (let i = 0; i < value.length; i += 1) {
      const code = value.charCodeAt(i);
      if (code >= 32 && code !== 127) {
        out += value[i];
      }
    }
    return out;
  };
  const normalizeArg = (value: string): string =>
    stripControlChars(value)
      .replace(/^['"]+|['"]+$/g, "")
      .trim();
  const normalizeCandidate = (value: string): string =>
    normalizeArg(value).replace(/^\\\\\\?\\/, "");
  const execPath = normalizeCandidate(process.execPath);
  const execPathLower = execPath.toLowerCase();
  const execBase = path.basename(execPath).toLowerCase();
  const isExecPath = (value: string | undefined): boolean => {
    if (!value) return false;
    const normalized = normalizeCandidate(value);
    if (!normalized) return false;
    const lower = normalized.toLowerCase();
    return (
      lower === execPathLower ||
      path.basename(lower) === execBase ||
      lower.endsWith("\\node.exe") ||
      lower.endsWith("/node.exe") ||
      lower.includes("node.exe") ||
      (path.basename(lower) === "node.exe" && fs.existsSync(normalized))
    );
  };
  const filtered = argv.filter((arg, index) => index === 0 || !isExecPath(arg));
  if (filtered.length < 3) return filtered;
  const cleaned = [...filtered];
  if (isExecPath(cleaned[1])) {
    cleaned.splice(1, 1);
  }
  if (isExecPath(cleaned[2])) {
    cleaned.splice(2, 1);
  }
  return cleaned;
}

/**
 * Determines whether the current module is the primary entry point for the CLI process.
 *
 * @returns `true` if this module is the main entry point, `false` otherwise.
 */
export function isCliMainModule(): boolean {
  return isMainModule({ currentFile: fileURLToPath(import.meta.url) });
}
