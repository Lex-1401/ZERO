import { isIP } from "node:net";
import { URL } from "node:url";

/**
 * Ranges de IPs privados (RFC 1918, RFC 4193, etc.)
 */
const PRIVATE_IP_RANGES = [
  /^10\./, // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./, // 192.168.0.0/16
  /^127\./, // 127.0.0.0/8 (loopback)
  /^169\.254\./, // 169.254.0.0/16 (link-local)
  /^::1$/, // IPv6 loopback
  /^fe80:/, // IPv6 link-local
  /^fc00:/, // IPv6 unique local
  /^fd00:/, // IPv6 unique local
];

/**
 * Protocolos bloqueados por padrão
 */
const BLOCKED_PROTOCOLS = ["file:", "ftp:", "gopher:", "data:"];

/**
 * Verifica se um hostname é um IP privado.
 */
export function isPrivateIP(hostname: string): boolean {
  const ipType = isIP(hostname);
  if (ipType === 0) return false; // Não é IP

  return PRIVATE_IP_RANGES.some((range) => range.test(hostname));
}

/**
 * Valida se uma URL é segura para acesso (previne SSRF - CWE-918).
 *
 * @param urlString - URL a ser validada
 * @param allowlist - Lista de domínios permitidos (opcional)
 * @returns allowed: true se segura, reason: motivo se bloqueada
 */
export function isAllowedUrl(
  urlString: string,
  allowlist?: string[],
): { allowed: boolean; reason?: string } {
  let parsed: URL;

  try {
    parsed = new URL(urlString);
  } catch {
    return { allowed: false, reason: "Invalid URL" };
  }

  // Bloquear protocolos perigosos
  if (BLOCKED_PROTOCOLS.includes(parsed.protocol)) {
    return { allowed: false, reason: `Protocol ${parsed.protocol} not allowed` };
  }

  // Bloquear localhost
  if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    return { allowed: false, reason: "Localhost not allowed" };
  }

  // Bloquear IPs privados
  if (isPrivateIP(parsed.hostname)) {
    return { allowed: false, reason: "Private IP not allowed" };
  }

  // Validar contra allowlist (se fornecida)
  if (allowlist && allowlist.length > 0) {
    const allowed = allowlist.some(
      (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`),
    );

    if (!allowed) {
      return { allowed: false, reason: "Domain not in allowlist" };
    }
  }

  return { allowed: true };
}
