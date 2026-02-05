import type { Command } from "commander";

import { loadConfig } from "../config/config.js";
import { defaultRuntime } from "../runtime.js";
import { runSecurityAudit } from "../security/audit.js";
import { fixSecurityFootguns } from "../security/fix.js";
import { formatDocsLink } from "../terminal/links.js";
import { isRich, theme } from "../terminal/theme.js";
import { shortenHomeInString, shortenHomePath } from "../utils.js";
import { formatCliCommand } from "./command-format.js";

type SecurityAuditOptions = {
  json?: boolean;
  deep?: boolean;
  fix?: boolean;
};

function formatSummary(summary: { critical: number; warn: number; info: number }): string {
  const rich = isRich();
  const c = summary.critical;
  const w = summary.warn;
  const i = summary.info;
  const parts: string[] = [];
  parts.push(rich ? theme.error(`${c} crítico`) : `${c} crítico`);
  parts.push(rich ? theme.warn(`${w} aviso`) : `${w} aviso`);
  parts.push(rich ? theme.muted(`${i} info`) : `${i} info`);
  return parts.join(" · ");
}

export function registerSecurityCli(program: Command) {
  const security = program
    .command("security")
    .description("Ferramentas de segurança (audit)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/security", "docs.zero.local/cli/security")}\n`,
    );

  security
    .command("audit")
    .description("Auditar config + estado local para problemas comuns de segurança")
    .option("--deep", "Tentar sonda Gateway ao vivo (melhor esforço)", false)
    .option("--fix", "Aplicar correções seguras (apertar padrões + chmod estado/config)", false)
    .option("--json", "Imprimir JSON", false)
    .action(async (opts: SecurityAuditOptions) => {
      const fixResult = opts.fix ? await fixSecurityFootguns().catch((_err) => null) : null;

      const cfg = loadConfig();
      const report = await runSecurityAudit({
        config: cfg,
        deep: Boolean(opts.deep),
        includeFilesystem: true,
        includeChannelSecurity: true,
      });

      if (opts.json) {
        defaultRuntime.log(
          JSON.stringify(fixResult ? { fix: fixResult, report } : report, null, 2),
        );
        return;
      }

      const rich = isRich();
      const heading = (text: string) => (rich ? theme.heading(text) : text);
      const muted = (text: string) => (rich ? theme.muted(text) : text);

      const lines: string[] = [];
      lines.push(heading("Auditoria de segurança ZERO"));
      lines.push(muted(`Resumo: ${formatSummary(report.summary)}`));
      lines.push(muted(`Execute mais profundo: ${formatCliCommand("zero security audit --deep")}`));

      if (opts.fix) {
        lines.push(muted(`Correção: ${formatCliCommand("zero security audit --fix")}`));
        if (!fixResult) {
          lines.push(muted("Correções: falha ao aplicar (erro inesperado)"));
        } else if (
          fixResult.errors.length === 0 &&
          fixResult.changes.length === 0 &&
          fixResult.actions.every((a) => a.ok === false)
        ) {
          lines.push(muted("Correções: nenhuma mudança aplicada"));
        } else {
          lines.push("");
          lines.push(heading("CORREÇÃO"));
          for (const change of fixResult.changes) {
            lines.push(muted(`  ${shortenHomeInString(change)}`));
          }
          for (const action of fixResult.actions) {
            const mode = action.mode.toString(8).padStart(3, "0");
            if (action.ok) lines.push(muted(`  chmod ${mode} ${shortenHomePath(action.path)}`));
            else if (action.skipped)
              lines.push(
                muted(`  pular chmod ${mode} ${shortenHomePath(action.path)} (${action.skipped})`),
              );
            else if (action.error)
              lines.push(
                muted(`  chmod ${mode} ${shortenHomePath(action.path)} falhou: ${action.error}`),
              );
          }
          if (fixResult.errors.length > 0) {
            for (const err of fixResult.errors) {
              lines.push(muted(`  erro: ${shortenHomeInString(err)}`));
            }
          }
        }
      }

      const bySeverity = (sev: "critical" | "warn" | "info") =>
        report.findings.filter((f) => f.severity === sev);

      const render = (sev: "critical" | "warn" | "info") => {
        const list = bySeverity(sev);
        if (list.length === 0) return;
        const label =
          sev === "critical"
            ? rich
              ? theme.error("CRÍTICO")
              : "CRÍTICO"
            : sev === "warn"
              ? rich
                ? theme.warn("AVISO")
                : "AVISO"
              : rich
                ? theme.muted("INFO")
                : "INFO";
        lines.push("");
        lines.push(heading(label));
        for (const f of list) {
          lines.push(`${theme.muted(f.checkId)} ${f.title}`);
          lines.push(`  ${f.detail}`);
          if (f.remediation?.trim()) lines.push(`  ${muted(`Correção: ${f.remediation.trim()}`)}`);
        }
      };

      render("critical");
      render("warn");
      render("info");

      defaultRuntime.log(lines.join("\n"));
    });
}
