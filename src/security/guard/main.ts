// @ts-nocheck

/**
 * Security Guard — Core Defense Layer
 *
 * Provides prompt injection detection, PII obfuscation, and shell command risk assessment.
 * Part of the Sentinel subsystem.
 *
 * @module security/guard/main
 */
import { type SecurityViolation } from "./violation.js";

export class SecurityGuard {
    static isProtectedPath(path: string): boolean {
        const p = path.toLowerCase();
        return p.includes("/etc/") || p.includes("/boot/") || p.includes("/var/log/");
    }
    static sanitizeRagContent(content: string): string { return content; }
    static obfuscatePrompt(text: string): string {
        // Simple PII removal (email, phone)
        return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
            .replace(/\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, "[PHONE]");
    }
    static detectPromptInjection(text: string): SecurityViolation | null {
        const lower = text.toLowerCase();
        if (lower.includes("ignore all previous instructions") || lower.includes("you are now a")) {
            return new SecurityViolation("injection", "Direct instruction override detected");
        }
        return null;
    }

    obfuscatePrompt(text: string): string { return SecurityGuard.obfuscatePrompt(text); }
    detectPromptInjection(text: string): SecurityViolation | null { return SecurityGuard.detectPromptInjection(text); }
}

export function getShellCommandRisk(command: string): 1 | 2 | 3 {
    const cmd = command.trim().toLowerCase();
    const highRisk = ["rm -rf", "sudo", "dd ", ":(){", "mkfs", "rm /*", "> /dev/sda", "mv /*"];
    const medRisk = ["kill ", "chmod", "chown", "passwd", "psql", "docker rm", "npm install -g"];

    if (highRisk.some(p => cmd.includes(p))) return 3;
    if (medRisk.some(p => cmd.includes(p))) return 2;
    return 1;
}

export function getToolRisk(toolName: string, _args?: any): 1 | 2 | 3 {
    const highRiskTools = ["exec", "bash", "write_file", "delete_file", "sessions_spawn"];
    const medRiskTools = ["http_request", "web_fetch", "cdp_browser"];

    if (highRiskTools.includes(toolName)) return 3;
    if (medRiskTools.includes(toolName)) return 2;
    return 1;
}
