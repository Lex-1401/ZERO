/**
 * Compliance Tooling (LGPD/GDPR - Item 11 & 12)
 *
 * Provides utilities for data portability (Export) and the right to be forgotten (Purge).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { resolveStateDir } from "../config/paths.js";
import {
  readChannelAllowFromStore,
  removeChannelAllowFromStoreEntry,
} from "../pairing/pairing-store.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("security/compliance");

export type UserDataExport = {
  userId: string;
  channel: string;
  allowlistEntry: boolean;
  sessions: Array<{
    sessionId: string;
    agentId: string;
    updatedAt?: number;
    messages?: any[];
  }>;
};

/**
 * Exports all data related to a specific user (LGPD Art. 18).
 */
export async function exportUserData(
  userId: string,
  channel: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<UserDataExport> {
  const stateDir = resolveStateDir(env);
  const allowlist = await readChannelAllowFromStore(channel as any, env);
  const isAllowlisted = allowlist.includes(userId);

  const exportData: UserDataExport = {
    userId,
    channel,
    allowlistEntry: isAllowlisted,
    sessions: [],
  };

  // Scan all agents for sessions belonging to this user
  const agentsDir = path.join(stateDir, "agents");
  try {
    const agents = await fs.readdir(agentsDir).catch(() => []);
    for (const agentId of agents) {
      const sessionsDir = path.join(agentsDir, agentId, "sessions");
      const sessionsFile = path.join(sessionsDir, "sessions.json");

      try {
        const raw = await fs.readFile(sessionsFile, "utf-8");
        const store = JSON.parse(raw);
        if (store && typeof store.sessions === "object") {
          for (const [key, session] of Object.entries(store.sessions)) {
            const s = session as any;
            // Heuristic to match project-specific session keys (e.g. "telegram:123456")
            if (
              key.includes(`${channel}:${userId}`) ||
              s.lastTo === userId ||
              s.channel === channel
            ) {
              exportData.sessions.push({
                sessionId: s.sessionId || key,
                agentId,
                updatedAt: s.updatedAt,
                // In a real export, we might read the full transcript file here
              });
            }
          }
        }
      } catch {
        // Skip agents without sessions or invalid JSON
      }
    }
  } catch (err) {
    log.error(`Failed to export user data for ${userId}@${channel}`, { error: String(err) });
  }

  return exportData;
}

/**
 * Purges all data related to a specific user (LGPD right to be forgotten).
 */
export async function purgeUserData(
  userId: string,
  channel: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ sessionsDeleted: number; allowlistRemoved: boolean }> {
  let sessionsDeleted = 0;
  let allowlistRemoved = false;

  // 1. Remove from pairing allowlist
  try {
    const result = await removeChannelAllowFromStoreEntry({
      channel: channel as any,
      entry: userId,
      env,
    });
    allowlistRemoved = result.changed;
  } catch (err) {
    log.error(`Failed to remove user ${userId} from allowlist`, { error: String(err) });
  }

  // 2. Delete session files and transcripts
  const stateDir = resolveStateDir(env);
  const agentsDir = path.join(stateDir, "agents");

  try {
    const agents = await fs.readdir(agentsDir).catch(() => []);
    for (const agentId of agents) {
      const sessionsDir = path.join(agentsDir, agentId, "sessions");
      const sessionsFile = path.join(sessionsDir, "sessions.json");

      try {
        const raw = await fs.readFile(sessionsFile, "utf-8");
        const store = JSON.parse(raw);
        if (store && typeof store.sessions === "object") {
          let storeChanged = false;
          for (const [key, session] of Object.entries(store.sessions)) {
            const s = session as any;
            if (
              key.includes(`${channel}:${userId}`) ||
              s.lastTo === userId ||
              s.channel === channel
            ) {
              delete store.sessions[key];
              storeChanged = true;
              sessionsDeleted++;

              // Also try to delete transcript file if it exists
              if (s.transcriptPath) {
                const fullPath = path.isAbsolute(s.transcriptPath)
                  ? s.transcriptPath
                  : path.join(stateDir, s.transcriptPath);
                await fs.unlink(fullPath).catch(() => {});
              }
            }
          }

          if (storeChanged) {
            await fs.writeFile(sessionsFile, JSON.stringify(store, null, 2), "utf-8");
          }
        }
      } catch {
        // Skip
      }
    }
  } catch (err) {
    log.error(`Failed to purge user data for ${userId}@${channel}`, { error: String(err) });
  }

  return { sessionsDeleted, allowlistRemoved };
}
