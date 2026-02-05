import { installSkill } from "../agents/skills-install.js";
import { buildWorkspaceSkillStatus } from "../agents/skills-status.js";
import { formatCliCommand } from "../cli/command-format.js";
import type { ZEROConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import { detectBinary, resolveNodeManagerOptions } from "./onboard-helpers.js";

function summarizeInstallFailure(message: string): string | undefined {
  const cleaned = message.replace(/^Install failed(?:\s*\([^)]*\))?\s*:?\s*/i, "").trim();
  if (!cleaned) return undefined;
  const maxLen = 140;
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 1)}…` : cleaned;
}

function formatSkillHint(skill: {
  description?: string;
  install: Array<{ label: string }>;
}): string {
  const desc = skill.description?.trim();
  const installLabel = skill.install[0]?.label?.trim();
  const combined = desc && installLabel ? `${desc} — ${installLabel}` : desc || installLabel;
  if (!combined) return "install";
  const maxLen = 90;
  return combined.length > maxLen ? `${combined.slice(0, maxLen - 1)}…` : combined;
}

function upsertSkillEntry(
  cfg: ZEROConfig,
  skillKey: string,
  patch: { apiKey?: string },
): ZEROConfig {
  const entries = { ...cfg.skills?.entries };
  const existing = (entries[skillKey] as { apiKey?: string } | undefined) ?? {};
  entries[skillKey] = { ...existing, ...patch };
  return {
    ...cfg,
    skills: {
      ...cfg.skills,
      entries,
    },
  };
}

export async function setupSkills(
  cfg: ZEROConfig,
  workspaceDir: string,
  runtime: RuntimeEnv,
  prompter: WizardPrompter,
): Promise<ZEROConfig> {
  const report = buildWorkspaceSkillStatus(workspaceDir, { config: cfg });
  const eligible = report.skills.filter((s) => s.eligible);
  const missing = report.skills.filter((s) => !s.eligible && !s.disabled && !s.blockedByAllowlist);
  const blocked = report.skills.filter((s) => s.blockedByAllowlist);

  const needsBrewPrompt =
    process.platform !== "win32" &&
    report.skills.some((skill) => skill.install.some((option) => option.kind === "brew")) &&
    !(await detectBinary("brew"));

  await prompter.note(
    [
      `Elegíveis: ${eligible.length}`,
      `Requisitos ausentes: ${missing.length}`,
      `Bloqueadas pela lista branca: ${blocked.length}`,
    ].join("\n"),
    "Status das habilidades",
  );

  const shouldConfigure = await prompter.confirm({
    message: "Configurar habilidades agora? (recomendado)",
    initialValue: true,
  });
  if (!shouldConfigure) return cfg;

  if (needsBrewPrompt) {
    await prompter.note(
      [
        "Muitas dependências de habilidades são distribuídas via Homebrew.",
        "Sem o brew, você precisará compilar do código-fonte ou baixar as versões manualmente.",
      ].join("\n"),
      "Homebrew recomendado",
    );
    const showBrewInstall = await prompter.confirm({
      message: "Mostrar comando de instalação do Homebrew?",
      initialValue: true,
    });
    if (showBrewInstall) {
      await prompter.note(
        [
          "Execute:",
          '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
        ].join("\n"),
        "Instalação do Homebrew",
      );
    }
  }

  const nodeManager = (await prompter.select({
    message: "Gerenciador de node preferido para instalação de habilidades",
    options: resolveNodeManagerOptions(),
  })) as "npm" | "pnpm" | "bun";

  let next: ZEROConfig = {
    ...cfg,
    skills: {
      ...cfg.skills,
      install: {
        ...cfg.skills?.install,
        nodeManager,
      },
    },
  };

  const installable = missing.filter(
    (skill) => skill.install.length > 0 && skill.missing.bins.length > 0,
  );
  if (installable.length > 0) {
    const toInstall = await prompter.multiselect({
      message: "Instalar dependências de habilidades ausentes",
      options: [
        {
          value: "__skip__",
          label: "Pular por agora",
          hint: "Continuar sem instalar dependências",
        },
        ...installable.map((skill) => ({
          value: skill.name,
          label: `${skill.emoji ?? "🧩"} ${skill.name}`,
          hint: formatSkillHint(skill),
        })),
      ],
    });

    const selected = (toInstall as string[]).filter((name) => name !== "__skip__");
    for (const name of selected) {
      const target = installable.find((s) => s.name === name);
      if (!target || target.install.length === 0) continue;
      const installId = target.install[0]?.id;
      if (!installId) continue;
      const spin = prompter.progress(`Instalando ${name}…`);
      const result = await installSkill({
        workspaceDir,
        skillName: target.name,
        installId,
        config: next,
      });
      if (result.ok) {
        spin.stop(`Instalado ${name}`);
      } else {
        const code = result.code == null ? "" : ` (saída ${result.code})`;
        const detail = summarizeInstallFailure(result.message);
        spin.stop(`Falha na instalação: ${name}${code}${detail ? ` — ${detail}` : ""}`);
        if (result.stderr) runtime.log(result.stderr.trim());
        else if (result.stdout) runtime.log(result.stdout.trim());
        runtime.log(
          `Dica: execute \`${formatCliCommand("zero doctor")}\` para revisar habilidades + requisitos.`,
        );
        runtime.log("Documentação: https://docs.zero.local/skills");
      }
    }
  }

  for (const skill of missing) {
    if (!skill.primaryEnv || skill.missing.env.length === 0) continue;
    const wantsKey = await prompter.confirm({
      message: `Definir ${skill.primaryEnv} para ${skill.name}?`,
      initialValue: false,
    });
    if (!wantsKey) continue;
    const apiKey = String(
      await prompter.text({
        message: `Insira ${skill.primaryEnv}`,
        validate: (value) => (value?.trim() ? undefined : "Obrigatório"),
      }),
    );
    next = upsertSkillEntry(next, skill.skillKey, { apiKey: apiKey.trim() });
  }

  return next;
}
