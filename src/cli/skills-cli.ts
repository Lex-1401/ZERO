import type { Command } from "commander";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import {
  buildWorkspaceSkillStatus,
  type SkillStatusEntry,
  type SkillStatusReport,
} from "../agents/skills-status.js";
import { loadConfig } from "../config/config.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { renderTable } from "../terminal/table.js";
import { theme } from "../terminal/theme.js";
import { shortenHomePath } from "../utils.js";
import { formatCliCommand } from "./command-format.js";

export type SkillsListOptions = {
  json?: boolean;
  eligible?: boolean;
  verbose?: boolean;
};

export type SkillInfoOptions = {
  json?: boolean;
};

export type SkillsCheckOptions = {
  json?: boolean;
};

function appendZeroHubHint(output: string, json?: boolean): string {
  if (json) return output;
  return `${output}\n\nDica: use \`npx zerohub\` para buscar, instalar e sincronizar skills.`;
}

function formatSkillStatus(skill: SkillStatusEntry): string {
  if (skill.eligible) return theme.success("✓ pronto");
  if (skill.disabled) return theme.warn("⏸ desativado");
  if (skill.blockedByAllowlist) return theme.warn("🚫 bloqueado");
  return theme.error("✗ faltando");
}

function formatSkillName(skill: SkillStatusEntry): string {
  const emoji = skill.emoji ?? "📦";
  return `${emoji} ${theme.command(skill.name)}`;
}

function formatSkillMissingSummary(skill: SkillStatusEntry): string {
  const missing: string[] = [];
  if (skill.missing.bins.length > 0) {
    missing.push(`binários: ${skill.missing.bins.join(", ")}`);
  }
  if (skill.missing.anyBins.length > 0) {
    missing.push(`qualquer binário: ${skill.missing.anyBins.join(", ")}`);
  }
  if (skill.missing.env.length > 0) {
    missing.push(`ambiente: ${skill.missing.env.join(", ")}`);
  }
  if (skill.missing.config.length > 0) {
    missing.push(`configuração: ${skill.missing.config.join(", ")}`);
  }
  if (skill.missing.os.length > 0) {
    missing.push(`so: ${skill.missing.os.join(", ")}`);
  }
  return missing.join("; ");
}

/**
 * Format the skills list output
 */
export function formatSkillsList(report: SkillStatusReport, opts: SkillsListOptions): string {
  const skills = opts.eligible ? report.skills.filter((s) => s.eligible) : report.skills;

  if (opts.json) {
    const jsonReport = {
      workspaceDir: report.workspaceDir,
      managedSkillsDir: report.managedSkillsDir,
      skills: skills.map((s) => ({
        name: s.name,
        description: s.description,
        emoji: s.emoji,
        eligible: s.eligible,
        disabled: s.disabled,
        blockedByAllowlist: s.blockedByAllowlist,
        source: s.source,
        primaryEnv: s.primaryEnv,
        homepage: s.homepage,
        missing: s.missing,
      })),
    };
    return JSON.stringify(jsonReport, null, 2);
  }

  if (skills.length === 0) {
    const message = opts.eligible
      ? `Nenhuma skill elegível encontrada. Execute \`${formatCliCommand("zero skills list")}\` para ver todas as skills.`
      : "Nenhuma skill encontrada.";
    return appendZeroHubHint(message, opts.json);
  }

  const eligible = skills.filter((s) => s.eligible);
  const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
  const rows = skills.map((skill) => {
    const missing = formatSkillMissingSummary(skill);
    return {
      Status: formatSkillStatus(skill),
      Skill: formatSkillName(skill),
      Description: theme.muted(skill.description),
      Source: skill.source ?? "",
      Missing: missing ? theme.warn(missing) : "",
    };
  });

  const columns = [
    { key: "Status", header: "Status", minWidth: 10 },
    { key: "Skill", header: "Skill", minWidth: 18, flex: true },
    { key: "Description", header: "Descrição", minWidth: 24, flex: true },
    { key: "Source", header: "Fonte", minWidth: 10 },
  ];
  if (opts.verbose) {
    columns.push({ key: "Missing", header: "Faltando", minWidth: 18, flex: true });
  }

  const lines: string[] = [];
  lines.push(
    `${theme.heading("Skills")} ${theme.muted(`(${eligible.length}/${skills.length} prontas)`)}`,
  );
  lines.push(
    renderTable({
      width: tableWidth,
      columns,
      rows,
    }).trimEnd(),
  );

  return appendZeroHubHint(lines.join("\n"), opts.json);
}

/**
 * Format detailed info for a single skill
 */
export function formatSkillInfo(
  report: SkillStatusReport,
  skillName: string,
  opts: SkillInfoOptions,
): string {
  const skill = report.skills.find((s) => s.name === skillName || s.skillKey === skillName);

  if (!skill) {
    if (opts.json) {
      return JSON.stringify({ error: "não encontrada", skill: skillName }, null, 2);
    }
    return appendZeroHubHint(
      `Skill "${skillName}" não encontrada. Execute \`${formatCliCommand("zero skills list")}\` para ver as skills disponíveis.`,
      opts.json,
    );
  }

  if (opts.json) {
    return JSON.stringify(skill, null, 2);
  }

  const lines: string[] = [];
  const emoji = skill.emoji ?? "📦";
  const status = skill.eligible
    ? theme.success("✓ Pronto")
    : skill.disabled
      ? theme.warn("⏸ Desativado")
      : skill.blockedByAllowlist
        ? theme.warn("🚫 Bloqueado pela allowlist")
        : theme.error("✗ Requisitos ausentes");

  lines.push(`${emoji} ${theme.heading(skill.name)} ${status}`);
  lines.push("");
  lines.push(skill.description);
  lines.push("");

  // Detalhes
  lines.push(theme.heading("Detalhes:"));
  lines.push(`${theme.muted("  Fonte:")} ${skill.source}`);
  lines.push(`${theme.muted("  Caminho:")} ${shortenHomePath(skill.filePath)}`);
  if (skill.homepage) {
    lines.push(`${theme.muted("  Homepage:")} ${skill.homepage}`);
  }
  if (skill.primaryEnv) {
    lines.push(`${theme.muted("  Env primário:")} ${skill.primaryEnv}`);
  }

  // Requisitos
  const hasRequirements =
    skill.requirements.bins.length > 0 ||
    skill.requirements.anyBins.length > 0 ||
    skill.requirements.env.length > 0 ||
    skill.requirements.config.length > 0 ||
    skill.requirements.os.length > 0;

  if (hasRequirements) {
    lines.push("");
    lines.push(theme.heading("Requisitos:"));
    if (skill.requirements.bins.length > 0) {
      const binsStatus = skill.requirements.bins.map((bin) => {
        const missing = skill.missing.bins.includes(bin);
        return missing ? theme.error(`✗ ${bin}`) : theme.success(`✓ ${bin}`);
      });
      lines.push(`${theme.muted("  Binários:")} ${binsStatus.join(", ")}`);
    }
    if (skill.requirements.anyBins.length > 0) {
      const anyBinsMissing = skill.missing.anyBins.length > 0;
      const anyBinsStatus = skill.requirements.anyBins.map((bin) => {
        const missing = anyBinsMissing;
        return missing ? theme.error(`✗ ${bin}`) : theme.success(`✓ ${bin}`);
      });
      lines.push(`${theme.muted("  Qualquer binário:")} ${anyBinsStatus.join(", ")}`);
    }
    if (skill.requirements.env.length > 0) {
      const envStatus = skill.requirements.env.map((env) => {
        const missing = skill.missing.env.includes(env);
        return missing ? theme.error(`✗ ${env}`) : theme.success(`✓ ${env}`);
      });
      lines.push(`${theme.muted("  Ambiente:")} ${envStatus.join(", ")}`);
    }
    if (skill.requirements.config.length > 0) {
      const configStatus = skill.requirements.config.map((cfg) => {
        const missing = skill.missing.config.includes(cfg);
        return missing ? theme.error(`✗ ${cfg}`) : theme.success(`✓ ${cfg}`);
      });
      lines.push(`${theme.muted("  Config:")} ${configStatus.join(", ")}`);
    }
    if (skill.requirements.os.length > 0) {
      const osStatus = skill.requirements.os.map((osName) => {
        const missing = skill.missing.os.includes(osName);
        return missing ? theme.error(`✗ ${osName}`) : theme.success(`✓ ${osName}`);
      });
      lines.push(`${theme.muted("  SO:")} ${osStatus.join(", ")}`);
    }
  }

  // Opções de instalação
  if (skill.install.length > 0 && !skill.eligible) {
    lines.push("");
    lines.push(theme.heading("Opções de instalação:"));
    for (const inst of skill.install) {
      lines.push(`  ${theme.warn("→")} ${inst.label}`);
    }
  }

  return appendZeroHubHint(lines.join("\n"), opts.json);
}

/**
 * Format a check/summary of all skills status
 */
export function formatSkillsCheck(report: SkillStatusReport, opts: SkillsCheckOptions): string {
  const eligible = report.skills.filter((s) => s.eligible);
  const disabled = report.skills.filter((s) => s.disabled);
  const blocked = report.skills.filter((s) => s.blockedByAllowlist && !s.disabled);
  const missingReqs = report.skills.filter(
    (s) => !s.eligible && !s.disabled && !s.blockedByAllowlist,
  );

  if (opts.json) {
    return JSON.stringify(
      {
        summary: {
          total: report.skills.length,
          eligible: eligible.length,
          disabled: disabled.length,
          blocked: blocked.length,
          missingRequirements: missingReqs.length,
        },
        eligible: eligible.map((s) => s.name),
        disabled: disabled.map((s) => s.name),
        blocked: blocked.map((s) => s.name),
        missingRequirements: missingReqs.map((s) => ({
          name: s.name,
          missing: s.missing,
          install: s.install,
        })),
      },
      null,
      2,
    );
  }

  const lines: string[] = [];
  lines.push(theme.heading("Verificação de Status das Skills"));
  lines.push("");
  lines.push(`${theme.muted("Total:")} ${report.skills.length}`);
  lines.push(`${theme.success("✓")} ${theme.muted("Elegíveis:")} ${eligible.length}`);
  lines.push(`${theme.warn("⏸")} ${theme.muted("Desativadas:")} ${disabled.length}`);
  lines.push(`${theme.warn("🚫")} ${theme.muted("Bloqueadas pela allowlist:")} ${blocked.length}`);
  lines.push(`${theme.error("✗")} ${theme.muted("Requisitos ausentes:")} ${missingReqs.length}`);

  if (eligible.length > 0) {
    lines.push("");
    lines.push(theme.heading("Prontas para uso:"));
    for (const skill of eligible) {
      const emoji = skill.emoji ?? "📦";
      lines.push(`  ${emoji} ${skill.name}`);
    }
  }

  if (missingReqs.length > 0) {
    lines.push("");
    lines.push(theme.heading("Requisitos ausentes:"));
    for (const skill of missingReqs) {
      const emoji = skill.emoji ?? "📦";
      const missing: string[] = [];
      if (skill.missing.bins.length > 0) {
        missing.push(`binários: ${skill.missing.bins.join(", ")}`);
      }
      if (skill.missing.anyBins.length > 0) {
        missing.push(`qualquer binário: ${skill.missing.anyBins.join(", ")}`);
      }
      if (skill.missing.env.length > 0) {
        missing.push(`ambiente: ${skill.missing.env.join(", ")}`);
      }
      if (skill.missing.config.length > 0) {
        missing.push(`configuração: ${skill.missing.config.join(", ")}`);
      }
      if (skill.missing.os.length > 0) {
        missing.push(`so: ${skill.missing.os.join(", ")}`);
      }
      lines.push(`  ${emoji} ${skill.name} ${theme.muted(`(${missing.join("; ")})`)}`);
    }
  }

  return appendZeroHubHint(lines.join("\n"), opts.json);
}

/**
 * Register the skills CLI commands
 */
export function registerSkillsCli(program: Command) {
  const skills = program
    .command("skills")
    .description("Listar e inspecionar skills disponíveis")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/skills", "docs.zero.local/cli/skills")}\n`,
    );

  skills
    .command("list")
    .description("Listar todas as skills disponíveis")
    .option("--json", "Saída em JSON", false)
    .option("--eligible", "Mostrar apenas skills elegíveis (prontas para uso)", false)
    .option("-v, --verbose", "Mostrar mais detalhes, incluindo requisitos ausentes", false)
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
        const report = buildWorkspaceSkillStatus(workspaceDir, { config });
        defaultRuntime.log(formatSkillsList(report, opts));
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });

  skills
    .command("info")
    .description("Mostrar informações detalhadas sobre uma skill")
    .argument("<name>", "Nome da skill")
    .option("--json", "Saída em JSON", false)
    .action(async (name, opts) => {
      try {
        const config = loadConfig();
        const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
        const report = buildWorkspaceSkillStatus(workspaceDir, { config });
        defaultRuntime.log(formatSkillInfo(report, name, opts));
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });

  skills
    .command("check")
    .description("Verificar quais skills estão prontas vs requisitos ausentes")
    .option("--json", "Saída em JSON", false)
    .action(async (opts) => {
      try {
        const config = loadConfig();
        const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
        const report = buildWorkspaceSkillStatus(workspaceDir, { config });
        defaultRuntime.log(formatSkillsCheck(report, opts));
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });

  // Default action (no subcommand) - show list
  skills.action(async () => {
    try {
      const config = loadConfig();
      const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
      const report = buildWorkspaceSkillStatus(workspaceDir, { config });
      defaultRuntime.log(formatSkillsList(report, {}));
    } catch (err) {
      defaultRuntime.error(String(err));
      defaultRuntime.exit(1);
    }
  });
}
