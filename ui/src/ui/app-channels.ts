import {
  loadChannels,
  logoutWhatsApp,
  startWhatsAppLogin,
  waitWhatsAppLogin,
} from "./controllers/channels";
import { loadConfig, saveConfig } from "./controllers/config";
import type { ZEROApp } from "./app";


export async function handleWhatsAppStart(host: ZEROApp, force: boolean) {
  await startWhatsAppLogin(host, force);
  await loadChannels(host, true);
}

export async function handleWhatsAppWait(host: ZEROApp) {
  await waitWhatsAppLogin(host);
  await loadChannels(host, true);
}

export async function handleWhatsAppLogout(host: ZEROApp) {
  await logoutWhatsApp(host);
  await loadChannels(host, true);
}

export async function handleChannelConfigSave(host: ZEROApp) {
  await saveConfig(host);
  await loadConfig(host);
  await loadChannels(host, true);
}

export async function handleChannelConfigReload(host: ZEROApp) {
  await loadConfig(host);
  await loadChannels(host, true);
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


