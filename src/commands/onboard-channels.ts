
/**
 * Channel Onboarding Command
 *
 * Implements the interactive setup wizard for communication channels.
 * Delegated to src/commands/onboarding/ for maintainability and Atomic Modularity.
 */

import { type ZEROConfig } from "../config/config.js";
import { type RuntimeEnv } from "../runtime.js";
import { type WizardPrompter } from "../wizard/prompts.js";
import { setupChannels as setup } from "./onboarding/wizard.js";

export async function setupChannels(
  cfg: ZEROConfig,
  runtime: RuntimeEnv,
  prompter: WizardPrompter,
  options?: any,
): Promise<ZEROConfig> {
  return setup(cfg, runtime, prompter, options);
}

export function formatAccountLabel(accountId: string): string {
  return accountId; // Simplified
}

export async function noteChannelPrimer(_prompter: WizardPrompter, _channels: any[]) {
  // Intro text for the onboarding process
}
