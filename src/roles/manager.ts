import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import JSON5 from "json5";
import type { RoleDefinition } from "./types.js";
import { loadCronStore, saveCronStore, resolveCronStorePath } from "../cron/store.js";
import type { CronJob, CronPayload } from "../cron/types.js";
import crypto from "node:crypto";

const DEFAULT_ROLES_DIR = path.join(os.homedir(), ".zero", "roles");

export async function loadRoleDefinition(
  roleName: string,
  configDir?: string,
): Promise<RoleDefinition | null> {
  const dir = configDir || DEFAULT_ROLES_DIR;
  const normalizedName = roleName.toLowerCase().replace(/[^a-z0-9_-]/g, "");

  // Try .json first, then .yaml/.yml
  const extensions = [".json", ".json5", ".yaml", ".yml"];

  for (const ext of extensions) {
    const filePath = path.join(dir, `${normalizedName}${ext}`);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      // Basic JSON5 parsing for now, assuming JSON format mainly.
      // If we want YAML support we need a yaml parser dependency or stick to JSON.
      // Given the project uses JSON5 elsewhere, let's stick to JSON5 for now.
      if (ext.includes("yaml") || ext.includes("yml")) {
        // TODO: Add YAML parser if needed. For now warn or skip.
        console.warn(`YAML role parsing not yet implemented for ${filePath}`);
        continue;
      }

      const parsed = JSON5.parse(content) as RoleDefinition;
      return {
        ...parsed,
        name: parsed.name || normalizedName, // ensure name exists
      };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`Failed to load role ${roleName} from ${filePath}:`, e);
      }
    }
  }

  return null;
}

export async function listAvailableRoles(configDir?: string): Promise<string[]> {
  const dir = configDir || DEFAULT_ROLES_DIR;
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((f) => f.endsWith(".json") || f.endsWith(".json5"))
      .map((f) => path.basename(f, path.extname(f)));
  } catch {
    return [];
  }
}

export async function ensureRolesDir(configDir?: string): Promise<void> {
  const dir = configDir || DEFAULT_ROLES_DIR;
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore
  }
}

export async function syncRoleCronJobs(
  role: RoleDefinition,
  cronStorePath?: string,
): Promise<void> {
  if (!role.cronJobs || role.cronJobs.length === 0) return;

  const storePath = resolveCronStorePath(cronStorePath);
  const store = await loadCronStore(storePath);

  let addedCount = 0;
  for (let i = 0; i < role.cronJobs.length; i++) {
    const roleJob = role.cronJobs[i];

    // Check for duplicates by checking if any job has the same description (namespaced by role)
    const description = roleJob.description
      ? `[${role.name}] ${roleJob.description}`
      : `[${role.name}] Task ${i + 1}`;

    // We also check if the schedule matches, to avoid re-adding if it was modified
    const exists = store.jobs.some((j) => j.description === description);
    if (exists) continue;

    const payload: CronPayload =
      roleJob.action === "message"
        ? {
            kind: "agentTurn",
            message: roleJob.message || "Execute scheduled task",
          }
        : {
            kind: "agentTurn",
            message: `Execute tool ${roleJob.tool} with params: ${JSON.stringify(roleJob.params ?? {})}`,
          };

    const newJob: CronJob = {
      id: crypto.randomUUID(),
      name: roleJob.description || `${role.name}-${i}`,
      description,
      enabled: true,
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
      schedule: { kind: "cron", expr: roleJob.schedule },
      sessionTarget: "main",
      wakeMode: "now",
      payload,
      state: {},
    };

    store.jobs.push(newJob);
    addedCount++;
  }

  if (addedCount > 0) {
    await saveCronStore(storePath, store);
    // eslint-disable-next-line no-console
    console.log(`Synced ${addedCount} cron jobs from role '${role.name}' to ${storePath}`);
  }
}
