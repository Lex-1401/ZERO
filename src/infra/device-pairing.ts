
import { randomUUID } from "node:crypto";
import { type DevicePairingPendingRequest, type DeviceAuthToken, type PairedDevice, type DevicePairingList } from "./device-pairing/types.js";
import {
  normalizeDeviceId,
  normalizeRole,
  mergeRoles,
  mergeScopes,
  normalizeScopes,
  scopesAllow,
  newToken,
  summarizeDeviceTokens,
} from "./device-pairing/utils.js";
import { loadState, persistState, withLock } from "./device-pairing/state.js";

export type { DevicePairingPendingRequest, DeviceAuthToken, PairedDevice, DevicePairingList };

export async function listDevicePairing(baseDir?: string): Promise<DevicePairingList> {
  const state = await loadState(baseDir);
  return {
    pending: Object.values(state.pendingById).sort((a, b) => b.ts - a.ts),
    paired: Object.values(state.pairedByDeviceId).sort((a, b) => b.approvedAtMs - a.approvedAtMs),
  };
}

export async function getPairedDevice(deviceId: string, baseDir?: string): Promise<PairedDevice | null> {
  const state = await loadState(baseDir);
  const id = normalizeDeviceId(deviceId);
  return state.pairedByDeviceId[id] || null;
}

export async function requestDevicePairing(
  req: Omit<DevicePairingPendingRequest, "requestId" | "ts" | "isRepair">,
  baseDir?: string,
): Promise<{ status: "pending"; request: DevicePairingPendingRequest; created: boolean }> {
  return withLock(async () => {
    const state = await loadState(baseDir);
    const deviceId = normalizeDeviceId(req.deviceId);
    const existingReq = Object.values(state.pendingById).find((r) => normalizeDeviceId(r.deviceId) === deviceId);
    if (existingReq) {
      return { status: "pending", request: existingReq, created: false };
    }
    const requestId = randomUUID();
    const ts = Date.now();
    const request: DevicePairingPendingRequest = { ...req, deviceId, requestId, ts };
    state.pendingById[requestId] = request;
    await persistState(state, baseDir);
    return { status: "pending", request, created: true };
  });
}

export async function approveDevicePairing(
  requestId: string,
  baseDir?: string,
): Promise<{ requestId: string; device: PairedDevice } | null> {
  return withLock(async () => {
    const state = await loadState(baseDir);
    const req = state.pendingById[requestId];
    if (!req) return null;
    delete state.pendingById[requestId];
    const deviceId = normalizeDeviceId(req.deviceId);
    const now = Date.now();
    const existing = state.pairedByDeviceId[deviceId];
    const device: PairedDevice = {
      ...req,
      deviceId,
      createdAtMs: existing?.createdAtMs || req.ts,
      approvedAtMs: now,
      tokens: existing?.tokens || {},
      role: normalizeRole(req.role) || existing?.role || "device",
      roles: mergeRoles(existing?.roles, req.roles, req.role),
      scopes: mergeScopes(existing?.scopes, req.scopes),
    };
    state.pairedByDeviceId[deviceId] = device;
    await persistState(state, baseDir);
    return { requestId, device };
  });
}

export async function rejectDevicePairing(
  requestId: string,
  baseDir?: string,
): Promise<{ requestId: string; deviceId: string } | null> {
  return withLock(async () => {
    const state = await loadState(baseDir);
    const req = state.pendingById[requestId];
    if (!req) return null;
    delete state.pendingById[requestId];
    await persistState(state, baseDir);
    return { requestId, deviceId: req.deviceId };
  });
}

export async function updatePairedDeviceMetadata(
  deviceId: string,
  patch: Partial<Omit<PairedDevice, "deviceId" | "createdAtMs" | "approvedAtMs">>,
  baseDir?: string,
): Promise<void> {
  return withLock(async () => {
    const state = await loadState(baseDir);
    const id = normalizeDeviceId(deviceId);
    const device = state.pairedByDeviceId[id];
    if (!device) return;
    Object.assign(device, patch);
    if (patch.role) device.role = normalizeRole(patch.role) || device.role;
    if (patch.roles) device.roles = mergeRoles(device.roles, patch.roles);
    if (patch.scopes) device.scopes = mergeScopes(device.scopes, patch.scopes);
    await persistState(state, baseDir);
  });
}

export async function verifyDeviceToken(params: {
  deviceId: string;
  token: string;
  role: string;
  scopes: string[];
  baseDir?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const state = await loadState(params.baseDir);
  const id = normalizeDeviceId(params.deviceId);
  const device = state.pairedByDeviceId[id];
  if (!device || !device.tokens) return { ok: false, reason: "Device not paired" };
  const tokenRecord = device.tokens[params.token];
  if (!tokenRecord) return { ok: false, reason: "Invalid token" };
  if (tokenRecord.revokedAtMs) return { ok: false, reason: "Token revoked" };
  const deviceRoles = mergeRoles(device.role, device.roles) || [];
  if (!deviceRoles.includes(params.role) && tokenRecord.role !== params.role) {
    return { ok: false, reason: "Unauthorized role" };
  }
  const allowedScopes = normalizeScopes(tokenRecord.scopes);
  if (!scopesAllow(params.scopes, allowedScopes)) return { ok: false, reason: "Insufficient scopes" };
  tokenRecord.lastUsedAtMs = Date.now();
  await persistState(state, params.baseDir);
  return { ok: true };
}

export async function ensureDeviceToken(params: {
  deviceId: string;
  role: string;
  scopes: string[];
  baseDir?: string;
}): Promise<DeviceAuthToken | null> {
  return withLock(async () => {
    const state = await loadState(params.baseDir);
    const id = normalizeDeviceId(params.deviceId);
    const device = state.pairedByDeviceId[id];
    if (!device) return null;
    if (!device.tokens) device.tokens = {};
    const normRole = normalizeRole(params.role);
    const normScopes = normalizeScopes(params.scopes);
    const existing = Object.values(device.tokens).find((t) => !t.revokedAtMs && t.role === normRole && JSON.stringify(normalizeScopes(t.scopes)) === JSON.stringify(normScopes));
    if (existing) return existing;
    const token = newToken();
    const record: DeviceAuthToken = { token, role: normRole || "device", scopes: normScopes, createdAtMs: Date.now() };
    device.tokens[token] = record;
    await persistState(state, params.baseDir);
    return record;
  });
}

export async function rotateDeviceToken(params: {
  deviceId: string;
  role: string;
  scopes?: string[];
  baseDir?: string;
}): Promise<DeviceAuthToken | null> {
  return withLock(async () => {
    const state = await loadState(params.baseDir);
    const id = normalizeDeviceId(params.deviceId);
    const device = state.pairedByDeviceId[id];
    if (!device || !device.tokens) return null;
    const normRole = normalizeRole(params.role);
    const normScopes = params.scopes ? normalizeScopes(params.scopes) : undefined;
    const existing = Object.values(device.tokens).find((t) => !t.revokedAtMs && t.role === normRole && (!normScopes || JSON.stringify(normalizeScopes(t.scopes)) === JSON.stringify(normScopes)));
    if (existing) existing.revokedAtMs = Date.now();
    const token = newToken();
    const record: DeviceAuthToken = { token, role: normRole || "device", scopes: normScopes || existing?.scopes || [], createdAtMs: Date.now(), rotatedAtMs: Date.now() };
    if (!device.tokens) device.tokens = {};
    device.tokens[token] = record;
    await persistState(state, params.baseDir);
    return record;
  });
}

export async function revokeDeviceToken(params: {
  deviceId: string;
  role: string;
  baseDir?: string;
}): Promise<DeviceAuthToken | null> {
  return withLock(async () => {
    const state = await loadState(params.baseDir);
    const id = normalizeDeviceId(params.deviceId);
    const device = state.pairedByDeviceId[id];
    if (!device || !device.tokens) return null;
    const normRole = normalizeRole(params.role);
    const existing = Object.values(device.tokens).find((t) => !t.revokedAtMs && t.role === normRole);
    if (!existing) return null;
    existing.revokedAtMs = Date.now();
    await persistState(state, params.baseDir);
    return existing;
  });
}

export { summarizeDeviceTokens };
