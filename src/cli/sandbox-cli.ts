import type { Command } from "commander";

import { sandboxListCommand, sandboxRecreateCommand } from "../commands/sandbox.js";
import { sandboxExplainCommand } from "../commands/sandbox-explain.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { formatHelpExamples } from "./help-format.js";

// --- Types ---

type CommandOptions = Record<string, unknown>;

// --- Helpers ---

const SANDBOX_EXAMPLES = {
  main: [
    ["zero sandbox list", "Listar todos os containers sandbox."],
    ["zero sandbox list --browser", "Listar apenas containers de navegador."],
    ["zero sandbox recreate --all", "Recriar todos os containers."],
    ["zero sandbox recreate --session main", "Recriar uma sessão específica."],
    ["zero sandbox recreate --agent mybot", "Recriar containers do agente."],
    ["zero sandbox explain", "Explicar configuração efetiva do sandbox."],
  ],
  list: [
    ["zero sandbox list", "Listar todos os containers sandbox."],
    ["zero sandbox list --browser", "Listar apenas containers de navegador."],
    ["zero sandbox list --json", "Saída JSON."],
  ],
  recreate: [
    ["zero sandbox recreate --all", "Recriar todos os containers."],
    ["zero sandbox recreate --session main", "Recriar uma sessão específica."],
    ["zero sandbox recreate --agent mybot", "Recriar um agente específico (inclui sub-agentes)."],
    ["zero sandbox recreate --browser --all", "Recriar apenas containers de navegador."],
    ["zero sandbox recreate --all --force", "Pular confirmação."],
  ],
  explain: [
    ["zero sandbox explain", "Mostrar configuração efetiva do sandbox."],
    ["zero sandbox explain --session agent:main:main", "Explicar uma sessão específica."],
    ["zero sandbox explain --agent work", "Explicar um sandbox de agente."],
    ["zero sandbox explain --json", "Saída JSON."],
  ],
} as const;

function createRunner(
  commandFn: (opts: CommandOptions, runtime: typeof defaultRuntime) => Promise<void>,
) {
  return async (opts: CommandOptions) => {
    try {
      await commandFn(opts, defaultRuntime);
    } catch (err) {
      defaultRuntime.error(String(err));
      defaultRuntime.exit(1);
    }
  };
}

// --- Registration ---

export function registerSandboxCli(program: Command) {
  const sandbox = program
    .command("sandbox")
    .description("Gerenciar containers sandbox (isolamento de agente baseado em Docker)")
    .addHelpText(
      "after",
      () => `\n${theme.heading("Exemplos:")}\n${formatHelpExamples(SANDBOX_EXAMPLES.main)}\n`,
    )
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/sandbox", "docs.zero.local/cli/sandbox")}\n`,
    )
    .action(() => {
      sandbox.help({ error: true });
    });

  // --- List Command ---

  sandbox
    .command("list")
    .description("Listar containers sandbox e seu status")
    .option("--json", "Saída em JSON", false)
    .option("--browser", "Listar apenas containers de navegador", false)
    .addHelpText(
      "after",
      () =>
        `\n${theme.heading("Exemplos:")}\n${formatHelpExamples(SANDBOX_EXAMPLES.list)}\n\n${theme.heading(
          "A saída inclui:",
        )}\n${theme.muted("- Nome do container e status (rodando/parado)")}\n${theme.muted(
          "- Imagem Docker e se coincide com a config atual",
        )}\n${theme.muted("- Idade (tempo desde a criação)")}\n${theme.muted(
          "- Tempo inativo (tempo desde o último uso)",
        )}\n${theme.muted("- ID da sessão/agente associado")}`,
    )
    .action(
      createRunner((opts) =>
        sandboxListCommand(
          {
            browser: Boolean(opts.browser),
            json: Boolean(opts.json),
          },
          defaultRuntime,
        ),
      ),
    );

  // --- Recreate Command ---

  sandbox
    .command("recreate")
    .description("Remover containers para forçar a recriação com config atualizada")
    .option("--all", "Recriar todos os containers sandbox", false)
    .option("--session <key>", "Recriar container para sessão específica")
    .option("--agent <id>", "Recriar containers para agente específico")
    .option("--browser", "Apenas recriar containers de navegador", false)
    .option("--force", "Pular prompt de confirmação", false)
    .addHelpText(
      "after",
      () =>
        `\n${theme.heading("Exemplos:")}\n${formatHelpExamples(SANDBOX_EXAMPLES.recreate)}\n\n${theme.heading(
          "Por que usar isso?",
        )}\n${theme.muted(
          "Após atualizar imagens Docker ou a configuração do sandbox, os containers existentes continuam rodando com as configurações antigas.",
        )}\n${theme.muted(
          "Este comando os remove para que sejam recriados automaticamente com a config atual na próxima vez que forem necessários.",
        )}\n\n${theme.heading("Opções de filtro:")}\n${theme.muted(
          "  --all          Remover todos os containers sandbox",
        )}\n${theme.muted(
          "  --session      Remover container para uma chave de sessão específica",
        )}\n${theme.muted(
          "  --agent        Remover containers para um agente (inclui variantes agente:id:*)",
        )}\n\n${theme.heading("Modificadores:")}\n${theme.muted(
          "  --browser      Apenas afetar containers de navegador (não sandbox regular)",
        )}\n${theme.muted("  --force        Pular prompt de confirmação")}`,
    )
    .action(
      createRunner((opts) =>
        sandboxRecreateCommand(
          {
            all: Boolean(opts.all),
            session: opts.session as string | undefined,
            agent: opts.agent as string | undefined,
            browser: Boolean(opts.browser),
            force: Boolean(opts.force),
          },
          defaultRuntime,
        ),
      ),
    );

  // --- Explain Command ---

  sandbox
    .command("explain")
    .description("Explicar a política efetiva de sandbox/ferramenta para uma sessão/agente")
    .option("--session <key>", "Chave da sessão para inspecionar (padrão agende main)")
    .option("--agent <id>", "ID do agente para inspecionar (padrão agente derivado)")
    .option("--json", "Saída em JSON", false)
    .addHelpText(
      "after",
      () => `\n${theme.heading("Exemplos:")}\n${formatHelpExamples(SANDBOX_EXAMPLES.explain)}\n`,
    )
    .action(
      createRunner((opts) =>
        sandboxExplainCommand(
          {
            session: opts.session as string | undefined,
            agent: opts.agent as string | undefined,
            json: Boolean(opts.json),
          },
          defaultRuntime,
        ),
      ),
    );
}
