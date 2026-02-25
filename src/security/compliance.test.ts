import { describe, expect, it } from "vitest";
import { exportUserData, purgeUserData } from "./compliance";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

describe("Compliance User Data (LGPD/GDPR)", () => {
    it("should export user data structure correctly", async () => {
        const userId = "12345";
        const channel = "telegram";

        // Mocking env to use a temp dir
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "zero-test-"));
        const env = { ZERO_STATE_DIR: tmpDir };

        try {
            const result = await exportUserData(userId, channel, env);
            expect(result).toBeDefined();
            expect(result.userId).toBe(userId);
            expect(result.channel).toBe(channel);
            expect(Array.isArray(result.sessions)).toBe(true);
        } finally {
            await fs.rm(tmpDir, { recursive: true, force: true });
        }
    });

    it("should handle purge requests without errors", async () => {
        const userId = "12345";
        const channel = "telegram";

        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "zero-test-purge-"));
        const env = { ZERO_STATE_DIR: tmpDir };

        try {
            const result = await purgeUserData(userId, channel, env);
            expect(result.sessionsDeleted).toBeDefined();
            expect(result.allowlistRemoved).toBeDefined();
        } finally {
            await fs.rm(tmpDir, { recursive: true, force: true });
        }
    });
});
