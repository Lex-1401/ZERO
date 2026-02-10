import type { ZEROConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import { buildWorkspaceHookStatus } from "../hooks/hooks-status.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { formatCliCommand } from "../cli/command-format.js";

export async function setupInternalHooks(
  cfg: ZEROConfig,
  runtime: RuntimeEnv,
  prompter: WizardPrompter,
): Promise<ZEROConfig> {
  await prompter.note(
    [
      "Os Hooks permitem automatizar ações quando comandos do agente são emitidos.",
      "Exemplo: Salvar o contexto da sessão na memória quando você usa /new.",
      "",
      "Saiba mais: https://github.com/Lex-1401/ZERO/tree/main/docs/hooks",
    ].join("\n"),
    "Hooks",
  );

  // Discover available hooks using the hook discovery system
  const workspaceDir = resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg));
  const report = buildWorkspaceHookStatus(workspaceDir, { config: cfg });

  // Show every eligible hook so users can opt in during onboarding.
  const eligibleHooks = report.hooks.filter((h) => h.eligible);

  if (eligibleHooks.length === 0) {
    await prompter.note(
      "Nenhum hook elegível encontrado. Você pode configurar os hooks mais tarde na sua configuração.",
      "Nenhum Hook Disponível",
    );
    return cfg;
  }

  const toEnable = await prompter.multiselect({
    message: "Ativar hooks?",
    options: [
      { value: "__skip__", label: "Pular por agora" },
      ...eligibleHooks.map((hook) => ({
        value: hook.name,
        label: `${hook.emoji ?? "🔗"} ${hook.name}`,
        hint: hook.description,
      })),
    ],
  });

  const selected = (toEnable as string[]).filter((name) => name !== "__skip__");
  if (selected.length === 0) {
    return cfg;
  }

  // Enable selected hooks using the new entries config format
  const entries = { ...cfg.hooks?.internal?.entries };
  for (const name of selected) {
    entries[name] = { enabled: true };
  }

  const next: ZEROConfig = {
    ...cfg,
    hooks: {
      ...cfg.hooks,
      internal: {
        enabled: true,
        entries,
      },
    },
  };

  await prompter.note(
    [
      `${selected.length} hook${selected.length > 1 ? "s" : ""} ativado${selected.length > 1 ? "s" : ""}: ${selected.join(", ")}`,
      "",
      "Você pode gerenciar os hooks mais tarde com:",
      `  ${formatCliCommand("zero hooks list")}`,
      `  ${formatCliCommand("zero hooks enable <name>")}`,
      `  ${formatCliCommand("zero hooks disable <name>")}`,
    ].join("\n"),
    "Hooks Configurados",
  );

  return next;
}
