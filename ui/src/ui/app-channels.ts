import {
  loadChannels,
  logoutWhatsApp,
  startWhatsAppLogin,
  waitWhatsAppLogin,
} from "./controllers/channels";
import { loadConfig, saveConfig } from "./controllers/config";
import type { AppViewState } from "./app-view-state";

export async function handleWhatsAppStart(host: AppViewState, force: boolean) {
  await startWhatsAppLogin(host as any, force);
  await loadChannels(host as any, true);
}

export async function handleWhatsAppWait(host: AppViewState) {
  await waitWhatsAppLogin(host as any);
  await loadChannels(host as any, true);
}

export async function handleWhatsAppLogout(host: AppViewState) {
  await logoutWhatsApp(host as any);
  await loadChannels(host as any, true);
}

export async function handleChannelConfigSave(host: AppViewState) {
  await saveConfig(host as any);
  await loadConfig(host as any);
  await loadChannels(host as any, true);
}

export async function handleChannelConfigReload(host: AppViewState) {
  await loadConfig(host as any);
  await loadChannels(host as any, true);
}

function parseValidationErrors(details: unknown): Record<string, string> {
  if (!Array.isArray(details)) return {};
  const errors: Record<string, string> = {};
  for (const entry of details) {
    if (typeof entry !== "string") continue;
    const [rawField, ...rest] = entry.split(":");
    if (!rawField || rest.length === 0) continue;
    const field = rawField.trim();
    const message = rest.join(":").trim();
    if (field && message) errors[field] = message;
  }
  return errors;
}
