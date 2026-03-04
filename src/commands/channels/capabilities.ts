
import { getChannelPlugin, listChannelPlugins } from "../../channels/plugins/index.js";
import { danger } from "../../globals.js";
import { defaultRuntime, type RuntimeEnv } from "../../runtime.js";
import { theme } from "../../terminal/theme.js";
import { formatChannelAccountLabel, requireValidConfig } from "./shared.js";
import {
  type ChannelsCapabilitiesOptions,
  type ChannelCapabilitiesReport,
} from "./capabilities/types.js";
import {
  normalizeTimeout,
  resolveChannelReports,
} from "./capabilities/reports.js";
import {
  formatSupport,
  formatProbeLines,
} from "./capabilities/view.js";

export type { ChannelsCapabilitiesOptions };

export async function channelsCapabilitiesCommand(
  opts: ChannelsCapabilitiesOptions,
  runtime: RuntimeEnv = defaultRuntime,
) {
  const cfg = await requireValidConfig(runtime);
  if (!cfg) return;
  const timeoutMs = normalizeTimeout(opts.timeout, 10_000);
  const rawChannel = typeof opts.channel === "string" ? opts.channel.trim().toLowerCase() : "";
  const rawTarget = typeof opts.target === "string" ? opts.target.trim() : "";

  if (opts.account && (!rawChannel || rawChannel === "all")) {
    runtime.error(danger("--account requer um --channel específico."));
    runtime.exit(1);
    return;
  }
  if (rawTarget && rawChannel !== "discord") {
    runtime.error(danger("--target requer --channel discord."));
    runtime.exit(1);
    return;
  }

  const plugins = listChannelPlugins();
  const selected = !rawChannel || rawChannel === "all"
    ? plugins
    : (() => {
      const plugin = getChannelPlugin(rawChannel);
      return plugin ? [plugin] : null;
    })();

  if (!selected || selected.length === 0) {
    runtime.error(danger(`Canal desconhecido "${rawChannel}".`));
    runtime.exit(1);
    return;
  }

  const reports: ChannelCapabilitiesReport[] = [];
  for (const plugin of selected) {
    const accountOverride = opts.account?.trim() || undefined;
    reports.push(
      ...(await resolveChannelReports({
        plugin, cfg, timeoutMs, accountOverride,
        target: rawTarget && plugin.id === "discord" ? rawTarget : undefined,
      })),
    );
  }

  if (opts.json) {
    runtime.log(JSON.stringify({ channels: reports }, null, 2));
    return;
  }

  const lines: string[] = [];
  for (const report of reports) {
    const label = formatChannelAccountLabel({
      channel: report.channel, accountId: report.accountId, name: report.accountName,
      channelStyle: theme.accent, accountStyle: theme.heading,
    });
    lines.push(theme.heading(label));
    lines.push(`Suporte: ${formatSupport(report.support)}`);
    if (report.actions && report.actions.length > 0) lines.push(`Ações: ${report.actions.join(", ")}`);
    if (report.configured === false || report.enabled === false) {
      lines.push(`Status: ${report.configured === false ? "não configurado" : "configurado"}, ${report.enabled === false ? "desativado" : "ativado"}`);
    }
    const probeLines = formatProbeLines(report.channel, report.probe);
    if (probeLines.length > 0) lines.push(...probeLines);
    else if (report.configured && report.enabled) lines.push(theme.muted("Sondagem: indisponível"));

    if (report.channel === "slack" && report.slackScopes) {
      for (const entry of report.slackScopes) {
        const source = entry.result.source ? ` (${entry.result.source})` : "";
        const lbl = entry.tokenType === "user" ? "Escopos de usuário" : "Escopos de bot";
        if (entry.result.ok && entry.result.scopes?.length) lines.push(`${lbl}${source}: ${entry.result.scopes.join(", ")}`);
        else if (entry.result.error) lines.push(`${lbl}: ${theme.error(entry.result.error)}`);
      }
    }
    if (report.channel === "discord" && report.channelPermissions) {
      const perms = report.channelPermissions;
      if (perms.error) lines.push(`Permissões: ${theme.error(perms.error)}`);
      else {
        lines.push(`Permissões${perms.channelId ? ` (${perms.channelId})` : ""}: ${perms.permissions?.length ? perms.permissions.join(", ") : "nenhuma"}`);
        if (perms.missingRequired && perms.missingRequired.length > 0) lines.push(`${theme.warn("Obrigatórios ausentes:")} ${perms.missingRequired.join(", ")}`);
        else lines.push(theme.success("Obrigatórios ausentes: nenhum"));
      }
    } else if (report.channel === "discord" && rawTarget && !report.channelPermissions) {
      lines.push(theme.muted("Permissões: ignoradas (sem destino)."));
    }
    lines.push("");
  }
  runtime.log(lines.join("\n").trimEnd());
}
