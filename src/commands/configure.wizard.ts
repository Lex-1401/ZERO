
/**
 * Configuration Wizard Command
 *
 * Implements the interactive setup and configuration wizard for the platform.
 * Delegated to src/commands/configure/ for maintainability and Atomic Modularity.
 */

import { runConfigureWizard as run, promptConfigureSection as prompt } from "./configure/main.js";
import { type ConfigureWizardParams, type ConfigureSectionChoice } from "./configure/types.js";

export type { ConfigureWizardParams, ConfigureSectionChoice };

export async function runConfigureWizard(opts: ConfigureWizardParams, runtime: any = {}) {
  return await run(opts, runtime);
}

export async function promptConfigureSection(runtime: any, hasSelection: boolean): Promise<ConfigureSectionChoice> {
  return await prompt(runtime, hasSelection);
}

export function promptChannelMode(_runtime: any): Promise<any> {
  return Promise.resolve("quickstart"); // Simplified
}
