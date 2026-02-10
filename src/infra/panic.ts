import { triggerPanic, resetPanic, isPanicMode } from "@zero/ratchet";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveGatewayLockDir, resolveStateDir } from "../config/paths.js";

export { triggerPanic, resetPanic, isPanicMode };

/**
 * Triggers a system-wide panic mode.
 * Implementation Details:
 * 1. Sets the global Rust atomic PANIC_MODE flag.
 * 2. Kills any running gateway processes via lock file inspection.
 * 3. Logs the emergency event to a persistent panic log.
 */
export async function executePanic() {
  console.error("!!! PANIC BUTTON TRIGGERED !!!");

  // 1. Trigger Rust-level panic (immediately affects all native engines)
  triggerPanic("INTERNAL_EMERGENCY_2024");

  // 2. Kill the gateway process if running
  try {
    const lockDir = resolveGatewayLockDir();
    const files = await fs.readdir(lockDir).catch(() => []);
    for (const file of files) {
      if (file.startsWith("gateway.") && file.endsWith(".lock")) {
        const lockPath = path.join(lockDir, file);
        const raw = await fs.readFile(lockPath, "utf8");
        const payload = JSON.parse(raw);
        if (payload.pid) {
          console.warn(`Terminating gateway process (PID: ${payload.pid})...`);
          try {
            process.kill(payload.pid, "SIGKILL");
          } catch {
            // Might already be dead or no permission
          }
        }
        await fs.rm(lockPath, { force: true });
      }
    }
  } catch (error) {
    console.error("Secondary panic action (Gateway shutdown) failed:", error);
  }

  // 3. Persistent log for audit
  try {
    const stateDir = resolveStateDir(process.env);
    const panicLogPath = path.join(stateDir, "panic.log");
    const timestamp = new Date().toISOString();
    await fs.appendFile(panicLogPath, `[${timestamp}] CRITICAL: System-wide panic executed.\n`);
  } catch {
    // Fail silently on log error to ensure panic completion
  }

  return true;
}
