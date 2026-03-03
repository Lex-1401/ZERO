import type { Command } from "commander";
import type { GatewayDaemonRuntime } from "../../commands/daemon-runtime.js";
import { onboardCommand } from "../../commands/onboard.js";
import type {
  AuthChoice,
  GatewayAuthChoice,
  GatewayBind,
  NodeManagerChoice,
  TailscaleMode,
} from "../../commands/onboard-types.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { runCommandWithRuntime } from "../cli-utils.js";

function resolveInstallDaemonFlag(
  command: unknown,
  opts: { installDaemon?: boolean },
): boolean | undefined {
  if (!command || typeof command !== "object") return undefined;
  const getOptionValueSource =
    "getOptionValueSource" in command ? command.getOptionValueSource : undefined;
  if (typeof getOptionValueSource !== "function") return undefined;

  // Commander doesn't support option conflicts natively; keep original behavior.
  // If --skip-daemon is explicitly passed, it wins.
  if (getOptionValueSource.call(command, "skipDaemon") === "cli") return false;
  if (getOptionValueSource.call(command, "installDaemon") === "cli") {
    return Boolean(opts.installDaemon);
  }
  return undefined;
}

export function registerOnboardCommand(program: Command) {
  program
    .command("onboard")
    .description("Wizard interativo para configurar o gateway, workspace e habilidades")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/onboard", "docs.zero.local/cli/onboard")}\n`,
    )
    .option("--workspace <dir>", "Diretório de workspace do agente (padrão: ~/zero)")
    .option("--reset", "Resetar config + credenciais + sessões + workspace antes de rodar o wizard")
    .option("--non-interactive", "Rodar sem prompts", false)
    .option(
      "--accept-risk",
      "Reconhecer que agentes são poderosos e acesso total ao sistema é arriscado (obrigatório para --non-interactive)",
      false,
    )
    .option("--flow <flow>", "Fluxo do Wizard: quickstart|advanced|manual")
    .option("--mode <mode>", "Modo do Wizard: local|remote")
    .option(
      "--auth-choice <choice>",
      "Auth: setup-token|claude-cli|token|chutes|openai-codex|openai-api-key|openrouter-api-key|ai-gateway-api-key|moonshot-api-key|kimi-code-api-key|synthetic-api-key|codex-cli|gemini-api-key|zai-api-key|apiKey|minimax-api|minimax-api-lightning|opencode-zen|skip",
    )
    .option(
      "--token-provider <id>",
      "ID do provedor de token (não interativo; usado com --auth-choice token)",
    )
    .option("--token <token>", "Valor do token (não interativo; usado com --auth-choice token)")
    .option(
      "--token-profile-id <id>",
      "ID do perfil de auth (não interativo; padrão: <provider>:manual)",
    )
    .option(
      "--token-expires-in <duration>",
      "Duração opcional de expiração do token (ex: 365d, 12h)",
    )
    .option("--anthropic-api-key <key>", "Chave API Anthropic")
    .option("--openai-api-key <key>", "Chave API OpenAI")
    .option("--openrouter-api-key <key>", "Chave API OpenRouter")
    .option("--ai-gateway-api-key <key>", "Chave API Vercel AI Gateway")
    .option("--moonshot-api-key <key>", "Chave API Moonshot")
    .option("--kimi-code-api-key <key>", "Chave API Kimi Code")
    .option("--gemini-api-key <key>", "Chave API Gemini")
    .option("--zai-api-key <key>", "Chave API Z.AI")
    .option("--minimax-api-key <key>", "Chave API MiniMax")
    .option("--synthetic-api-key <key>", "Chave API Sintética")
    .option("--opencode-zen-api-key <key>", "Chave API OpenCode Zen")
    .option("--gateway-port <port>", "Porta do Gateway")
    .option("--gateway-bind <mode>", "Bind do Gateway: loopback|tailnet|lan|auto|custom")
    .option("--gateway-auth <mode>", "Auth do Gateway: off|token|password")
    .option("--gateway-token <token>", "Token do Gateway (auth por token)")
    .option("--gateway-password <password>", "Senha do Gateway (auth por senha)")
    .option("--remote-url <url>", "URL WebSocket do Gateway Remoto")
    .option("--remote-token <token>", "Token do Gateway Remoto (opcional)")
    .option("--tailscale <mode>", "Tailscale: off|serve|funnel")
    .option("--tailscale-reset-on-exit", "Resetar tailscale serve/funnel ao sair")
    .option("--install-daemon", "Instalar serviço gateway")
    .option("--no-install-daemon", "Pular instalação do serviço gateway")
    .option("--skip-daemon", "Pular instalação do serviço gateway")
    .option("--daemon-runtime <runtime>", "Runtime do Daemon: node|bun")
    .option("--skip-channels", "Pular configuração de canais")
    .option("--skip-skills", "Pular configuração de habilidades")
    .option("--skip-health", "Pular verificação de saúde")
    .option("--skip-ui", "Pular prompts de UI/TUI de Controle")
    .option("--node-manager <name>", "Gerenciador de node para habilidades: npm|pnpm|bun")
    .option("--json", "Resumo JSON de saída", false)
    .action(async (opts, command) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        const installDaemon = resolveInstallDaemonFlag(command, {
          installDaemon: Boolean(opts.installDaemon),
        });
        const gatewayPort =
          typeof opts.gatewayPort === "string" ? Number.parseInt(opts.gatewayPort, 10) : undefined;
        await onboardCommand(
          {
            workspace: opts.workspace as string | undefined,
            nonInteractive: Boolean(opts.nonInteractive),
            acceptRisk: Boolean(opts.acceptRisk),
            flow: opts.flow as "quickstart" | "advanced" | "manual" | undefined,
            mode: opts.mode as "local" | "remote" | undefined,
            authChoice: opts.authChoice as AuthChoice | undefined,
            tokenProvider: opts.tokenProvider as string | undefined,
            token: opts.token as string | undefined,
            tokenProfileId: opts.tokenProfileId as string | undefined,
            tokenExpiresIn: opts.tokenExpiresIn as string | undefined,
            anthropicApiKey: opts.anthropicApiKey as string | undefined,
            openaiApiKey: opts.openaiApiKey as string | undefined,
            openrouterApiKey: opts.openrouterApiKey as string | undefined,
            aiGatewayApiKey: opts.aiGatewayApiKey as string | undefined,
            moonshotApiKey: opts.moonshotApiKey as string | undefined,
            kimiCodeApiKey: opts.kimiCodeApiKey as string | undefined,
            geminiApiKey: opts.geminiApiKey as string | undefined,
            zaiApiKey: opts.zaiApiKey as string | undefined,
            minimaxApiKey: opts.minimaxApiKey as string | undefined,
            syntheticApiKey: opts.syntheticApiKey as string | undefined,
            opencodeZenApiKey: opts.opencodeZenApiKey as string | undefined,
            gatewayPort:
              typeof gatewayPort === "number" && Number.isFinite(gatewayPort)
                ? gatewayPort
                : undefined,
            gatewayBind: opts.gatewayBind as GatewayBind | undefined,
            gatewayAuth: opts.gatewayAuth as GatewayAuthChoice | undefined,
            gatewayToken: opts.gatewayToken as string | undefined,
            gatewayPassword: opts.gatewayPassword as string | undefined,
            remoteUrl: opts.remoteUrl as string | undefined,
            remoteToken: opts.remoteToken as string | undefined,
            tailscale: opts.tailscale as TailscaleMode | undefined,
            tailscaleResetOnExit: Boolean(opts.tailscaleResetOnExit),
            reset: Boolean(opts.reset),
            installDaemon,
            daemonRuntime: opts.daemonRuntime as GatewayDaemonRuntime | undefined,
            skipChannels: Boolean(opts.skipChannels),
            skipSkills: Boolean(opts.skipSkills),
            skipHealth: Boolean(opts.skipHealth),
            skipUi: Boolean(opts.skipUi),
            nodeManager: opts.nodeManager as NodeManagerChoice | undefined,
            json: Boolean(opts.json),
          },
          defaultRuntime,
        );
      });
    });
}
