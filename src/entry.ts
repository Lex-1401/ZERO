#!/usr/bin/env node
import process from "node:process";

import { applyCliProfileEnv, parseCliProfileArgs } from "./cli/profile.js";
import { installProcessWarningFilter } from "./infra/warnings.js";
import {
  ensureExperimentalWarningSuppressed,
  normalizeWindowsArgv,
} from "./process/entry-utils.js";

/**
 * Definitive Bootstraper for the ZERO Agentic Personal Operating System (A-POS) CLI.
 *
 * [PT] Ponto de entrada definitivo para o bootstrap da CLI do A-POS ZERO.
 *
 * This module orchestrates the cold-start sequence of the ZERO runtime, executing
 * critical environment normalization and process governance before delegating to the
 * functional core.
 *
 * The bootstrap lifecycle includes:
 * 1. **Signal Mitigation**: Installing process warning filters to ensure a clean telemetry surface.
 * 2. **Cross-Platform Normalization**: Canonicalizing argument vectors (argv) for Windows/UNIX parity.
 * 3. **Environmental Hardening**: Suppressing experimental Node.js warnings and managing
 *    CLI profiles through dynamic environment injection.
 * 4. **Process Delegation**: Orchestrating the transition to the primary CLI execution logic (`run-main.ts`).
 */
process.title = "zero";
installProcessWarningFilter();

if (process.argv.includes("--no-color")) {
  process.env.NO_COLOR = "1";
  process.env.FORCE_COLOR = "0";
}

// 1. Normalize argv (Windows compatibility)
process.argv = normalizeWindowsArgv(process.argv);

// 2. Ensure experimental warnings are suppressed (respawns if necessary)
if (!ensureExperimentalWarningSuppressed()) {
  // 3. Parse and apply profile args (--profile)
  const parsed = parseCliProfileArgs(process.argv);
  if (!parsed.ok) {
    console.error(`[zero] ${parsed.error}`);
    process.exit(2);
  }

  if (parsed.profile) {
    applyCliProfileEnv({ profile: parsed.profile });
    process.argv = parsed.argv;
  }

  // 4. Run Main CLI
  import("./cli/run-main.js")
    .then(({ runCli }) => runCli(process.argv))
    .catch((error) => {
      console.error(
        "[zero] Failed to start CLI:",
        error instanceof Error ? (error.stack ?? error.message) : error,
      );
      process.exitCode = 1;
    });
}
