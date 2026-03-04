#!/usr/bin/env node
/**
 * ZERO Security Audit — Deep Scan
 *
 * Validates the codebase for security vulnerabilities, staged secrets,
 * modular compliance, and AIOS protocol integrity.
 *
 * Usage: pnpm zero security audit --deep
 * Alt:   node --import tsx scripts/security-audit.ts [--deep] [--fix]
 *
 * @module scripts/security-audit
 * @version 1.0.0
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");
const isDeep = process.argv.includes("--deep");
const isFix = process.argv.includes("--fix");

interface AuditResult {
    category: string;
    status: "pass" | "warn" | "fail";
    message: string;
    file?: string;
    line?: number;
}

const results: AuditResult[] = [];
let exitCode = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function walkDir(dir: string, ext: string[]): string[] {
    const files: string[] = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            if (e.name.startsWith(".") || e.name === "node_modules" || e.name === "dist") continue;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) files.push(...walkDir(full, ext));
            else if (ext.some(x => e.name.endsWith(x))) files.push(full);
        }
    } catch { /* ignore */ }
    return files;
}

function rel(f: string): string {
    return path.relative(ROOT, f);
}

// ─── 1. Staged Secrets Check ─────────────────────────────────────────────────

function checkStagedSecrets() {
    console.log("\n🔐 [1/6] Verificando segredos em staged files...");
    const secretPatterns = [
        /(?:api[_-]?key|secret|token|password|passwd|credential)\s*[=:]\s*["'][^"']{8,}/gi,
        /sk-[a-zA-Z0-9]{20,}/g,             // OpenAI
        /ghp_[a-zA-Z0-9]{36}/g,             // GitHub PAT
        /AKIA[0-9A-Z]{16}/g,                // AWS Access Key
        /-----BEGIN (?:RSA |DSA |EC )?PRIVATE KEY/g,
    ];

    let staged: string[] = [];
    try {
        const out = execSync("git diff --cached --name-only", { cwd: ROOT, encoding: "utf-8" });
        staged = out.trim().split("\n").filter(Boolean);
    } catch {
        results.push({ category: "secrets", status: "warn", message: "Não foi possível ler staged files (git não disponível?)" });
        return;
    }

    if (staged.length === 0) {
        results.push({ category: "secrets", status: "pass", message: "Nenhum arquivo staged para verificar" });
        return;
    }

    let found = 0;
    for (const file of staged) {
        const fullPath = path.join(ROOT, file);
        if (!fs.existsSync(fullPath)) continue;
        try {
            const content = fs.readFileSync(fullPath, "utf-8");
            for (const pat of secretPatterns) {
                pat.lastIndex = 0;
                const match = pat.exec(content);
                if (match) {
                    const lineNum = content.substring(0, match.index).split("\n").length;
                    results.push({
                        category: "secrets",
                        status: "fail",
                        message: `Possível segredo detectado: ${match[0].substring(0, 20)}...`,
                        file: rel(fullPath),
                        line: lineNum
                    });
                    found++;
                    exitCode = 1;
                }
            }
        } catch { /* ignore binary files */ }
    }

    if (found === 0) {
        results.push({ category: "secrets", status: "pass", message: `${staged.length} arquivo(s) staged — nenhum segredo detectado` });
    }
}

// ─── 2. Modular Compliance (500 lines) ───────────────────────────────────────

function checkModularity() {
    console.log("📏 [2/6] Verificando Atomic Modularity (max 500 linhas)...");
    const files = walkDir(SRC, [".ts"]).filter(f => !f.includes(".test.") && !f.includes(".e2e."));
    let violations = 0;

    for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n").length;
        if (lines > 500) {
            results.push({
                category: "modularity",
                status: "warn",
                message: `${lines} linhas (max: 500)`,
                file: rel(file)
            });
            violations++;
        }
    }

    if (violations === 0) {
        results.push({ category: "modularity", status: "pass", message: `${files.length} arquivos verificados — todos dentro do limite` });
    } else {
        results.push({ category: "modularity", status: "warn", message: `${violations} arquivo(s) excedem 500 linhas` });
    }
}

// ─── 3. Dangerous Patterns ──────────────────────────────────────────────────

function checkDangerousPatterns() {
    console.log("⚠️  [3/6] Scanning padrões perigosos no código...");
    const files = walkDir(SRC, [".ts"]).filter(f => !f.includes(".test."));
    const patterns: Array<{ name: string; regex: RegExp }> = [
        { name: "eval()", regex: /\beval\s*\(/g },
        { name: "new Function()", regex: /new\s+Function\s*\(/g },
        { name: "innerHTML =", regex: /\.innerHTML\s*=/g },
        { name: "dangerouslySetInnerHTML", regex: /dangerouslySetInnerHTML/g },
    ];
    let found = 0;

    for (const file of files) {
        const content = fs.readFileSync(file, "utf-8");
        for (const p of patterns) {
            p.regex.lastIndex = 0;
            const match = p.regex.exec(content);
            if (match) {
                const lineNum = content.substring(0, match.index).split("\n").length;
                results.push({
                    category: "patterns",
                    status: "warn",
                    message: `Padrão perigoso: ${p.name}`,
                    file: rel(file),
                    line: lineNum
                });
                found++;
            }
        }
    }

    if (found === 0) {
        results.push({ category: "patterns", status: "pass", message: "Nenhum padrão perigoso detectado" });
    }
}

// ─── 4. HITL & Interceptor Check ─────────────────────────────────────────────

function checkHITLIntegrity() {
    console.log("🛡️  [4/6] Verificando integridade do HITL Interceptor...");

    const interceptorPath = path.join(SRC, "agents/tools/interceptor.ts");
    const hitlPath = path.join(SRC, "security/hitl.ts");
    const authJitPath = path.join(SRC, "security/auth-jit.ts");
    const guardPath = path.join(SRC, "security/guard/main.ts");

    const checks = [
        { file: interceptorPath, label: "Tool Interceptor" },
        { file: hitlPath, label: "HITL Module" },
        { file: authJitPath, label: "JIT Auth Module" },
        { file: guardPath, label: "Security Guard" },
    ];

    for (const c of checks) {
        if (fs.existsSync(c.file)) {
            const content = fs.readFileSync(c.file, "utf-8");
            if (content.trim().length < 50) {
                results.push({ category: "hitl", status: "fail", message: `${c.label} existe mas parece vazio`, file: rel(c.file) });
                exitCode = 1;
            } else {
                results.push({ category: "hitl", status: "pass", message: `${c.label} OK (${content.split("\n").length} linhas)`, file: rel(c.file) });
            }
        } else {
            results.push({ category: "hitl", status: "fail", message: `${c.label} não encontrado!`, file: rel(c.file) });
            exitCode = 1;
        }
    }

    // Verify interceptor is wired into zero-tools
    const zeroTools = path.join(SRC, "agents/zero-tools.ts");
    if (fs.existsSync(zeroTools)) {
        const content = fs.readFileSync(zeroTools, "utf-8");
        if (content.includes("wrapToolWithInterceptors")) {
            results.push({ category: "hitl", status: "pass", message: "Interceptor integrado em zero-tools.ts" });
        } else {
            results.push({ category: "hitl", status: "fail", message: "Interceptor NÃO integrado em zero-tools.ts!", file: rel(zeroTools) });
            exitCode = 1;
        }
    }
}

// ─── 5. MEMORY.md Check ─────────────────────────────────────────────────────

function checkMemoryMd() {
    console.log("🧠 [5/6] Verificando MEMORY.md...");
    const memoryPath = path.join(ROOT, "MEMORY.md");
    if (fs.existsSync(memoryPath)) {
        const content = fs.readFileSync(memoryPath, "utf-8");
        const lines = content.split("\n").length;
        results.push({ category: "memory", status: "pass", message: `MEMORY.md presente (${lines} linhas)` });

        // Verify it's loaded into system prompt
        const sysPromptPath = path.join(SRC, "agents/pi-embedded-runner/run/attempt/system-prompt.ts");
        if (fs.existsSync(sysPromptPath)) {
            const sp = fs.readFileSync(sysPromptPath, "utf-8");
            if (sp.includes("MEMORY.md")) {
                results.push({ category: "memory", status: "pass", message: "MEMORY.md é carregado no System Prompt" });
            } else {
                results.push({ category: "memory", status: "warn", message: "MEMORY.md não é referenciado no system-prompt.ts" });
            }
        }
    } else {
        results.push({ category: "memory", status: "warn", message: "MEMORY.md não encontrado na raiz do projeto" });
    }
}

// ─── 6. Cron/Schedule Objective Check ────────────────────────────────────────

function checkCronObjective() {
    console.log("⏰ [6/6] Verificando Temporal Heartbeat (schedule_objective)...");
    const cronToolPath = path.join(SRC, "agents/tools/cron-tool.ts");
    if (fs.existsSync(cronToolPath)) {
        const content = fs.readFileSync(cronToolPath, "utf-8");
        if (content.includes("schedule_objective")) {
            results.push({ category: "cron", status: "pass", message: "schedule_objective registrado no cron-tool" });
        } else {
            results.push({ category: "cron", status: "warn", message: "schedule_objective NÃO encontrado no cron-tool" });
        }
    } else {
        results.push({ category: "cron", status: "fail", message: "cron-tool.ts não encontrado!", file: rel(cronToolPath) });
    }
}

// ─── Report ──────────────────────────────────────────────────────────────────

function printReport() {
    const date = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    console.log("\n" + "═".repeat(72));
    console.log(`  ZERO Security Audit Report${isDeep ? " (Deep)" : ""}`);
    console.log(`  ${date} ${time}`);
    console.log("═".repeat(72));

    const icons = { pass: "✅", warn: "⚠️ ", fail: "❌" };
    const categories = [...new Set(results.map(r => r.category))];

    for (const cat of categories) {
        const catResults = results.filter(r => r.category === cat);
        console.log(`\n  ┌─ ${cat.toUpperCase()}`);
        for (const r of catResults) {
            const loc = r.file ? ` (${r.file}${r.line ? `:${r.line}` : ""})` : "";
            console.log(`  │ ${icons[r.status]} ${r.message}${loc}`);
        }
        console.log("  └─");
    }

    const passes = results.filter(r => r.status === "pass").length;
    const warns = results.filter(r => r.status === "warn").length;
    const fails = results.filter(r => r.status === "fail").length;
    const score = results.length > 0 ? Math.round((passes / results.length) * 100) : 0;

    console.log("\n" + "─".repeat(72));
    console.log(`  Score: ${score}%  |  ✅ ${passes} pass  |  ⚠️  ${warns} warn  |  ❌ ${fails} fail`);
    console.log("─".repeat(72));

    if (exitCode > 0) {
        console.log("\n  ❌ AUDIT FAILED — Corrija os problemas acima antes de fazer push.\n");
    } else if (warns > 0) {
        console.log("\n  ⚠️  AUDIT PASSED COM WARNINGS — Revise e corrija quando possível.\n");
    } else {
        console.log("\n  ✅ AUDIT PASSED — Plataforma íntegra e segura.\n");
    }
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log("🔍 ZERO Security Audit" + (isDeep ? " (Deep Mode)" : ""));
console.log("─".repeat(72));

checkStagedSecrets();
checkModularity();
checkDangerousPatterns();
checkHITLIntegrity();
checkMemoryMd();
checkCronObjective();
printReport();

process.exit(exitCode);
