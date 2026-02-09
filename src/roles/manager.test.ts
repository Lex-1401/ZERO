import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { loadRoleDefinition, syncRoleCronJobs } from "./manager.js";
import { saveCronStore } from "../cron/store.js";

describe("Role Manager", () => {
  let tmpDir: string;
  let rolesDir: string;
  let cronStorePath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "zero-roles-test-"));
    rolesDir = path.join(tmpDir, "roles");
    cronStorePath = path.join(tmpDir, "cron", "jobs.json");
    await fs.mkdir(rolesDir, { recursive: true });
    await fs.mkdir(path.dirname(cronStorePath), { recursive: true });

    // Initialize empty cron store
    await saveCronStore(cronStorePath, { version: 1, jobs: [] });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("should load a role definition from JSON", async () => {
    const roleContent = {
      name: "TestRole",
      description: "A test role",
      systemPrompt: "You are a tester.",
      skills: ["test-skill"],
      cronJobs: [],
    };

    await fs.writeFile(path.join(rolesDir, "testrole.json"), JSON.stringify(roleContent));

    const role = await loadRoleDefinition("testrole", rolesDir);
    expect(role).not.toBeNull();
    expect(role?.name).toBe("TestRole");
    expect(role?.description).toBe("A test role");
    expect(role?.systemPrompt).toBe("You are a tester.");
    expect(role?.skills).toEqual(["test-skill"]);
  });

  it("should sync cron jobs from role to cron store", async () => {
    const role = {
      name: "Reporter",
      cronJobs: [
        {
          schedule: "0 8 * * *",
          action: "message" as const,
          message: "Daily report",
          description: "Send daily report",
        },
      ],
    };

    await syncRoleCronJobs(role, cronStorePath);

    const storeContent = await fs.readFile(cronStorePath, "utf-8");
    const store = JSON.parse(storeContent);

    expect(store.jobs).toHaveLength(1);
    expect(store.jobs[0].schedule).toEqual({ kind: "cron", expr: "0 8 * * *" });
    expect(store.jobs[0].payload).toEqual({ kind: "agentTurn", message: "Daily report" });
    expect(store.jobs[0].description).toBe("[Reporter] Send daily report");
  });

  it("should not duplicate cron jobs on re-sync", async () => {
    const role = {
      name: "Reporter",
      cronJobs: [
        {
          schedule: "0 8 * * *",
          action: "message" as const,
          message: "Daily report",
          description: "Send daily report",
        },
      ],
    };

    await syncRoleCronJobs(role, cronStorePath);
    await syncRoleCronJobs(role, cronStorePath);

    const storeContent = await fs.readFile(cronStorePath, "utf-8");
    const store = JSON.parse(storeContent);

    expect(store.jobs).toHaveLength(1);
  });
});
