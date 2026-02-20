import type { Command } from "commander";
import { formatCliChannelOptions } from "./channel-options.js";
import {
  channelsAddCommand,
  channelsCapabilitiesCommand,
  channelsListCommand,
  channelsLogsCommand,
  channelsRemoveCommand,
  channelsResolveCommand,
  channelsStatusCommand,
} from "../commands/channels.js";
import { danger } from "../globals.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { runChannelLogin, runChannelLogout } from "./channel-auth.js";
import { runCommandWithRuntime } from "./cli-utils.js";
import { hasExplicitOptions } from "./command-options.js";

const optionNamesAdd = [
  "channel",
  "account",
  "name",
  "token",
  "tokenFile",
  "botToken",
  "appToken",
  "signalNumber",
  "cliPath",
  "dbPath",
  "service",
  "region",
  "authDir",
  "httpUrl",
  "httpHost",
  "httpPort",
  "webhookPath",
  "webhookUrl",
  "audienceType",
  "audience",
  "useEnv",
  "homeserver",
  "userId",
  "accessToken",
  "password",
  "deviceName",
  "initialSyncLimit",
  "ship",
  "url",
  "code",
  "groupChannels",
  "dmAllowlist",
  "autoDiscoverChannels",
] as const;

const optionNamesRemove = ["channel", "account", "delete"] as const;

function runChannelsCommand(action: () => Promise<void>) {
  return runCommandWithRuntime(defaultRuntime, action);
}

function runChannelsCommandWithDanger(action: () => Promise<void>, label: string) {
  return runCommandWithRuntime(defaultRuntime, action, (err) => {
    defaultRuntime.error(danger(`${label}: ${String(err)}`));
    defaultRuntime.exit(1);
  });
}

export function registerChannelsCli(program: Command) {
  const channelNames = formatCliChannelOptions();
  const channels = program
    .command("channels")
    .description("Gerenciar contas de canais de chat")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink(
          "/cli/channels",
          "docs.zero.local/cli/channels",
        )}\n`,
    );

  channels
    .command("list")
    .description("Listar canais configurados + perfis de auth")
    .option("--no-usage", "Pular snapshots de uso/quota de provedor de modelo")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runChannelsCommand(async () => {
        await channelsListCommand(opts, defaultRuntime);
      });
    });

  channels
    .command("status")
    .description("Mostrar status do canal gateway (use status --deep para local)")
    .option("--probe", "Sondar credenciais do canal", false)
    .option("--timeout <ms>", "Timeout em ms", "10000")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runChannelsCommand(async () => {
        await channelsStatusCommand(opts, defaultRuntime);
      });
    });

  channels
    .command("capabilities")
    .description("Mostrar capacidades do provedor (intents/escopos + recursos suportados)")
    .option("--channel <name>", `Canal (${formatCliChannelOptions(["all"])})`)
    .option("--account <id>", "Id da conta (apenas com --channel)")
    .option("--target <dest>", "Alvo do canal para auditoria de permissão (Discord channel:<id>)")
    .option("--timeout <ms>", "Timeout em ms", "10000")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runChannelsCommand(async () => {
        await channelsCapabilitiesCommand(opts, defaultRuntime);
      });
    });

  channels
    .command("resolve")
    .description("Resolver nomes de canal/usuário para IDs")
    .argument("<entries...>", "Entradas para resolver (nomes ou ids)")
    .option("--channel <name>", `Canal (${channelNames})`)
    .option("--account <id>", "Id da conta (accountId)")
    .option("--kind <kind>", "Tipo de alvo (auto|user|group)", "auto")
    .option("--json", "Saída JSON", false)
    .action(async (entries, opts) => {
      await runChannelsCommand(async () => {
        await channelsResolveCommand(
          {
            channel: opts.channel as string | undefined,
            account: opts.account as string | undefined,
            kind: opts.kind as "auto" | "user" | "group",
            json: Boolean(opts.json),
            entries: Array.isArray(entries) ? entries : [String(entries)],
          },
          defaultRuntime,
        );
      });
    });

  channels
    .command("logs")
    .description("Mostrar logs recentes do gateway a partir do arquivo de log")
    .option("--channel <name>", `Canal (${formatCliChannelOptions(["all"])})`, "all")
    .option("--lines <n>", "Número de linhas (padrão: 200)", "200")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runChannelsCommand(async () => {
        await channelsLogsCommand(opts, defaultRuntime);
      });
    });

  channels
    .command("add")
    .description("Adicionar ou atualizar uma conta de canal")
    .option("--channel <name>", `Canal (${channelNames})`)
    .option("--account <id>", "Id da conta (padrão quando omitido)")
    .option("--name <name>", "Nome de exibição para esta conta")
    .option("--token <token>", "Token do bot (Telegram/Discord)")
    .option("--token-file <path>", "Arquivo de token do bot (Telegram)")
    .option("--bot-token <token>", "Token do bot Slack (xoxb-...)")
    .option("--app-token <token>", "Token do app Slack (xapp-...)")
    .option("--signal-number <e164>", "Número da conta Signal (E.164)")
    .option("--cli-path <path>", "Caminho do CLI (signal-cli ou imsg)")
    .option("--db-path <path>", "Caminho do banco de dados iMessage")
    .option("--service <service>", "Serviço iMessage (imessage|sms|auto)")
    .option("--region <region>", "Região iMessage (para SMS)")
    .option("--auth-dir <path>", "Diretório de auth WhatsApp (override)")
    .option("--http-url <url>", "URL base do daemon HTTP Signal")
    .option("--http-host <host>", "Host HTTP Signal")
    .option("--http-port <port>", "Porta HTTP Signal")
    .option("--webhook-path <path>", "Caminho do Webhook (Google Chat/BlueBubbles)")
    .option("--webhook-url <url>", "URL do Webhook Google Chat")
    .option("--audience-type <type>", "Tipo de audiência Google Chat (app-url|project-number)")
    .option(
      "--audience <value>",
      "Valor de audiência Google Chat (URL do app ou número do projeto)",
    )
    .option("--homeserver <url>", "URL do homeserver Matrix")
    .option("--user-id <id>", "ID de usuário Matrix")
    .option("--access-token <token>", "Token de acesso Matrix")
    .option("--password <password>", "Senha Matrix")
    .option("--device-name <name>", "Nome do dispositivo Matrix")
    .option("--initial-sync-limit <n>", "Limite de sincronização inicial Matrix")
    .option("--ship <ship>", "Nome do ship Tlon (~sampel-palnet)")
    .option("--url <url>", "URL do ship Tlon")
    .option("--code <code>", "Código de login Tlon")
    .option("--group-channels <list>", "Canais de grupo Tlon (separados por vírgula)")
    .option("--dm-allowlist <list>", "Allowlist de DM Tlon (ships separados por vírgula)")
    .option("--auto-discover-channels", "Descobrir automaticamente canais de grupo Tlon")
    .option("--no-auto-discover-channels", "Desabilitar autodescoberta Tlon")
    .option("--use-env", "Usar token de env (apenas conta padrão)", false)
    .action(async (opts, command) => {
      await runChannelsCommand(async () => {
        const hasFlags = hasExplicitOptions(command, optionNamesAdd);
        await channelsAddCommand(opts, defaultRuntime, { hasFlags });
      });
    });

  channels
    .command("remove")
    .description("Desabilitar ou deletar uma conta de canal")
    .option("--channel <name>", `Canal (${channelNames})`)
    .option("--account <id>", "Id da conta (padrão quando omitido)")
    .option("--delete", "Deletar entradas de config (sem prompt)", false)
    .action(async (opts, command) => {
      await runChannelsCommand(async () => {
        const hasFlags = hasExplicitOptions(command, optionNamesRemove);
        await channelsRemoveCommand(opts, defaultRuntime, { hasFlags });
      });
    });

  channels
    .command("login")
    .description("Vincular uma conta de canal (se suportado)")
    .option("--channel <channel>", "Alias do canal (padrão: whatsapp)")
    .option("--account <id>", "Id da conta (accountId)")
    .option("--verbose", "Logs de conexão verbosos", false)
    .action(async (opts) => {
      await runChannelsCommandWithDanger(async () => {
        await runChannelLogin(
          {
            channel: opts.channel as string | undefined,
            account: opts.account as string | undefined,
            verbose: Boolean(opts.verbose),
          },
          defaultRuntime,
        );
      }, "Falha no login do canal");
    });

  channels
    .command("logout")
    .description("Sair de uma sessão de canal (se suportado)")
    .option("--channel <channel>", "Alias do canal (padrão: whatsapp)")
    .option("--account <id>", "Id da conta (accountId)")
    .action(async (opts) => {
      await runChannelsCommandWithDanger(async () => {
        await runChannelLogout(
          {
            channel: opts.channel as string | undefined,
            account: opts.account as string | undefined,
          },
          defaultRuntime,
        );
      }, "Falha no logout do canal");
    });
}
