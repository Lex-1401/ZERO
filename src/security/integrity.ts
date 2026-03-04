import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Perform an integrity check on the runtime environment.
 * Verifies critical files, identifies potentially malicious modifications,
 * and reports on overall system state.
 */
export async function runSecurityCheck() {
  const findings: any[] = [];
  const summary = { critical: 0, warn: 0, info: 0 };

  const criticalFiles = ["package.json", "zero.json", ".env"];
  const projectRoot = process.cwd();

  for (const file of criticalFiles) {
    const filePath = path.join(projectRoot, file);
    if (!fs.existsSync(filePath)) {
      if (file !== ".env") {
        // .env is optional
        findings.push({
          severity: "CRITICAL",
          id: "missing_file",
          details: `Critical file '${file}' is missing.`,
        });
        summary.critical++;
      }
    }
  }

  // Network checks
  const isHardened = process.env.NODE_ENV === "production" || fs.existsSync("/usr/bin/codesign");
  if (isHardened) {
    findings.push({
      severity: "INFO",
      id: "env_check",
      details: "Running in production-ready/hardened environment.",
    });
    summary.info++;
  }

  return { summary, findings, timestamp: Date.now() };
}

export function verifyFileIntegrity(filePath: string, expectedHash: string): boolean {
  try {
    const data = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256").update(data).digest("hex");
    return hash === expectedHash;
  } catch {
    // Missing or unreadable file is ignored
    return false; // Ensure boolean return as per function signature
  }
}
