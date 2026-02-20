import type { Command } from "commander";

import { danger } from "../globals.js";
import {
  DEFAULT_GMAIL_LABEL,
  DEFAULT_GMAIL_MAX_BYTES,
  DEFAULT_GMAIL_RENEW_MINUTES,
  DEFAULT_GMAIL_SERVE_BIND,
  DEFAULT_GMAIL_SERVE_PATH,
  DEFAULT_GMAIL_SERVE_PORT,
  DEFAULT_GMAIL_SUBSCRIPTION,
  DEFAULT_GMAIL_TOPIC,
} from "../hooks/gmail.js";
import {
  type GmailRunOptions,
  type GmailSetupOptions,
  runGmailService,
  runGmailSetup,
} from "../hooks/gmail-ops.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";

export function registerWebhooksCli(program: Command) {
  const webhooks = program
    .command("webhooks")
    .description("Ajudantes e integrações de Webhook")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/webhooks", "docs.zero.local/cli/webhooks")}\n`,
    );

  const gmail = webhooks.command("gmail").description("Hooks do Gmail Pub/Sub (via gogcli)");

  gmail
    .command("setup")
    .description("Configurar watch do Gmail + Pub/Sub + hooks do ZERO")
    .requiredOption("--account <email>", "Conta do Gmail para monitorar")
    .option("--project <id>", "ID do projeto GCP (dono do cliente OAuth)")
    .option("--topic <name>", "Nome do tópico Pub/Sub", DEFAULT_GMAIL_TOPIC)
    .option("--subscription <name>", "Nome da assinatura Pub/Sub", DEFAULT_GMAIL_SUBSCRIPTION)
    .option("--label <label>", "Label do Gmail para monitorar", DEFAULT_GMAIL_LABEL)
    .option("--hook-url <url>", "URL do hook do ZERO")
    .option("--hook-token <token>", "Token do hook do ZERO")
    .option("--push-token <token>", "Token de push para gog watch serve")
    .option("--bind <host>", "Endereço de bind para gog watch serve", DEFAULT_GMAIL_SERVE_BIND)
    .option("--port <port>", "Porta para gog watch serve", String(DEFAULT_GMAIL_SERVE_PORT))
    .option("--path <path>", "Caminho para gog watch serve", DEFAULT_GMAIL_SERVE_PATH)
    .option("--include-body", "Incluir trechos do corpo do e-mail", true)
    .option(
      "--max-bytes <n>",
      "Máximo de bytes para trechos do corpo",
      String(DEFAULT_GMAIL_MAX_BYTES),
    )
    .option(
      "--renew-minutes <n>",
      "Renovar watch a cada N minutos",
      String(DEFAULT_GMAIL_RENEW_MINUTES),
    )
    .option("--tailscale <mode>", "Expor push endpoint via tailscale (funnel|serve|off)", "funnel")
    .option("--tailscale-path <path>", "Caminho para tailscale serve/funnel")
    .option(
      "--tailscale-target <target>",
      "Alvo do tailscale serve/funnel (porta, host:porta, ou URL)",
    )
    .option("--push-endpoint <url>", "Endpoint de push do Pub/Sub explícito")
    .option("--json", "Saída em JSON", false)
    .action(async (opts) => {
      try {
        const parsed = parseGmailSetupOptions(opts);
        await runGmailSetup(parsed);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  gmail
    .command("run")
    .description("Executar gog watch serve + loop de auto-renovação")
    .option("--account <email>", "Conta do Gmail para monitorar")
    .option("--topic <topic>", "Caminho do tópico Pub/Sub (projects/.../topics/..)")
    .option("--subscription <name>", "Nome da assinatura Pub/Sub")
    .option("--label <label>", "Label do Gmail para monitorar")
    .option("--hook-url <url>", "URL do hook do ZERO")
    .option("--hook-token <token>", "Token do hook do ZERO")
    .option("--push-token <token>", "Token de push para gog watch serve")
    .option("--bind <host>", "Endereço de bind para gog watch serve")
    .option("--port <port>", "Porta para gog watch serve")
    .option("--path <path>", "Caminho para gog watch serve")
    .option("--include-body", "Incluir trechos do corpo do e-mail")
    .option("--max-bytes <n>", "Máximo de bytes para trechos do corpo")
    .option("--renew-minutes <n>", "Renovar watch a cada N minutos")
    .option("--tailscale <mode>", "Expor push endpoint via tailscale (funnel|serve|off)")
    .option("--tailscale-path <path>", "Caminho para tailscale serve/funnel")
    .option(
      "--tailscale-target <target>",
      "Alvo do tailscale serve/funnel (porta, host:porta, ou URL)",
    )
    .action(async (opts) => {
      try {
        const parsed = parseGmailRunOptions(opts);
        await runGmailService(parsed);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });
}

function parseGmailSetupOptions(raw: Record<string, unknown>): GmailSetupOptions {
  const accountRaw = raw.account;
  const account = typeof accountRaw === "string" ? accountRaw.trim() : "";
  if (!account) throw new Error("--account é obrigatório");
  return {
    account,
    project: stringOption(raw.project),
    topic: stringOption(raw.topic),
    subscription: stringOption(raw.subscription),
    label: stringOption(raw.label),
    hookUrl: stringOption(raw.hookUrl),
    hookToken: stringOption(raw.hookToken),
    pushToken: stringOption(raw.pushToken),
    bind: stringOption(raw.bind),
    port: numberOption(raw.port),
    path: stringOption(raw.path),
    includeBody: booleanOption(raw.includeBody),
    maxBytes: numberOption(raw.maxBytes),
    renewEveryMinutes: numberOption(raw.renewMinutes),
    tailscale: stringOption(raw.tailscale) as GmailSetupOptions["tailscale"],
    tailscalePath: stringOption(raw.tailscalePath),
    tailscaleTarget: stringOption(raw.tailscaleTarget),
    pushEndpoint: stringOption(raw.pushEndpoint),
    json: Boolean(raw.json),
  };
}

function parseGmailRunOptions(raw: Record<string, unknown>): GmailRunOptions {
  return {
    account: stringOption(raw.account),
    topic: stringOption(raw.topic),
    subscription: stringOption(raw.subscription),
    label: stringOption(raw.label),
    hookUrl: stringOption(raw.hookUrl),
    hookToken: stringOption(raw.hookToken),
    pushToken: stringOption(raw.pushToken),
    bind: stringOption(raw.bind),
    port: numberOption(raw.port),
    path: stringOption(raw.path),
    includeBody: booleanOption(raw.includeBody),
    maxBytes: numberOption(raw.maxBytes),
    renewEveryMinutes: numberOption(raw.renewMinutes),
    tailscale: stringOption(raw.tailscale) as GmailRunOptions["tailscale"],
    tailscalePath: stringOption(raw.tailscalePath),
    tailscaleTarget: stringOption(raw.tailscaleTarget),
  };
}

function stringOption(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function numberOption(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}

function booleanOption(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  return Boolean(value);
}
