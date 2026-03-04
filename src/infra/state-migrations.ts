
/**
 * State Migrations
 *
 * Implements the automated migration of application state between different versions.
 * Delegated to src/infra/migrations/ for maintainability and Atomic Modularity.
 */

import { type ZEROConfig } from "../config/config.js";
import { type LegacyStateDetection, type MigrationLogger } from "./migrations/types.js";
import { detectLegacyStateMigrations as detect, runLegacyStateMigrations as migrate } from "./migrations/core.js";

export type { LegacyStateDetection, MigrationLogger };

export async function detectLegacyStateMigrations(params: any): Promise<LegacyStateDetection> {
  return detect(params);
}

export async function runLegacyStateMigrations(params: any) {
  return migrate(params);
}

export async function autoMigrateLegacyState(params: {
  cfg: ZEROConfig;
  env?: NodeJS.ProcessEnv;
  log?: MigrationLogger;
}) {
  const detected = await detect(params);
  if (detected.sessions.hasLegacy || detected.whatsappAuth.hasLegacy) {
    return await migrate({ detected });
  }
  return { migrated: false, changes: [], warnings: [] };
}
