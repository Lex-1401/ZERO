import type { Command } from "commander";
import { DEFAULT_CHAT_CHANNEL } from "../../channels/registry.js";
import { agentCliCommand } from "../../commands/agent-via-gateway.js";
import {
  agentsAddCommand,
  agentsDeleteCommand,
  agentsListCommand,
  agentsSetIdentityCommand,
} from "../../commands/agents.js";
import { setVerbose } from "../../globals.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { hasExplicitOptions } from "../command-options.js";
import { formatHelpExamples } from "../help-format.js";
import { createDefaultDeps } from "../deps.js";
import { runCommandWithRuntime } from "../cli-utils.js";
import { collectOption } from "./helpers.js";

export function registerAgentCommands(program: Command, args: { agentChannelOptions: string }) {
  program
    .command("agent")
    .description("Execute um turno de agente via Gateway (use --local para embarcado)")
    .requiredOption("-m, --message <text>", "Corpo da mensagem para o agente")
    .option(
      "-t, --to <number>",
      "Número do destinatário em E.164 usado para derivar a chave de sessão",
    )
    .option("--session-id <id>", "Use um id de sessão explícito")
    .option("--agent <id>", "Id do agente (substitui bindings de roteamento)")
    .option("--thinking <level>", "Nível de pensamento: off | minimal | low | medium | high")
    .option("--verbose <on|off>", "Persistir nível verbose do agente para a sessão")
    .option(
      "--channel <channel>",
      `Canal de entrega: ${args.agentChannelOptions} (padrão: ${DEFAULT_CHAT_CHANNEL})`,
    )
    .option(
      "--reply-to <target>",
      "Substituição de alvo de entrega (separado do roteamento de sessão)",
    )
    .option(
      "--reply-channel <channel>",
      "Substituição de canal de entrega (separado do roteamento)",
    )
    .option("--reply-account <id>", "Substituição de id da conta de entrega")
    .option(
      "--local",
      "Executar o agente embarcado localmente (requer chaves API do provedor de modelo no seu shell)",
      false,
    )
    .option("--deliver", "Enviar a resposta do agente de volta para o canal selecionado", false)
    .option("--json", "Resultado de saída como JSON", false)
    .option(
      "--timeout <seconds>",
      "Substituir timeout de comando do agente (segundos, padrão 600 ou valor de configuração)",
    )
    .addHelpText(
      "after",
      () =>
        `
${theme.heading("Exemplos:")}
${formatHelpExamples([
  ['zero agent --to +15555550123 --message "status update"', "Inicie uma nova sessão."],
  ['zero agent --agent ops --message "Summarize logs"', "Use um agente específico."],
  [
    'zero agent --session-id 1234 --message "Summarize inbox" --thinking medium',
    "Alvo em uma sessão com nível de pensamento explícito.",
  ],
  [
    'zero agent --to +15555550123 --message "Trace logs" --verbose on --json',
    "Habilite verbose logging e saída JSON.",
  ],
  ['zero agent --to +15555550123 --message "Summon reply" --deliver', "Entregar resposta."],
  [
    'zero agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"',
    "Enviar resposta para um canal/alvo diferente.",
  ],
])}

${theme.muted("Docs:")} ${formatDocsLink("/cli/agent", "docs.zero.local/cli/agent")}`,
    )
    .action(async (opts) => {
      const verboseLevel = typeof opts.verbose === "string" ? opts.verbose.toLowerCase() : "";
      setVerbose(verboseLevel === "on");
      // Build default deps (keeps parity with other commands; future-proofing).
      const deps = createDefaultDeps();
      await runCommandWithRuntime(defaultRuntime, async () => {
        await agentCliCommand(opts, defaultRuntime, deps);
      });
    });

  const agents = program
    .command("agents")
    .description("Gerenciar agentes isolados (workspaces + auth + roteamento)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/agents", "docs.zero.local/cli/agents")}\n`,
    );

  agents
    .command("list")
    .description("Listar agentes configurados")
    .option("--json", "Saída JSON em vez de texto", false)
    .option("--bindings", "Incluir bindings de roteamento", false)
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await agentsListCommand(
          { json: Boolean(opts.json), bindings: Boolean(opts.bindings) },
          defaultRuntime,
        );
      });
    });

  agents
    .command("add [name]")
    .description("Adicionar um novo agente isolado")
    .option("--workspace <dir>", "Diretório de workspace para o novo agente")
    .option("--model <id>", "Id do modelo para este agente")
    .option("--agent-dir <dir>", "Diretório de estado do agente para este agente")
    .option(
      "--bind <channel[:accountId]>",
      "Binding de canal de rota (repetível)",
      collectOption,
      [],
    )
    .option("--non-interactive", "Desabilitar prompts; requer --workspace", false)
    .option("--json", "Resumo JSON de saída", false)
    .action(async (name, opts, command) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        const hasFlags = hasExplicitOptions(command, [
          "workspace",
          "model",
          "agentDir",
          "bind",
          "nonInteractive",
        ]);
        await agentsAddCommand(
          {
            name: typeof name === "string" ? name : undefined,
            workspace: opts.workspace as string | undefined,
            model: opts.model as string | undefined,
            agentDir: opts.agentDir as string | undefined,
            bind: Array.isArray(opts.bind) ? (opts.bind as string[]) : undefined,
            nonInteractive: Boolean(opts.nonInteractive),
            json: Boolean(opts.json),
          },
          defaultRuntime,
          { hasFlags },
        );
      });
    });

  agents
    .command("set-identity")
    .description("Atualizar identidade de um agente (nome/tema/emoji/avatar)")
    .option("--agent <id>", "Id do agente para atualizar")
    .option(
      "--workspace <dir>",
      "Diretório de workspace usado para localizar o agente + IDENTITY.md",
    )
    .option("--identity-file <path>", "Caminho explícito de IDENTITY.md para ler")
    .option("--from-identity", "Ler valores de IDENTITY.md", false)
    .option("--name <name>", "Nome da identidade")
    .option("--theme <theme>", "Tema da identidade")
    .option("--emoji <emoji>", "Emoji da identidade")
    .option(
      "--avatar <value>",
      "Avatar da identidade (caminho workspace, URL http(s), ou data URI)",
    )
    .option("--json", "Resumo JSON de saída", false)
    .addHelpText(
      "after",
      () =>
        `
${theme.heading("Exemplos:")}
${formatHelpExamples([
  ['zero agents set-identity --agent main --name "Zero" --emoji "∅"', "Definir nome + emoji."],
  ["zero agents set-identity --agent main --avatar avatars/zero.png", "Definir caminho do avatar."],
  ["zero agents set-identity --workspace ~/zero --from-identity", "Carregar de IDENTITY.md."],
  [
    "zero agents set-identity --identity-file ~/zero/IDENTITY.md --agent main",
    "Use um IDENTITY.md específico.",
  ],
])}
`,
    )
    .action(async (opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await agentsSetIdentityCommand(
          {
            agent: opts.agent as string | undefined,
            workspace: opts.workspace as string | undefined,
            identityFile: opts.identityFile as string | undefined,
            fromIdentity: Boolean(opts.fromIdentity),
            name: opts.name as string | undefined,
            theme: opts.theme as string | undefined,
            emoji: opts.emoji as string | undefined,
            avatar: opts.avatar as string | undefined,
            json: Boolean(opts.json),
          },
          defaultRuntime,
        );
      });
    });

  agents
    .command("delete <id>")
    .description("Deletar um agente e limpar workspace/estado")
    .option("--force", "Pular confirmação", false)
    .option("--json", "Resumo JSON de saída", false)
    .action(async (id, opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await agentsDeleteCommand(
          {
            id: String(id),
            force: Boolean(opts.force),
            json: Boolean(opts.json),
          },
          defaultRuntime,
        );
      });
    });

  agents.action(async () => {
    await runCommandWithRuntime(defaultRuntime, async () => {
      await agentsListCommand({}, defaultRuntime);
    });
  });
}
