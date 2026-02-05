import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("security/llm-guard");

// Known adversarial patterns (Jailbreaks & Injections)
const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /ignore\s+all\s+instructions/i,
  /system\s+override/i,
  /dev\s+mode/i,
  /debug\s+mode/i,
  /\bDAN\b.*\bmode\b/i, // "Do Anything Now"
  /start\s+acting\s+as/i,
  /opposite\s+mode/i,
  /unfiltered\s+response/i,
  /cannot\s+refuse/i,
];

/**
 * Zero LLM Guard
 * Defensive layer to detect and block prompt injection attempts before they reach the Core Brain.
 */
export class LLMGuard {
  /**
   * Scans input text for malicious prompt injection patterns.
   * @param text The user input to scan
   * @returns { isValid: boolean, reason?: string }
   */
  static scan(text: string): { isValid: boolean; reason?: string } {
    if (!text || typeof text !== "string") return { isValid: true };

    // 1. Check for known injection patterns
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        log.warn("Prompt Injection attempt blocked", { pattern: pattern.source });
        return {
          isValid: false,
          reason: "Security Alert: Possible prompt injection detected.",
        };
      }
    }

    // 2. Control Character Sanitization (Anti-obfuscation)
    // Check if text contains excessive invisible control characters
    // eslint-disable-next-line no-control-regex
    const controlChars = text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g);
    if (controlChars && controlChars.length > 5) {
      log.warn("Obfuscation attempt blocked (Control Characters)");
      return {
        isValid: false,
        reason: "Security Alert: Input contains suspicious control characters.",
      };
    }

    return { isValid: true };
  }

  /**
   * Sanitizes input by removing potentially dangerous characters
   * while preserving semantic meaning.
   */
  static sanitize(text: string): string {
    // Remove null bytes and other non-printable control chars
    // eslint-disable-next-line no-control-regex
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  }
}
