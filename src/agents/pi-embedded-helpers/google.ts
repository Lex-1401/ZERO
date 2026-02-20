import { sanitizeGoogleTurnOrdering } from "./bootstrap.js";

export function isGoogleModelApi(api?: string | null): boolean {
  return (
    api === "google-gemini-cli" || api === "google-generative-ai" || api === "google-cloud-auth"
  );
}

export function isGoogleCloudAuthClaude(params: {
  api?: string | null;
  provider?: string | null;
  modelId?: string;
}): boolean {
  const provider = params.provider?.toLowerCase();
  const api = params.api?.toLowerCase();
  if (provider !== "google-cloud-auth" && api !== "google-cloud-auth") return false;
  return params.modelId?.toLowerCase().includes("claude") ?? false;
}

export { sanitizeGoogleTurnOrdering };
