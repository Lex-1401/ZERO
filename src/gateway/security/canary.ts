import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

/**
 * CanaryTrap
 *
 * A minimalistic security module designed to detect unauthorized access to sensitive directories.
 * It places "bait" files and monitors access patterns. If a bait file is touched,
 * it triggers a panic mode.
 */

const TRAP_DIR = path.join(os.homedir(), ".zero", ".trap");
const BAIT_FILES = ["secrets.env", "wallet_keys.txt", "admin_password.json"];

export class CanaryTrap {
  private static watcher: any = null;

  static async deploy() {
    try {
      await fs.mkdir(TRAP_DIR, { recursive: true });

      for (const bait of BAIT_FILES) {
        const baitPath = path.join(TRAP_DIR, bait);
        // Fill with fake, enticing data
        const fakeContent = CanaryTrap.generateFakeContent(bait);
        await fs.writeFile(baitPath, fakeContent, { mode: 0o600 });
      }

      console.log(`[Zero Sentinel] Canary Trap deployed at ${TRAP_DIR}`);
      // In a real implementation, we would start an fs.watch here
      // CanaryTrap.startWatch();
    } catch (err) {
      console.error("[Zero Sentinel] Failed to deploy Canary Trap:", err);
    }
  }

  private static generateFakeContent(filename: string): string {
    if (filename.includes("env")) return "AWS_KEY=AKIA...FAKE...\nSTRIPE_KEY=sk_live_...FAKE...";
    if (filename.includes("wallet"))
      return "seed phrase: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    return JSON.stringify({ password: "correct-horse-battery-staple", admin: true });
  }
}
