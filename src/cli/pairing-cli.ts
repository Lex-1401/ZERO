import type { Command } from "commander";
import { listPairingChannels, notifyPairingApproved } from "../channels/plugins/pairing.js";
import { normalizeChannelId } from "../channels/plugins/index.js";
import { loadConfig } from "../config/config.js";
import { resolvePairingIdLabel } from "../pairing/pairing-labels.js";
import {
  approveChannelPairingCode,
  listChannelPairingRequests,
  type PairingChannel,
} from "../pairing/pairing-store.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { renderTable } from "../terminal/table.js";
import { theme } from "../terminal/theme.js";
import { formatCliCommand } from "./command-format.js";

/** Parse channel, allowing extension channels not in core registry. */
function parseChannel(raw: unknown, channels: PairingChannel[]): PairingChannel {
  const value = (
    typeof raw === "string"
      ? raw
      : typeof raw === "number" || typeof raw === "boolean"
        ? String(raw)
        : ""
  )
    .trim()
    .toLowerCase();
  if (!value) throw new Error("Canal obrigatório");

  const normalized = normalizeChannelId(value);
  if (normalized) {
    if (!channels.includes(normalized as PairingChannel)) {
      throw new Error(`O canal ${normalized} não suporta pareamento`);
    }
    return normalized as PairingChannel;
  }

  // Allow extension channels: validate format but don't require registry
  if (/^[a-z][a-z0-9_-]{0,63}$/.test(value)) return value as PairingChannel;
  throw new Error(`Canal inválido: ${value}`);
}

async function notifyApproved(channel: PairingChannel, id: string) {
  const cfg = loadConfig();
  await notifyPairingApproved({ channelId: channel, id, cfg });
}

export function registerPairingCli(program: Command) {
  const channels = listPairingChannels();
  const pairing = program
    .command("pairing")
    .description("Pareamento DM seguro (aprovar solicitações de entrada)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/pairing", "docs.zero.local/cli/pairing")}\n`,
    );

  pairing
    .command("list")
    .description("Listar solicitações de pareamento pendentes")
    .option("--channel <channel>", `Canal (${channels.join(", ")})`)
    .argument("[channel]", `Canal (${channels.join(", ")})`)
    .option("--json", "Imprimir JSON", false)
    .action(async (channelArg, opts) => {
      const channelRaw = opts.channel ?? channelArg;
      if (!channelRaw) {
        throw new Error(
          `Canal obrigatório. Use --channel <channel> ou passe como primeiro argumento (esperado um de: ${channels.join(", ")})`,
        );
      }
      const channel = parseChannel(channelRaw, channels);
      const requests = await listChannelPairingRequests(channel);
      if (opts.json) {
        defaultRuntime.log(JSON.stringify({ channel, requests }, null, 2));
        return;
      }
      if (requests.length === 0) {
        defaultRuntime.log(theme.muted(`Nenhuma solicitação de pareamento ${channel} pendente.`));
        return;
      }
      const idLabel = resolvePairingIdLabel(channel);
      const tableWidth = Math.max(60, (process.stdout.columns ?? 120) - 1);
      defaultRuntime.log(
        `${theme.heading("Solicitações de pareamento")} ${theme.muted(`(${requests.length})`)}`,
      );
      defaultRuntime.log(
        renderTable({
          width: tableWidth,
          columns: [
            { key: "Code", header: "Código", minWidth: 10 },
            { key: "ID", header: idLabel, minWidth: 12, flex: true },
            { key: "Meta", header: "Meta", minWidth: 8, flex: true },
            { key: "Requested", header: "Solicitado", minWidth: 12 },
          ],
          rows: requests.map((r) => ({
            Code: r.code,
            ID: r.id,
            Meta: r.meta ? JSON.stringify(r.meta) : "",
            Requested: r.createdAt,
          })),
        }).trimEnd(),
      );
    });

  pairing
    .command("approve")
    .description("Aprovar um código de pareamento e permitir esse remetente")
    .option("--channel <channel>", `Canal (${channels.join(", ")})`)
    .argument("<codeOrChannel>", "Código de pareamento (ou canal quando usar 2 args)")
    .argument("[code]", "Código de pareamento (quando o canal é passado como 1º arg)")
    .option("--notify", "Notificar o solicitante no mesmo canal", false)
    .action(async (codeOrChannel, code, opts) => {
      const channelRaw = opts.channel ?? codeOrChannel;
      const resolvedCode = opts.channel ? codeOrChannel : code;
      if (!opts.channel && !code) {
        throw new Error(
          `Uso: ${formatCliCommand("zero pairing approve <channel> <code>")} (ou: ${formatCliCommand("zero pairing approve --channel <channel> <code>")})`,
        );
      }
      if (opts.channel && code != null) {
        throw new Error(
          `Muitos argumentos. Use: ${formatCliCommand("zero pairing approve --channel <channel> <code>")}`,
        );
      }
      const channel = parseChannel(channelRaw, channels);
      const approved = await approveChannelPairingCode({
        channel,
        code: String(resolvedCode),
      });
      if (!approved) {
        throw new Error(
          `Nenhuma solicitação de pareamento pendente encontrada para o código: ${String(resolvedCode)}`,
        );
      }

      defaultRuntime.log(
        `${theme.success("Aprovado")} remetente ${theme.muted(channel)} ${theme.command(approved.id)}.`,
      );

      if (!opts.notify) return;
      await notifyApproved(channel, approved.id).catch((err) => {
        defaultRuntime.log(theme.warn(`Falha ao notificar o solicitante: ${String(err)}`));
      });
    });
}
