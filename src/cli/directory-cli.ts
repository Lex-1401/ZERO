import type { Command } from "commander";

import { resolveChannelDefaultAccountId } from "../channels/plugins/helpers.js";
import { getChannelPlugin } from "../channels/plugins/index.js";
import { loadConfig } from "../config/config.js";
import { danger } from "../globals.js";
import { resolveMessageChannelSelection } from "../infra/outbound/channel-selection.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { renderTable } from "../terminal/table.js";

function parseLimit(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value <= 0) return null;
    return Math.floor(value);
  }
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function buildRows(entries: Array<{ id: string; name?: string | undefined }>) {
  return entries.map((entry) => ({
    ID: entry.id,
    Nome: entry.name?.trim() ?? "",
  }));
}

export function registerDirectoryCli(program: Command) {
  const directory = program
    .command("directory")
    .description("Consultas de diretório (próprio, contatos, grupos) para canais que suportam")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink(
          "/cli/directory",
          "docs.zero.local/cli/directory",
        )}\n`,
    )
    .action(() => {
      directory.help({ error: true });
    });

  const withChannel = (cmd: Command) =>
    cmd
      .option("--channel <name>", "Canal (automático quando apenas um está configurado)")
      .option("--account <id>", "ID da conta (accountId)")
      .option("--json", "Saída em JSON", false);

  const resolve = async (opts: { channel?: string; account?: string }) => {
    const cfg = loadConfig();
    const selection = await resolveMessageChannelSelection({
      cfg,
      channel: opts.channel ?? null,
    });
    const channelId = selection.channel;
    const plugin = getChannelPlugin(channelId);
    if (!plugin) throw new Error(`Canal não suportado: ${String(channelId)}`);
    const accountId = opts.account?.trim() || resolveChannelDefaultAccountId({ plugin, cfg });
    return { cfg, channelId, accountId, plugin };
  };

  withChannel(directory.command("self").description("Mostrar o usuário da conta atual")).action(
    async (opts) => {
      try {
        const { cfg, channelId, accountId, plugin } = await resolve({
          channel: opts.channel as string | undefined,
          account: opts.account as string | undefined,
        });
        const fn = plugin.directory?.self;
        if (!fn) throw new Error(`O canal ${channelId} não suporta diretório self`);
        const result = await fn({ cfg, accountId, runtime: defaultRuntime });
        if (opts.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        if (!result) {
          defaultRuntime.log(theme.muted("Não disponível."));
          return;
        }
        const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
        defaultRuntime.log(`${theme.heading("Próprio")}`);
        defaultRuntime.log(
          renderTable({
            width: tableWidth,
            columns: [
              { key: "ID", header: "ID", minWidth: 16, flex: true },
              { key: "Nome", header: "Nome", minWidth: 18, flex: true },
            ],
            rows: buildRows([result]),
          }).trimEnd(),
        );
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    },
  );

  const peers = directory.command("peers").description("Diretório de contatos (contatos/usuários)");
  withChannel(peers.command("list").description("Listar contatos"))
    .option("--query <text>", "Consulta de busca opcional")
    .option("--limit <n>", "Limite de resultados")
    .action(async (opts) => {
      try {
        const { cfg, channelId, accountId, plugin } = await resolve({
          channel: opts.channel as string | undefined,
          account: opts.account as string | undefined,
        });
        const fn = plugin.directory?.listPeers;
        if (!fn) throw new Error(`O canal ${channelId} não suporta diretório de contatos`);
        const result = await fn({
          cfg,
          accountId,
          query: (opts.query as string | undefined) ?? null,
          limit: parseLimit(opts.limit),
          runtime: defaultRuntime,
        });
        if (opts.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        if (result.length === 0) {
          defaultRuntime.log(theme.muted("Nenhum contato encontrado."));
          return;
        }
        const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
        defaultRuntime.log(`${theme.heading("Contatos")} ${theme.muted(`(${result.length})`)}`);
        defaultRuntime.log(
          renderTable({
            width: tableWidth,
            columns: [
              { key: "ID", header: "ID", minWidth: 16, flex: true },
              { key: "Nome", header: "Nome", minWidth: 18, flex: true },
            ],
            rows: buildRows(result),
          }).trimEnd(),
        );
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  const groups = directory.command("groups").description("Diretório de grupos");
  withChannel(groups.command("list").description("Listar grupos"))
    .option("--query <text>", "Consulta de busca opcional")
    .option("--limit <n>", "Limite de resultados")
    .action(async (opts) => {
      try {
        const { cfg, channelId, accountId, plugin } = await resolve({
          channel: opts.channel as string | undefined,
          account: opts.account as string | undefined,
        });
        const fn = plugin.directory?.listGroups;
        if (!fn) throw new Error(`O canal ${channelId} não suporta diretório de grupos`);
        const result = await fn({
          cfg,
          accountId,
          query: (opts.query as string | undefined) ?? null,
          limit: parseLimit(opts.limit),
          runtime: defaultRuntime,
        });
        if (opts.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        if (result.length === 0) {
          defaultRuntime.log(theme.muted("Nenhum grupo encontrado."));
          return;
        }
        const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
        defaultRuntime.log(`${theme.heading("Grupos")} ${theme.muted(`(${result.length})`)}`);
        defaultRuntime.log(
          renderTable({
            width: tableWidth,
            columns: [
              { key: "ID", header: "ID", minWidth: 16, flex: true },
              { key: "Nome", header: "Nome", minWidth: 18, flex: true },
            ],
            rows: buildRows(result),
          }).trimEnd(),
        );
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  withChannel(
    groups
      .command("members")
      .description("Listar membros do grupo")
      .requiredOption("--group-id <id>", "ID do grupo"),
  )
    .option("--limit <n>", "Limite de resultados")
    .action(async (opts) => {
      try {
        const { cfg, channelId, accountId, plugin } = await resolve({
          channel: opts.channel as string | undefined,
          account: opts.account as string | undefined,
        });
        const fn = plugin.directory?.listGroupMembers;
        if (!fn) throw new Error(`O canal ${channelId} não suporta listagem de membros de grupo`);
        const groupId = String(opts.groupId ?? "").trim();
        if (!groupId) throw new Error("ID do grupo ausente (--group-id)");
        const result = await fn({
          cfg,
          accountId,
          groupId,
          limit: parseLimit(opts.limit),
          runtime: defaultRuntime,
        });
        if (opts.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        if (result.length === 0) {
          defaultRuntime.log(theme.muted("Nenhum membro de grupo encontrado."));
          return;
        }
        const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
        defaultRuntime.log(
          `${theme.heading("Membros do Grupo")} ${theme.muted(`(${result.length})`)}`,
        );
        defaultRuntime.log(
          renderTable({
            width: tableWidth,
            columns: [
              { key: "ID", header: "ID", minWidth: 16, flex: true },
              { key: "Nome", header: "Nome", minWidth: 18, flex: true },
            ],
            rows: buildRows(result),
          }).trimEnd(),
        );
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });
}
