import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
import { applyAuthChoicePluginProvider } from "./auth-choice.apply.plugin-provider.js";

export async function applyAuthChoiceGoogleCloudAuth(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  return await applyAuthChoicePluginProvider(params, {
    authChoice: "google-cloud-auth",
    pluginId: "google-cloud-auth",
    providerId: "google-cloud-auth",
    methodId: "oauth",
    label: "Google Cloud Auth",
  });
}

