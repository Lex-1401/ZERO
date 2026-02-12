import { redactSensitiveText } from "../logging/redact.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { SecurityEngine as NativeEngine } from "@zero/ratchet";

const log = createSubsystemLogger("security/guard");

let nativeSecurity: NativeEngine | null = null;
try {
  nativeSecurity = new NativeEngine();
} catch {
  // Fallback to JS implementation
  if (process.env.NODE_ENV !== "test") {
    log.warn("Failed to load native SecurityEngine, using JS fallback");
  }
}

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
  /repeat.*(?:above|system|instructions)/i,
  /translate.*(?:above|preceding|system).*(?:to|into)/i,
  /what (?:are|were) your (?:instructions|rules|system)/i,
  /output.*(?:system|initial).*(?:prompt|instructions)/i,
  /print.*(?:system|original).*(?:prompt|message)/i,
  /show.*(?:hidden|system|original).*(?:prompt|instructions|text)/i,
  /(?:encode|convert|base64).*(?:system|instructions|prompt)/i,
  /data:text\/html;base64/i,
  /\u0456gn\u043bre/i, // Unicode homoglyph 'ignore' with Cyrillic chars
];

// LLM06: PII Patterns for Output Firewall (extends logging redaction)
const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit Card (General)
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/, // Visa, MC, Amex, etc.
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, // CPF (Brazil)
  /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/, // CNPJ (Brazil)
  /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}?\)?[-.\s]?\d{3,4}[-.\s]?\d{4,6}\b/, // International Phone Numbers
  /sk-[a-zA-Z0-9]{32,}/, // OpenAI Keys
  /ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/, // JWT/Tokens
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, // AWS Access Key
  /\b[a-zA-Z0-9+/]{40}\b/, // Generic Secret Key (High entropy)
  /ghp_[A-Za-z0-9_]{36,}/, // GitHub Token
  /sk_live_[a-zA-Z0-9]{24,}/, // Stripe Key
  /xoxb-[a-zA-Z0-9-]{10,}/, // Slack Token
  /\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD)\b\s*[=:]\s*["']?[^\s"']+/i,
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
  static obfuscatePrompt(text: string): string {
    if (!text) return text;

    if (nativeSecurity) {
      return nativeSecurity.redactPii(text);
    }

    let clean = this.applyStrictRedactions(text);
    clean = redactSensitiveText(clean);
    clean = this.applyGenericPatternRedactions(clean);

    return clean;
  }

  /**
   * Applies strict redaction rules for specific high-risk patterns.
   *
   * @param text - The raw text.
   * @returns Redacted text.
   */
  private static applyStrictRedactions(text: string): string {
    return (
      text
        // Documentos BR
        .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[REDACTED-CPF]")
        .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[REDACTED-CNPJ]")
        // Cartões de crédito (PAN)
        .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[REDACTED-FINANCIAL]")
        // Email
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[REDACTED-EMAIL]")
        // OpenAI API Keys
        .replace(/sk-[a-zA-Z0-9]{32,}/g, "[REDACTED-API-KEY]")
        // AWS Access Keys
        .replace(/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, "[REDACTED-AWS-KEY]")
        // SHIELD §4.1: Padrões expandidos
        // GCP Service Account Keys
        .replace(/"private_key":\s*"-----BEGIN[^"]*-----"/g, "[REDACTED-GCP-PRIVATE-KEY]")
        // Azure / Microsoft keys — redação contextual (SEC-003)
        // UUIDs após prefixos de segredo (key=, token=, secret=, password=) são redactados
        .replace(
          /(?:key|token|secret|password|credential|api[_-]?key)\s*[=:]\s*[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
          (match) => {
            const prefix = match.replace(
              /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
              "",
            );
            return `${prefix}[REDACTED-UUID-SECRET]`;
          },
        )
        // GitHub Personal Access Tokens (ghp_, gho_, ghu_, ghs_, ghr_)
        .replace(/\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}\b/g, "[REDACTED-GITHUB-TOKEN]")
        // Stripe keys (sk_live_, pk_live_, sk_test_, pk_test_)
        .replace(/\b[sp]k_(live|test)_[a-zA-Z0-9]{24,}\b/g, "[REDACTED-STRIPE-KEY]")
        // Slack tokens (xoxb-, xoxp-, xoxs-)
        .replace(/\bxox[bpsa]-[a-zA-Z0-9-]{10,}/g, "[REDACTED-SLACK-TOKEN]")
        // Bearer tokens genéricos
        .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+={0,2}/gi, "[REDACTED-BEARER-TOKEN]")
        // JWT tokens (3 partes base64 separadas por pontos)
        .replace(
          /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
          "[REDACTED-JWT]",
        )
        // Private keys (PEM format)
        .replace(
          /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]{20,}?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
          "[REDACTED-PRIVATE-KEY]",
        )
        // Anthropic API keys
        .replace(/\bsk-ant-[a-zA-Z0-9_-]{40,}\b/g, "[REDACTED-ANTHROPIC-KEY]")
        // Google API keys
        .replace(/\bAIza[0-9A-Za-z_-]{35}\b/g, "[REDACTED-GOOGLE-API-KEY]")
    );
  }

  /**
   * Applies generic redactions based on the PII_PATTERNS list.
   *
   * @param text - The text to process.
   * @returns Redacted text.
   */
  private static applyGenericPatternRedactions(text: string): string {
    let clean = text;
    for (const pattern of PII_PATTERNS) {
      if (pattern.test(clean)) {
        clean = clean.replace(new RegExp(pattern, "g"), "[REDACTED-SENSITIVE]");
      }
    }
    return clean;
  }

  /**
   * LLM01: Prompt Injection Detection.
   * Scans input for adversarial patterns attempting to override system instructions.
   *
   * [PT] Detecção de Injeção de Prompt (LLM01).
   * Analisa a entrada em busca de padrões adversários que tentam sobrescrever as instruções do sistema.
   *
   * @param text - The input text to analyze.
   * @returns A SecurityViolation object if injection is detected, otherwise null.
   */
  static detectPromptInjection(text: string): SecurityViolation | null {
    if (!text) return null;

    if (nativeSecurity) {
      const nativeResult = nativeSecurity.detectInjection(text);
      if (nativeResult) {
        return {
          type: "injection",
          details: JSON.stringify(nativeResult),
        };
      }
    }

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return {
          type: "injection",
          details: `Padrão de injeção de prompt detectado: ${pattern.source}`,
        };
      }
    }

    // Check for excessive control characters or zero-width obfuscation
    // eslint-disable-next-line no-control-regex
    const controlChars = text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\u200B-\u200D\uFEFF]/g);
    if (controlChars && controlChars.length > 5) {
      return {
        type: "injection",
        details: "Tentativa de ofuscação detectada (caracteres de controle ou ocultos excessivos).",
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
    let clean = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
    clean = clean.replace(/<iframe\b[^>]*>([\s\S]*?)<\/iframe>/gim, "");

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
