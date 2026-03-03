import { Type } from "@sinclair/typebox";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";
import { callGatewayTool, type GatewayCallOptions } from "./gateway.js";
import { resolveSessionAgentId } from "../agent-scope.js";
import { loadConfig } from "../../config/config.js";

const MonitoringToolSchema = Type.Object({
  action: Type.Enum({
    watch_keyword: "watch_keyword",
    watch_competitor: "watch_competitor",
    watch_youtube: "watch_youtube",
    list: "list",
    remove: "remove",
  } as const),
  keyword: Type.Optional(Type.String({ description: "Termo ou palavra-chave para monitorar." })),
  target: Type.Optional(Type.String({ description: "URL do canal ou nome do concorrente." })),
  interval: Type.Optional(
    Type.String({
      description:
        "Intervalo no formato cron (ex: '0 */4 * * *' para cada 4 horas). Padrão: diariamente.",
      default: "0 9 * * *",
    }),
  ),
  jobId: Type.Optional(Type.String({ description: "ID do monitoramento para remover." })),
});

export function createMonitoringTool(opts: { agentSessionKey: string }): AnyAgentTool {
  return {
    label: "Proactive Monitor",
    name: "proactive_monitor",
    description:
      "Configura monitoramento proativo de termos, concorrentes ou crescimento de vídeos. O sistema acordará você quando encontrar novidades.",
    parameters: MonitoringToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const action = readStringParam(params, "action", { required: true });
      const cfg = loadConfig();
      const gatewayOpts: GatewayCallOptions = {};
      const agentId = resolveSessionAgentId({ sessionKey: opts.agentSessionKey, config: cfg });

      if (action === "list") {
        const jobs = (await callGatewayTool("cron.list", gatewayOpts, {
          includeDisabled: false,
        })) as any[];
        const monitors = jobs.filter((j: any) => j.payload?.text?.includes("MONITOR:"));
        return jsonResult(monitors);
      }

      if (action === "remove") {
        const jobId = readStringParam(params, "jobId", { required: true });
        return jsonResult(await callGatewayTool("cron.remove", gatewayOpts, { id: jobId }));
      }

      const interval = readStringParam(params, "interval") || "0 9 * * *";
      let monitorText = "";

      if (action === "watch_keyword") {
        const keyword = readStringParam(params, "keyword", { required: true });
        monitorText = `MONITOR: Pesquise na web por novidades sobre "${keyword}" nas últimas 24h e me alerte se houver algo relevante.`;
      } else if (action === "watch_competitor") {
        const target = readStringParam(params, "target", { required: true });
        monitorText = `MONITOR: Verifique as últimas atualizações de "${target}" e compare com nossa estratégia atual.`;
      } else if (action === "watch_youtube") {
        const target = readStringParam(params, "target", { required: true });
        monitorText = `MONITOR: Analise o canal/vídeo "${target}" no YouTube. Verifique se há sinais de crescimento explosivo (views/comentários em curto prazo).`;
      }

      const job = {
        agentId,
        schedule: {
          kind: "cron",
          cron: interval,
        },
        payload: {
          kind: "systemEvent",
          text: monitorText,
        },
      };

      return jsonResult(await callGatewayTool("cron.add", gatewayOpts, job));
    },
  };
}
