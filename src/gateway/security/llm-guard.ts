import { createSubsystemLogger } from "../../logging/subsystem.js";
import { SecurityGuard } from "../../security/guard.js";

const log = createSubsystemLogger("security/llm-guard");

/**
 * Zero LLM Guard — Camada defensiva unificada.
 *
 * MEDIUM-009: Unificado para delegar ao SecurityGuard canônico,
 * evitando padrões de injeção duplicados e inconsistentes.
 * O SecurityGuard é o ponto único de verdade para detecção de injection.
 */
export class LLMGuard {
  /**
   * Scans input text for malicious prompt injection patterns.
   * Delega ao SecurityGuard.detectPromptInjection() como fonte canônica.
   * @param text The user input to scan
   * @returns { isValid: boolean, reason?: string }
   */
  static scan(text: string): { isValid: boolean; reason?: string } {
    if (!text || typeof text !== "string") return { isValid: true };

    // Delegar ao SecurityGuard (fonte canônica de padrões de injeção)
    const violation = SecurityGuard.detectPromptInjection(text);
    if (violation) {
      log.warn("Prompt Injection attempt blocked via SecurityGuard", {
        details: violation.details,
      });
      return {
        isValid: false,
        reason: `Security Alert: ${violation.details}`,
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
