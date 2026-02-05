import type { Command } from "commander";
import { gatewayStatusCommand } from "../../commands/gateway-status.js";
import { formatHealthChannelLines, type HealthSummary } from "../../commands/health.js";
import { discoverGatewayBeacons } from "../../infra/bonjour-discovery.js";
import type { CostUsageSummary } from "../../infra/session-cost-usage.js";
import { WIDE_AREA_DISCOVERY_DOMAIN } from "../../infra/widearea-dns.js";
import { defaultRuntime } from "../../runtime.js";
import { formatDocsLink } from "../../terminal/links.js";
import { colorize, isRich, theme } from "../../terminal/theme.js";
import { formatTokenCount, formatUsd } from "../../utils/usage-format.js";
import { withProgress } from "../progress.js";
import { runCommandWithRuntime } from "../cli-utils.js";
import {
  runDaemonInstall,
  runDaemonRestart,
  runDaemonStart,
  runDaemonStatus,
  runDaemonStop,
  runDaemonUninstall,
} from "../daemon-cli.js";
import { callGatewayCli, gatewayCallOpts } from "./call.js";
import type { GatewayDiscoverOpts } from "./discover.js";
import {
  dedupeBeacons,
  parseDiscoverTimeoutMs,
  pickBeaconHost,
  pickGatewayPort,
  renderBeaconLines,
} from "./discover.js";
import { addGatewayRunCommand } from "./run.js";

function styleHealthChannelLine(line: string, rich: boolean): string {
  if (!rich) return line;
  const colon = line.indexOf(":");
  if (colon === -1) return line;

  const label = line.slice(0, colon + 1);
  const detail = line.slice(colon + 1).trimStart();
  const normalized = detail.toLowerCase();

  const applyPrefix = (prefix: string, color: (value: string) => string) =>
    `${label} ${color(detail.slice(0, prefix.length))}${detail.slice(prefix.length)}`;

  if (normalized.startsWith("failed")) return applyPrefix("failed", theme.error);
  if (normalized.startsWith("ok")) return applyPrefix("ok", theme.success);
  if (normalized.startsWith("linked")) return applyPrefix("linked", theme.success);
  if (normalized.startsWith("configured")) return applyPrefix("configured", theme.success);
  if (normalized.startsWith("not linked")) return applyPrefix("not linked", theme.warn);
  if (normalized.startsWith("not configured")) return applyPrefix("not configured", theme.muted);
  if (normalized.startsWith("unknown")) return applyPrefix("unknown", theme.warn);

  return line;
}

function runGatewayCommand(action: () => Promise<void>, label?: string) {
  return runCommandWithRuntime(defaultRuntime, action, (err) => {
    const message = String(err);
    defaultRuntime.error(label ? `${label}: ${message}` : message);
    defaultRuntime.exit(1);
  });
}

function parseDaysOption(raw: unknown, fallback = 30): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(1, Math.floor(raw));
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return Math.max(1, Math.floor(parsed));
  }
  return fallback;
}

function renderCostUsageSummary(summary: CostUsageSummary, days: number, rich: boolean): string[] {
  const totalCost = formatUsd(summary.totals.totalCost) ?? "$0.00";
  const totalTokens = formatTokenCount(summary.totals.totalTokens) ?? "0";
  const lines = [
    colorize(rich, theme.heading, `Custo de uso (${days} dias)`),
    `${colorize(rich, theme.muted, "Total:")} ${totalCost} · ${totalTokens} tokens`,
  ];

  if (summary.totals.missingCostEntries > 0) {
    lines.push(
      `${colorize(rich, theme.muted, "Entradas perdidas:")} ${summary.totals.missingCostEntries}`,
    );
  }

  const latest = summary.daily.at(-1);
  if (latest) {
    const latestCost = formatUsd(latest.totalCost) ?? "$0.00";
    const latestTokens = formatTokenCount(latest.totalTokens) ?? "0";
    lines.push(
      `${colorize(rich, theme.muted, "Último dia:")} ${latest.date} · ${latestCost} · ${latestTokens} tokens`,
    );
  }

  return lines;
}

export function registerGatewayCli(program: Command) {
  const gateway = addGatewayRunCommand(
    program
      .command("gateway")
      .description("Executar o Gateway WebSocket")
      .addHelpText(
        "after",
        () =>
          `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/gateway", "docs.zero.local/cli/gateway")}\n`,
      ),
  );

  addGatewayRunCommand(
    gateway.command("run").description("Executar o Gateway WebSocket (primeiro plano)"),
  );

  gateway
    .command("status")
    .description("Mostrar status do serviço gateway + sondar o Gateway")
    .option("--url <url>", "URL WebSocket do Gateway (padrão a config/remote/local)")
    .option("--token <token>", "Token do Gateway (se necessário)")
    .option("--password <password>", "Senha do Gateway (auth senha)")
    .option("--timeout <ms>", "Timeout em ms", "10000")
    .option("--no-probe", "Pular sonda RPC")
    .option("--deep", "Escanear serviços de nível de sistema", false)
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runDaemonStatus({
        rpc: opts,
        probe: Boolean(opts.probe),
        deep: Boolean(opts.deep),
        json: Boolean(opts.json),
      });
    });

  gateway
    .command("install")
    .description("Instalar o serviço Gateway (launchd/systemd/schtasks)")
    .option("--port <port>", "Porta do Gateway")
    .option("--runtime <runtime>", "Runtime do Daemon (node|bun). Padrão: node")
    .option("--token <token>", "Token do Gateway (auth por token)")
    .option("--force", "Reinstalar/sobrescrever se já instalado", false)
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runDaemonInstall(opts);
    });

  gateway
    .command("uninstall")
    .description("Desinstalar o serviço Gateway (launchd/systemd/schtasks)")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runDaemonUninstall(opts);
    });

  gateway
    .command("start")
    .description("Iniciar o serviço Gateway (launchd/systemd/schtasks)")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runDaemonStart(opts);
    });

  gateway
    .command("stop")
    .description("Parar o serviço Gateway (launchd/systemd/schtasks)")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runDaemonStop(opts);
    });

  gateway
    .command("restart")
    .description("Reiniciar o serviço Gateway (launchd/systemd/schtasks)")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runDaemonRestart(opts);
    });

  gatewayCallOpts(
    gateway
      .command("call")
      .description("Chamar um método do Gateway")
      .argument("<method>", "Nome do método (health/status/system-presence/cron.*)")
      .option("--params <json>", "String de objeto JSON para parâmetros", "{}")
      .action(async (method, opts) => {
        await runGatewayCommand(async () => {
          const params = JSON.parse(String(opts.params ?? "{}"));
          const result = await callGatewayCli(method, opts, params);
          if (opts.json) {
            defaultRuntime.log(JSON.stringify(result, null, 2));
            return;
          }
          const rich = isRich();
          defaultRuntime.log(
            `${colorize(rich, theme.heading, "Chamada Gateway")}: ${colorize(rich, theme.muted, String(method))}`,
          );
          defaultRuntime.log(JSON.stringify(result, null, 2));
        }, "Falha na chamada do Gateway");
      }),
  );

  gatewayCallOpts(
    gateway
      .command("usage-cost")
      .description("Buscar resumo de custo de uso dos logs de sessão")
      .option("--days <days>", "Número de dias para incluir", "30")
      .action(async (opts) => {
        await runGatewayCommand(async () => {
          const days = parseDaysOption(opts.days);
          const result = await callGatewayCli("usage.cost", opts, { days });
          if (opts.json) {
            defaultRuntime.log(JSON.stringify(result, null, 2));
            return;
          }
          const rich = isRich();
          const summary = result as CostUsageSummary;
          for (const line of renderCostUsageSummary(summary, days, rich)) {
            defaultRuntime.log(line);
          }
        }, "Falha no custo de uso do Gateway");
      }),
  );

  gatewayCallOpts(
    gateway
      .command("health")
      .description("Buscar saúde do Gateway")
      .action(async (opts) => {
        await runGatewayCommand(async () => {
          const result = await callGatewayCli("health", opts);
          if (opts.json) {
            defaultRuntime.log(JSON.stringify(result, null, 2));
            return;
          }
          const rich = isRich();
          const obj =
            result && typeof result === "object" ? (result as Record<string, unknown>) : {};
          const durationMs = typeof obj.durationMs === "number" ? obj.durationMs : null;
          defaultRuntime.log(colorize(rich, theme.heading, "Saúde do Gateway"));
          defaultRuntime.log(
            `${colorize(rich, theme.success, "OK")}${durationMs != null ? ` (${durationMs}ms)` : ""}`,
          );
          if (obj.channels && typeof obj.channels === "object") {
            for (const line of formatHealthChannelLines(obj as HealthSummary)) {
              defaultRuntime.log(styleHealthChannelLine(line, rich));
            }
          }
        });
      }),
  );

  gateway
    .command("probe")
    .description(
      "Mostrar alcançabilidade do gateway + descoberta + saúde + resumo de status (local + remoto)",
    )
    .option("--url <url>", "URL WebSocket do Gateway explícita (ainda sonda localhost)")
    .option("--ssh <target>", "Alvo SSH para túnel de gateway remoto (user@host ou user@host:port)")
    .option("--ssh-identity <path>", "Caminho do arquivo de identidade SSH")
    .option("--ssh-auto", "Tentar derivar um alvo SSH da descoberta Bonjour", false)
    .option("--token <token>", "Token do Gateway (aplica-se a todas as sondas)")
    .option("--password <password>", "Senha do Gateway (aplica-se a todas as sondas)")
    .option("--timeout <ms>", "Orçamento geral de sonda em ms", "3000")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runGatewayCommand(async () => {
        await gatewayStatusCommand(opts, defaultRuntime);
      });
    });

  gateway
    .command("discover")
    .description(
      `Descobrir gateways via Bonjour (multicast local. + unicast ${WIDE_AREA_DISCOVERY_DOMAIN})`,
    )
    .option("--timeout <ms>", "Timeout por comando em ms", "2000")
    .option("--json", "Saída JSON", false)
    .action(async (opts: GatewayDiscoverOpts) => {
      await runGatewayCommand(async () => {
        const timeoutMs = parseDiscoverTimeoutMs(opts.timeout, 2000);
        const beacons = await withProgress(
          {
            label: "Escaneando gateways…",
            indeterminate: true,
            enabled: opts.json !== true,
            delayMs: 0,
          },
          async () => await discoverGatewayBeacons({ timeoutMs }),
        );

        const deduped = dedupeBeacons(beacons).sort((a, b) =>
          String(a.displayName || a.instanceName).localeCompare(
            String(b.displayName || b.instanceName),
          ),
        );

        if (opts.json) {
          const enriched = deduped.map((b) => {
            const host = pickBeaconHost(b);
            const port = pickGatewayPort(b);
            return { ...b, wsUrl: host ? `ws://${host}:${port}` : null };
          });
          defaultRuntime.log(
            JSON.stringify(
              {
                timeoutMs,
                domains: ["local.", WIDE_AREA_DISCOVERY_DOMAIN],
                count: enriched.length,
                beacons: enriched,
              },
              null,
              2,
            ),
          );
          return;
        }

        const rich = isRich();
        defaultRuntime.log(colorize(rich, theme.heading, "Descoberta de Gateway"));
        defaultRuntime.log(
          colorize(
            rich,
            theme.muted,
            `Encontrado(s) ${deduped.length} gateway(s) · domínios: local., ${WIDE_AREA_DISCOVERY_DOMAIN}`,
          ),
        );
        if (deduped.length === 0) return;

        for (const beacon of deduped) {
          for (const line of renderBeaconLines(beacon, rich)) {
            defaultRuntime.log(line);
          }
        }
      }, "falha na descoberta de gateway");
    });
}
