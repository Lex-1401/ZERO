import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("sentinel");

export type ToolFailureDiagnostic = {
  rootCause: string;
  suggestedFix: string;
  severity: "low" | "medium" | "high" | "critical";
  requiresRetry: boolean;
};

/**
 * Sentinel: Advanced DevSecOps Diagnostic Engine (224 Q.I. Tier)
 *
 * [PT] Sentinel: Mecanismo de Diagnóstico Avançado DevSecOps.
 */
export class Sentinel {
  /**
   * Analyzes a tool failure (e.g., bash exit code != 0) and generates a PhD-level diagnostic.
   */
  static analyzeBashFailure(
    command: string,
    exitCode: number,
    stdout: string,
    stderr: string,
  ): ToolFailureDiagnostic {
    const output = (stdout + "\n" + stderr).toLowerCase();

    // Pattern 1: Missing dependencies
    if (
      output.includes("command not found") ||
      output.includes("module not found") ||
      output.includes("cannot find module")
    ) {
      const missing = this.extractMissingDependency(output);
      return {
        rootCause: `Missing environment dependency: ${missing || "unknown package"}.`,
        suggestedFix: `Install the missing dependency using your package manager (npm, brew, apt).`,
        severity: "medium",
        requiresRetry: true,
      };
    }

    // Pattern 2: Permission issues
    if (output.includes("permission denied") || output.includes("eacces")) {
      return {
        rootCause: "Principal-Access-Control violation (EACCES).",
        suggestedFix:
          "Check write permissions or use a sandboxed directory. Do not use sudo unless in emergency protocol.",
        severity: "high",
        requiresRetry: false,
      };
    }

    // Pattern 3: Syntax errors in generated code
    if (output.includes("syntaxerror") || output.includes("unexpected token")) {
      return {
        rootCause: "Syntactic integrity breach in generated artifact.",
        suggestedFix:
          "Perform a static analysis check (lint) and correct the syntax error identified in the output.",
        severity: "medium",
        requiresRetry: true,
      };
    }

    // Pattern 4: Connection/Network
    if (
      output.includes("econnrefused") ||
      output.includes("timeout") ||
      output.includes("network unreachable")
    ) {
      return {
        rootCause: "Network topology disruption or endpoint unavailability.",
        suggestedFix:
          "Verify connectivity to the target gateway or wait for the service to stabilize.",
        severity: "medium",
        requiresRetry: true,
      };
    }

    // Default
    return {
      rootCause: `Unspecified execution failure (Exit Code: ${exitCode}).`,
      suggestedFix:
        "Analyze the runtime logs and verify if the command parameters align with the current system state.",
      severity: "low",
      requiresRetry: true,
    };
  }

  private static extractMissingDependency(output: string): string | null {
    const npmMatch = output.match(/cannot find module '([^']+)'/);
    if (npmMatch) return npmMatch[1];
    const cmdMatch = output.match(/([^:\s]+): command not found/);
    if (cmdMatch) return cmdMatch[1];
    return null;
  }

  /**
   * Wraps a tool output with Sentinel Diagnostic Metadata.
   */
  static wrapError(originalError: string, diagnostic: ToolFailureDiagnostic): string {
    return [
      `❌ [SENTINEL DIAGNOSTIC - SECURITY LEVEL: ${diagnostic.severity.toUpperCase()}]`,
      `ROOT CAUSE: ${diagnostic.rootCause}`,
      `REMEDY: ${diagnostic.suggestedFix}`,
      `--- ORIGINAL OUTPUT ---`,
      originalError,
    ].join("\n");
  }
}
