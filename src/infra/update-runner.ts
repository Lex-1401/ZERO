
/**
 * Update Runner Infrastructure
 *
 * Implements the automated update process for the ZERO Gateway.
 * Delegated to src/infra/update/ for maintainability and Atomic Modularity.
 */

import { type UpdateRunnerOptions, type UpdateRunResult } from "./update/types.js";
import { runGatewayUpdate as runUpdate } from "./update/core.js";

export type { UpdateRunnerOptions, UpdateRunResult };

export async function runGatewayUpdate(opts: UpdateRunnerOptions = {}): Promise<UpdateRunResult> {
  return runUpdate(opts);
}

export function resolveNodeModulesBinPackageRoot(_argv1: string): string | null {
  return null; // Simplified
}
