import type { Command } from "commander";

import { danger } from "../globals.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import type { GatewayRpcOpts } from "./gateway-rpc.js";
import { addGatewayClientOptions, callGatewayFromCli } from "./gateway-rpc.js";

type SystemEventOpts = GatewayRpcOpts & { text?: string; mode?: string; json?: boolean };

const normalizeWakeMode = (raw: unknown) => {
  const mode = typeof raw === "string" ? raw.trim() : "";
  if (!mode) return "next-heartbeat" as const;
  if (mode === "now" || mode === "next-heartbeat") return mode;
  throw new Error("--mode deve ser now ou next-heartbeat");
};

export function registerSystemCli(program: Command) {
  const system = program
    .command("system")
    .description("Ferramentas de sistema (eventos, heartbeat, presença)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/system", "docs.zero.local/cli/system")}\n`,
    );

  addGatewayClientOptions(
    system
      .command("event")
      .description("Enfileirar um evento de sistema e opcionalmente disparar um heartbeat")
      .requiredOption("--text <text>", "Texto do evento de sistema")
      .option("--mode <mode>", "Modo de despertar (now|next-heartbeat)", "next-heartbeat")
      .option("--json", "Saída em JSON", false),
  ).action(async (opts: SystemEventOpts) => {
    try {
      const text = typeof opts.text === "string" ? opts.text.trim() : "";
      if (!text) throw new Error("--text é obrigatório");
      const mode = normalizeWakeMode(opts.mode);
      const result = await callGatewayFromCli("wake", opts, { mode, text }, { expectFinal: false });
      if (opts.json) defaultRuntime.log(JSON.stringify(result, null, 2));
      else defaultRuntime.log("ok");
    } catch (err) {
      defaultRuntime.error(danger(String(err)));
      defaultRuntime.exit(1);
    }
  });

  const heartbeat = system.command("heartbeat").description("Controles de heartbeat");

  addGatewayClientOptions(
    heartbeat
      .command("last")
      .description("Mostrar o último evento de heartbeat")
      .option("--json", "Saída em JSON", false),
  ).action(async (opts: GatewayRpcOpts & { json?: boolean }) => {
    try {
      const result = await callGatewayFromCli("last-heartbeat", opts, undefined, {
        expectFinal: false,
      });
      defaultRuntime.log(JSON.stringify(result, null, 2));
    } catch (err) {
      defaultRuntime.error(danger(String(err)));
      defaultRuntime.exit(1);
    }
  });

  addGatewayClientOptions(
    heartbeat
      .command("enable")
      .description("Habilitar heartbeats")
      .option("--json", "Saída em JSON", false),
  ).action(async (opts: GatewayRpcOpts & { json?: boolean }) => {
    try {
      const result = await callGatewayFromCli(
        "set-heartbeats",
        opts,
        { enabled: true },
        { expectFinal: false },
      );
      defaultRuntime.log(JSON.stringify(result, null, 2));
    } catch (err) {
      defaultRuntime.error(danger(String(err)));
      defaultRuntime.exit(1);
    }
  });

  addGatewayClientOptions(
    heartbeat
      .command("disable")
      .description("Desabilitar heartbeats")
      .option("--json", "Saída em JSON", false),
  ).action(async (opts: GatewayRpcOpts & { json?: boolean }) => {
    try {
      const result = await callGatewayFromCli(
        "set-heartbeats",
        opts,
        { enabled: false },
        { expectFinal: false },
      );
      defaultRuntime.log(JSON.stringify(result, null, 2));
    } catch (err) {
      defaultRuntime.error(danger(String(err)));
      defaultRuntime.exit(1);
    }
  });

  addGatewayClientOptions(
    system
      .command("presence")
      .description("Listar entradas de presença do sistema")
      .option("--json", "Saída em JSON", false),
  ).action(async (opts: GatewayRpcOpts & { json?: boolean }) => {
    try {
      const result = await callGatewayFromCli("system-presence", opts, undefined, {
        expectFinal: false,
      });
      defaultRuntime.log(JSON.stringify(result, null, 2));
    } catch (err) {
      defaultRuntime.error(danger(String(err)));
      defaultRuntime.exit(1);
    }
  });
}
