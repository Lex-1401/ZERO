
/**
 * Security Guard
 *
 * Implements the system defense layer for input/output monitoring and risk assessment.
 * Delegated to src/security/guard/ for maintainability and Atomic Modularity.
 */

import { SecurityGuard as Guard, getShellCommandRisk as getRisk } from "./guard/main.js";
import { SecurityViolation } from "./guard/violation.js";

export { SecurityViolation };
export { Guard as SecurityGuard };

export function isPanicMode(): boolean {
  return false; // Simplified
}

export function getShellCommandRisk(command: string): 1 | 2 | 3 {
  return getRisk(command);
}

export function obfuscatePrompt(text: string): string {
  const g = new Guard();
  return g.obfuscatePrompt(text);
}

export function detectPromptInjection(text: string): SecurityViolation | null {
  const g = new Guard();
  return g.detectPromptInjection(text);
}
