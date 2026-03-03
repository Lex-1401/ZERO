#!/usr/bin/env node
import process from "node:process";
import { fileURLToPath } from "node:url";

import { getReplyFromConfig } from "./auto-reply/reply.js";
import { applyTemplate } from "./auto-reply/templating.js";
import { monitorWebChannel } from "./channel-web.js";
import { createDefaultDeps } from "./cli/deps.js";
import { promptYesNo } from "./cli/prompt.js";
import { waitForever } from "./cli/wait.js";
import { loadConfig } from "./config/config.js";
import {
  deriveSessionKey,
  loadSessionStore,
  resolveSessionKey,
  resolveStorePath,
  saveSessionStore,
} from "./config/sessions.js";
import { ensureBinary } from "./infra/binaries.js";
import { loadDotEnv } from "./infra/dotenv.js";
import { normalizeEnv } from "./infra/env.js";
import { isMainModule } from "./infra/is-main.js";
import { ensureZEROCliOnPath } from "./infra/path-env.js";
import {
  describePortOwner,
  ensurePortAvailable,
  handlePortError,
  PortInUseError,
} from "./infra/ports.js";
import { assertSupportedRuntime } from "./infra/runtime-guard.js";
import { formatUncaughtError } from "./infra/errors.js";
import { installUnhandledRejectionHandler } from "./infra/unhandled-rejections.js";
import { enableConsoleCapture } from "./logging.js";
import { runCommandWithTimeout, runExec } from "./process/exec.js";
import { assertWebChannel, normalizeE164, toWhatsappJid } from "./utils.js";

/**
 * Main module for the ZERO distribution.
 *
 * This file serves as both a library of core utilities and the secondary entry point
 * for the CLI when run directly via Node.js. It handles environment setup,
 * runtime validation, and command execution using Commander.
 */

loadDotEnv({ quiet: true });
normalizeEnv();
ensureZEROCliOnPath();

// Capture all console output into structured logs while keeping stdout/stderr behavior.
enableConsoleCapture();

// Enforce the minimum supported runtime before doing any work.
assertSupportedRuntime();

import { buildProgram } from "./cli/program.js";

/**
 * CLI Program instance created via Commander.
 */
const program = buildProgram();

export {
  /** Asserts that a channel is a web channel. */
  assertWebChannel,
  /** Applies templates to strings, replacing placeholders. */
  applyTemplate,
  /** Creates default dependencies for CLI commands. */
  createDefaultDeps,
  /** Derives a session key from channel and participant IDs. */
  deriveSessionKey,
  /** Finds and describes the process owning a specific port. */
  describePortOwner,
  /** Ensures a binary is present or downloads it. */
  ensureBinary,
  /** checks if a port is available, or errors. */
  ensurePortAvailable,
  /** Resolves and replies to messages based on configuration. */
  getReplyFromConfig,
  /** Handles common EADDRINUSE errors. */
  handlePortError,
  /** Loads the main ZERO configuration. */
  loadConfig,
  /** Loads the session store from disk. */
  loadSessionStore,
  /** Monitors a web channel for incoming messages. */
  monitorWebChannel,
  /** Normalizes a phone number to E.164 format. */
  normalizeE164,
  /** Error thrown when a port is already in use. */
  PortInUseError,
  /** Prompts the user for a Yes/No confirmation. */
  promptYesNo,
  /** Resolves a session key from a message or group ID. */
  resolveSessionKey,
  /** Resolves the absolute path to a session store file. */
  resolveStorePath,
  /** Runs a shell command with a specified timeout. */
  runCommandWithTimeout,
  /** Executes a command and returns the output. */
  runExec,
  /** Saves the session store to disk. */
  saveSessionStore,
  /** Converts a number to a WhatsApp JID. */
  toWhatsappJid,
  /** Waits indefinitely (unresolved promise). */
  waitForever,
};

/**
 * Checks if the current file is the main module being executed.
 */
const isMain = isMainModule({
  currentFile: fileURLToPath(import.meta.url),
});

if (isMain) {
  // Global error handlers to prevent silent crashes from unhandled rejections/exceptions.
  // These log the error and exit gracefully instead of crashing without trace.
  installUnhandledRejectionHandler();

  process.on("uncaughtException", (error) => {
    console.error("[zero] Uncaught exception:", formatUncaughtError(error));
    process.exit(1);
  });

  void program.parseAsync(process.argv).catch((err) => {
    console.error("[zero] CLI failed:", formatUncaughtError(err));
    process.exit(1);
  });
}
