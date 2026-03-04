// @ts-nocheck
export type { LegacyStateDetection } from "../infra/state-migrations.js";
import {
  autoMigrateLegacyState,
  detectLegacyStateMigrations,
  runLegacyStateMigrations,
} from "../infra/state-migrations.js";
const autoMigrateLegacyAgentDir = async (_args: any) => ({ changes: [], warnings: [] });
function migrateLegacyAgentDir(_args: any) { }
function resetAutoMigrateLegacyAgentDirForTest() { }
function resetAutoMigrateLegacyStateForTest() { }
export {
  autoMigrateLegacyState,
  detectLegacyStateMigrations,
  runLegacyStateMigrations,
  autoMigrateLegacyAgentDir,
  migrateLegacyAgentDir,
  resetAutoMigrateLegacyAgentDirForTest,
  resetAutoMigrateLegacyStateForTest,
};
