import type { ZEROConfig } from "../config/config.js";
import type { WizardPrompter } from "../wizard/prompts.js";

export async function applyDefaultModelChoice(params: {
  config: ZEROConfig;
  setDefaultModel: boolean;
  defaultModel: string;
  applyDefaultConfig: (config: ZEROConfig) => ZEROConfig;
  applyProviderConfig: (config: ZEROConfig) => ZEROConfig;
  noteDefault?: string;
  noteAgentModel: (model: string) => Promise<void>;
  prompter: WizardPrompter;
}): Promise<{ config: ZEROConfig; agentModelOverride?: string }> {
  if (params.setDefaultModel) {
    const next = params.applyDefaultConfig(params.config);
    if (params.noteDefault) {
      await params.prompter.note(`Default model set to ${params.noteDefault}`, "Model configured");
    }
    return { config: next };
  }

  const next = params.applyProviderConfig(params.config);
  await params.noteAgentModel(params.defaultModel);
  return { config: next, agentModelOverride: params.defaultModel };
}
