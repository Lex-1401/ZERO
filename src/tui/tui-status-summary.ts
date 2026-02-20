import { formatAge } from "../infra/channel-summary.js";
import { formatTokenCount } from "../utils/usage-format.js";
import { formatContextUsageLine } from "./tui-formatters.js";
import type { GatewayStatusSummary } from "./tui-types.js";

export function formatStatusSummary(summary: GatewayStatusSummary) {
  const lines: string[] = [];
  lines.push("Status do Gateway");

  if (!summary.linkChannel) {
    lines.push("Canal de link: desconhecido");
  } else {
    const linkLabel = summary.linkChannel.label ?? "Canal de link";
    const linked = summary.linkChannel.linked === true;
    const authAge =
      linked && typeof summary.linkChannel.authAgeMs === "number"
        ? ` (atualizado há ${formatAge(summary.linkChannel.authAgeMs)})`
        : "";
    lines.push(`${linkLabel}: ${linked ? "vinculado" : "não vinculado"}${authAge}`);
  }

  const providerSummary = Array.isArray(summary.providerSummary) ? summary.providerSummary : [];
  if (providerSummary.length > 0) {
    lines.push("");
    lines.push("Sistema:");
    for (const line of providerSummary) {
      lines.push(`  ${line}`);
    }
  }

  const heartbeatAgents = summary.heartbeat?.agents ?? [];
  if (heartbeatAgents.length > 0) {
    const heartbeatParts = heartbeatAgents.map((agent) => {
      const agentId = agent.agentId ?? "unknown";
      if (!agent.enabled || !agent.everyMs) return `desativado (${agentId})`;
      return `${agent.every ?? "desconhecido"} (${agentId})`;
    });
    lines.push("");
    lines.push(`Heartbeat: ${heartbeatParts.join(", ")}`);
  }

  const sessionPaths = summary.sessions?.paths ?? [];
  if (sessionPaths.length === 1) {
    lines.push(`Armazenamento de sessões: ${sessionPaths[0]}`);
  } else if (sessionPaths.length > 1) {
    lines.push(`Armazenamentos de sessões: ${sessionPaths.length}`);
  }

  const defaults = summary.sessions?.defaults;
  const defaultModel = defaults?.model ?? "desconhecido";
  const defaultCtx =
    typeof defaults?.contextTokens === "number"
      ? ` (${formatTokenCount(defaults.contextTokens)} ctx)`
      : "";
  lines.push(`Modelo padrão: ${defaultModel}${defaultCtx}`);

  const sessionCount = summary.sessions?.count ?? 0;
  lines.push(`Sessões ativas: ${sessionCount}`);

  const recent = Array.isArray(summary.sessions?.recent) ? summary.sessions?.recent : [];
  if (recent.length > 0) {
    lines.push("Sessões recentes:");
    for (const entry of recent) {
      const ageLabel = typeof entry.age === "number" ? formatAge(entry.age) : "sem atividade";
      const model = entry.model ?? "desconhecido";
      const usage = formatContextUsageLine({
        total: entry.totalTokens ?? null,
        context: entry.contextTokens ?? null,
        remaining: entry.remainingTokens ?? null,
        percent: entry.percentUsed ?? null,
      });
      const flags = entry.flags?.length ? ` | sinalizadores: ${entry.flags.join(", ")}` : "";
      lines.push(
        `- ${entry.key}${entry.kind ? ` [${entry.kind}]` : ""} | ${ageLabel} | modelo ${model} | ${usage}${flags}`,
      );
    }
  }

  const queued = Array.isArray(summary.queuedSystemEvents) ? summary.queuedSystemEvents : [];
  if (queued.length > 0) {
    const preview = queued.slice(0, 3).join(" | ");
    lines.push(`Eventos de sistema na fila (${queued.length}): ${preview}`);
  }

  return lines;
}
