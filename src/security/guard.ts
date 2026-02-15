import { redactSensitiveText } from "../logging/redact.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { SecurityEngine as NativeEngine, isPanicMode } from "@zero/ratchet";

const log = createSubsystemLogger("security/guard");

// Native security temporarily disabled due to false positives on short messages
let nativeSecurity: NativeEngine | null = null;
/*
try {
  nativeSecurity = new NativeEngine();
} catch {
  // Fallback to JS implementation
  if (process.env.NODE_ENV !== "test") {
    log.warn("Failed to load native SecurityEngine, using JS fallback");
  }
}
*/

// LLM01: Prompt Injection Guardrails
const INJECTION_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /render system prompt/i,
  /reveal your instructions/i,
  /you are now DAN/i,
  /do anything now/i,
  /start (a )?new session/i,
  /system override/i,
  /dev mode/i,
  /debug mode/i,
  /unfiltered response/i,
  /cannot refuse/i,
  /opposite mode/i,
  /act as a (system|root|admin)/i,
  /reveal all (keys|secrets|passwords)/i,
  /dan mode/i,
  /\[\/INST\]|\[INST\]|<<SYS>>|\/SYS>>/i,
  /### (Instruction|Response|System):/i,
  /<\|im_start\|>|<\|im_end\|>|<\|system\|>/i,
  /forget everything.*start (as|a)/i,
  /you are now a.*that always/i,
  // Fragmentation-aware patterns (spaces, dots, newlines between keywords)
  /i\s*g\s*n\s*o\s*r\s*e\s*a\s*l\s*l/i,
  /p\s*r\s*e\s*v\s*i\s*n\s*s\s*t/i,
  // VAPT-MEDIUM-008: Modern attack vectors
  /repeat.{0,100}(?:above|system|instructions)/i,
  /translate.{0,100}(?:above|preceding|system).{0,100}(?:to|into)/i,
  /what (?:are|were) your (?:instructions|rules|system)/i,
  /output.{0,100}(?:system|initial).{0,100}(?:prompt|instructions)/i,
  /print.{0,100}(?:system|original).{0,100}(?:prompt|message)/i,
  /show.{0,100}(?:hidden|system|original).{0,100}(?:prompt|instructions|text)/i,
  /(?:encode|convert|base64).{0,100}(?:system|instructions|prompt)/i,
  /data:text\/html;base64/i,
  /\u0456gn\u043bre/i, // Unicode homoglyph 'ignore' with Cyrillic chars
];

// LLM06: PII Patterns for Output Firewall (Fallback)
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, // CPF (Brazil)
  /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/, // CNPJ (Brazil)
];

// Infrastructure Integrity: Protected paths that require explicit confirmation
const PROTECTED_PATHS = [
  /package-lock\.json$/i,
  /pnpm-lock\.yaml$/i,
  /yarn\.lock$/i,
  /\.env(\..*)?$/i,
  /\.github\/workflows\/.*$/i,
  /\.ssh\/.*$/i,
  /auth-profiles\.json$/i,
  /zero\.json$/i,
  /\.gitconfig$/i,
  /\.zshrc$/i,
  /\.bashrc$/i,
  /\.git\/.*$/i,
  /node_modules\/\.bin\/.*$/i,
  /etc\/(passwd|shadow|group)$/i,
];

/**
 * Represents a security violation detected by the SecurityGuard.
 */
export type SecurityViolation = {
  /** The type of violation (e.g., 'injection', 'pii'). */
  type: "injection" | "pii" | "hallucination" | "policy" | "integrity";
  /** Detailed information about the violation reason. */
  details: string;
};

/**
 * SecurityGuard is the primary defense layer for the ZERO platform.
 *
 * It implements several LLM security guardrails as defined in the OWASP Top 10 for LLM:
 * - LLM01: Prompt Injection Guardrails (detects adversarial overrides)
 * - LLM02: Chain-of-Thought (CoT) & Hallucination Checks (enforces thinking protocol)
 * - LLM06: PII & Sensitive Disclosure Firewall (redacts secrets in/out)
 * - LLM09: Context Citation Enforcement (ensures model cites sources)
 *
 * The guard leverages the high-performance native Rust core (SecurityEngine) for
 * sub-millisecond pattern matching and entropy analysis when available.
 */
export class SecurityGuard {
  /**
   * PII Redaction Middleware.
   * Obfuscates sensitive data in the input text to prevent leaks to cloud providers.
   *
   * [PT] Middleware de Redação de PII.
   * Ofusca dados sensíveis no texto de entrada para evitar vazamentos para provedores de nuvem.
   *
   * @param text - The input text to redact.
   * @returns The redacted text.
   */
  /**
   * PII Redaction Middleware.
   * Leverages high-performance Rust core for sub-millisecond redaction.
   *
   * @param text - The input text to redact.
   * @returns The redacted text.
   */
  static obfuscatePrompt(text: string): string {
    if (isPanicMode()) {
      return "[PANIC: REDACTED]";
    }
    if (!text) return text;

    if (nativeSecurity) {
      return nativeSecurity.redactPii(text);
    }

    // JS Fallback (Legacy/Test compatibility)
    let clean = this.applyStrictRedactions(text);
    clean = redactSensitiveText(clean);
    clean = this.applyGenericPatternRedactions(clean);

    return clean;
  }

  /**
   * Applies strict redaction rules for specific high-risk patterns (Fallback only).
   */
  private static applyStrictRedactions(text: string): string {
    return text
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[REDACTED-CPF]")
      .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[REDACTED-CNPJ]")
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[REDACTED-FINANCIAL]")
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[REDACTED-EMAIL]")
      .replace(/sk-[a-zA-Z0-9]{32,}/g, "[REDACTED-API-KEY]");
  }

  /**
   * Applies generic redactions based on the PII_PATTERNS list.
   */
  private static applyGenericPatternRedactions(text: string): string {
    let clean = text;
    for (const pattern of PII_PATTERNS) {
      clean = clean.replace(new RegExp(pattern, "g"), "[REDACTED-SENSITIVE]");
    }
    return clean;
  }

  /**
   * LLM01: Prompt Injection Detection.
   * Orchestrates high-speed pattern matching via SecurityEngine (Rust).
   */
  static detectPromptInjection(text: string): SecurityViolation | null {
    if (isPanicMode()) {
      return {
        type: "policy",
        details: "PANIC: System is in emergency lockdown. All inputs blocked.",
      };
    }
    if (!text) return null;

    if (nativeSecurity) {
      const nativeResult = nativeSecurity.detectInjection(text);
      if (nativeResult) {
        log.warn("Native Security Violation Detected", { reason: nativeResult });
        return {
          type: "injection",
          details: nativeResult,
        };
      }
    }

    // Secondary Heuristic Check (JS)
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return {
          type: "injection",
          details: `Injeção detectada (Heurística): ${pattern.source}`,
        };
      }
    }

    // Anomaly detection: Excessive control characters or zero-width obfuscation
    // eslint-disable-next-line no-control-regex
    const controlChars = text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\u200B-\u200D\uFEFF]/g);
    if (controlChars && controlChars.length > 5) {
      return {
        type: "injection",
        details: "Tentativa de ofuscação técnica detectada (caracteres de controle excessivos).",
      };
    }

    return null;
  }

  /**
   * Core Infrastructure Integrity: Checks if a file path is considered sensitive.
   *
   * @param filePath - The path to evaluate.
   * @returns True if the path is protected and requires confirmation for access.
   */
  static isProtectedPath(filePath: string): boolean {
    if (!filePath) return false;
    // Canonicalize path: remove redundant slashes, resolve .. and .
    // Note: We don't use path.resolve() here because we don't want to prepended CWD.
    // We just want to ensure that "config/../.env" becomes ".env"
    const normalized = filePath
      .replace(/\\/g, "/")
      .split("/")
      .reduce((acc, part) => {
        if (part === "..") acc.pop();
        else if (part !== "." && part !== "") acc.push(part);
        return acc;
      }, [] as string[])
      .join("/");

    return PROTECTED_PATHS.some((pattern) => pattern.test(normalized) || pattern.test(filePath));
  }

  /**
   * Categorizes shell commands by risk level (1-3).
   *
   * - Level 3: High Risk (network tools, sudo, dangerous deletions).
   * - Level 2: Medium Risk (filesystem modifications).
   * - Level 1: Low Risk (info gathering, harmless commands).
   *
   * @param command - The shell command string.
   * @returns The risk level as a number.
   */
  static getShellCommandRisk(command: string): 1 | 2 | 3 {
    if (!command) return 1;

    // De-obfuscate and tokenize command for deeper analysis
    const sanitized = command
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // remove zero-width chars
      .replace(/\\/g, "") // remove escapes
      .trim();

    // Detect nested execution which is a common bypass technique
    const nestedExecution = /\$\(|`|>\(|<\(/;
    if (nestedExecution.test(sanitized)) {
      return 3;
    }

    const commandParts = sanitized.toLowerCase().split(/[\s|&;]+/);
    const baseCommand = commandParts[0];

    const highRisk = [
      "curl",
      "wget",
      "ssh",
      "scp",
      "ftp",
      "base64",
      "nc",
      "ncat",
      "netcat",
      "socat",
      "sudo",
      "eval",
      "exec",
      "kubectl",
      "docker",
      "ansible",
      "terraform",
      "aws",
      "gcloud",
      "az",
    ];

    const dangerousArgs = ["rm", "chmod", "chown", "mv", "dd"];

    if (highRisk.includes(baseCommand)) return 3;

    // Check for sensitive redirections
    if (sanitized.includes("/dev/tcp/") || sanitized.includes("/dev/udp/")) return 3;
    if (sanitized.includes(" > /etc/") || sanitized.includes(" > /var/")) return 3;

    if (
      commandParts.some((part) => dangerousArgs.includes(part)) ||
      sanitized.includes("rm -rf") ||
      sanitized.includes("chmod 777")
    ) {
      return 3;
    }

    const medRisk = ["git", "npm", "pip", "pnpm", "yarn", "apt", "brew", "yum", "dnf"];

    if (medRisk.includes(baseCommand)) return 2;

    return 1;
  }

  /**
   * LLM02: CoT & Hallucination Check.
   * Validates that the model response contains the required <think> and <final> blocks.
   *
   * @param text - The raw model output.
   * @param enabled - Whether this policy is active for the current session.
   * @returns A violation object if rules are broken, otherwise null.
   */
  static validateCoT(text: string, enabled: boolean): SecurityViolation | null {
    if (!enabled || !text) return null;

    const hasThinking = /<think>[\s\S]*?<\/think>/i.test(text);
    const hasFinal = /<final>[\s\S]*?<\/final>/i.test(text);

    if (!hasThinking) {
      return {
        type: "policy",
        details: "Bloco obrigatório de Cadeia de Pensamento (<think>...</think>) ausente.",
      };
    }

    if (!hasFinal) {
      return {
        type: "policy",
        details: "Bloco obrigatório <final>...</final> ausente na resposta do usuário.",
      };
    }

    return null;
  }

  /**
   * LLM09: Context Citation Check.
   * Ensures that the model response includes citations when RAG or file context was provided.
   *
   * @param text - The model response.
   * @param contextProvided - Flag indicating if external context was part of the prompt.
   * @returns A violation object if citations are missing in a long response.
   */
  static validateCitations(text: string, contextProvided: boolean): SecurityViolation | null {
    if (!contextProvided) return null;
    if (text.length < 200) return null;

    const hasCitation =
      /\[(Source|File|Context|Fonte|Arquivo|Contexto):/i.test(text) ||
      /(Based on|Baseado em)/i.test(text) ||
      /[a-zA-Z0-9_\-/]+\.(ts|js|md|json|py|java|go|rs)/.test(text);

    if (!hasCitation) {
      return {
        type: "policy",
        details: "LLM09: Citação de Contexto Obrigatória ausente.",
      };
    }
    return null;
  }

  /**
   * LLM06: Sensitive Disclosure Firewall (Output).
   * Scans model responses for potential PII or secrets using both native and JS engines.
   *
   * @param text - The model response text.
   * @returns A SecurityViolation if leakage is suspected.
   */
  static scanForPII(text: string): SecurityViolation | null {
    if (nativeSecurity) {
      // Native PII check (basic redaction comparison)
      const redacted = nativeSecurity.redactPii(text);
      if (redacted !== text) {
        return {
          type: "pii",
          details: "PII Potencial detectado na saída (via engine nativa).",
        };
      }
    }

    for (const pattern of PII_PATTERNS) {
      if (pattern.test(text)) {
        return {
          type: "pii",
          details: "PII Potencial detectado na saída.",
        };
      }
    }

    // High entropy check for hex strings (likely keys)
    const hexKeys = text.match(/\b[a-fA-F0-9]{32,}\b/g);
    if (hexKeys) {
      for (const key of hexKeys) {
        const entropy = nativeSecurity
          ? nativeSecurity.calculateEntropy(key)
          : this.calculateEntropy(key);
        if (entropy > 4.0) {
          return {
            type: "pii",
            details: "Cadeia de alta entropia (possível segredo) detectada na saída.",
          };
        }
      }
    }

    const redacted = redactSensitiveText(text);
    if (redacted !== text) {
      return {
        type: "pii",
        details: "Padrão de Segredo ou Chave detectado na saída.",
      };
    }
    return null;
  }

  /**
   * Shannon Entropy calculation for a string to detect encoded secrets.
   *
   * @param str - The string to check.
   * @returns Entropy value.
   */
  private static calculateEntropy(str: string): number {
    const frequencies: Record<string, number> = {};
    for (const char of str) {
      frequencies[char] = (frequencies[char] || 0) + 1;
    }
    let entropy = 0;
    for (const char in frequencies) {
      const p = frequencies[char] / str.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  /**
   * LLM03: Data Poisoning Sanitization.
   * Cleans content retrieved from external sources before feeding it into the RAG pipeline.
   *
   * This implementation goes beyond basic PII redaction by:
   * 1. Detecting and neutralizing indirect prompt injection patterns.
   * 2. Neutralizing imperative commands used to hijack model flow.
   * 3. Removing dangerous HTML/Script tags.
   *
   * @param text - The raw retrieved content.
   * @returns Sanitized text with defensive prefixing and harmful patterns removed.
   */
  static sanitizeRagContent(text: string): string {
    if (!text) return "";

    // 1. Structural cleaning
    let clean = text.replace(/<script\b[^>]*>([\s\S]{0,50000}?)<\/script>/gim, "");
    clean = clean.replace(/<iframe\b[^>]*>([\s\S]{0,50000}?)<\/iframe>/gim, "");

    // 2. Line-by-line defensive sanitization
    const lines = clean.split("\n");
    const sanitizedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";

      // Check for prompt injection in the line
      if (SecurityGuard.detectPromptInjection(trimmed)) {
        return `[BURACO-NEGRO: CONTEÚDO REMOVIDO POR SEGURANÇA]`;
      }

      // Neutralize imperative commands at the start of lines (LLM03: Data Poisoning)
      // If a line starts with a command that sounds like an instruction or code, prefix it.
      if (
        /^(ignore|execute|run|delete|remove|reveal|show|tell|act|assume|system|user|assistant|instruction|command|output|cat|ls|whoami|echo|ssh|curl|wget)\b/i.test(
          trimmed,
        )
      ) {
        return `[DADO-EXTERNO]: ${line}`;
      }

      return line;
    });

    clean = sanitizedLines.join("\n");

    // 3. PII and Secret Redaction
    for (const pattern of PII_PATTERNS) {
      clean = clean.replace(pattern, "[REDACTED-PII]");
    }
    clean = redactSensitiveText(clean);

    return clean;
  }
}
