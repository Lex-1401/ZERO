import type { Command } from "commander";
import { danger } from "../../globals.js";
import { defaultRuntime } from "../../runtime.js";
import { sanitizeAgentId } from "../../routing/session-key.js";
import { addGatewayClientOptions, callGatewayFromCli } from "../gateway-rpc.js";
import {
  getCronChannelOptions,
  parseAtMs,
  parseDurationMs,
  warnIfCronSchedulerDisabled,
} from "./shared.js";

const assignIf = (
  target: Record<string, unknown>,
  key: string,
  value: unknown,
  shouldAssign: boolean,
) => {
  if (shouldAssign) target[key] = value;
};

export function registerCronEditCommand(cron: Command) {
  addGatewayClientOptions(
    cron
      .command("edit")
      .description("Editar uma tarefa cron (campos patch)")
      .argument("<id>", "ID da tarefa")
      .option("--name <name>", "Definir nome")
      .option("--description <text>", "Definir descrição")
      .option("--enable", "Ativar tarefa", false)
      .option("--disable", "Desativar tarefa", false)
      .option("--delete-after-run", "Deletar tarefa de execução única após sucesso", false)
      .option("--keep-after-run", "Manter tarefa de execução única após sucesso", false)
      .option("--session <target>", "Alvo da sessão (main|isolated)")
      .option("--agent <id>", "Definir ID do agente")
      .option("--clear-agent", "Limpar agente e usar padrão", false)
      .option("--wake <mode>", "Modo de despertar (now|next-heartbeat)")
      .option("--at <when>", "Definir horário de execução única (ISO) ou duração como 20m")
      .option("--every <duration>", "Definir duração do intervalo como 10m")
      .option("--cron <expr>", "Definir expressão cron")
      .option("--tz <iana>", "Fuso horário para expressões cron (IANA)")
      .option("--system-event <text>", "Definir payload systemEvent")
      .option("--message <text>", "Definir mensagem do payload agentTurn")
      .option("--thinking <level>", "Nível de pensamento para tarefas de agente")
      .option("--model <model>", "Sobrescrever modelo para tarefas de agente")
      .option("--timeout-seconds <n>", "Segundos de tempo limite para tarefas de agente")
      .option(
        "--deliver",
        "Entregar saída do agente (necessário ao usar entrega last-route sem --to)",
      )
      .option("--no-deliver", "Desativar entrega")
      .option("--channel <channel>", `Canal de entrega (${getCronChannelOptions()})`)
      .option(
        "--to <dest>",
        "Destino da entrega (E.164, Telegram chatId, ou canal/usuário Discord)",
      )
      .option("--best-effort-deliver", "Não falhar a tarefa se a entrega falhar")
      .option("--no-best-effort-deliver", "Falhar a tarefa se a entrega falhar")
      .option("--post-prefix <prefix>", "Prefix for summary system event")
      .action(async (id, opts) => {
        try {
          if (opts.session === "main" && opts.message) {
            throw new Error(
              "Tarefas main não podem usar --message; use --system-event ou --session isolated.",
            );
          }
          if (opts.session === "isolated" && opts.systemEvent) {
            throw new Error(
              "Tarefas isoladas não podem usar --system-event; use --message ou --session main.",
            );
          }
          if (opts.session === "main" && typeof opts.postPrefix === "string") {
            throw new Error("--post-prefix só se aplica a tarefas isoladas.");
          }

          const patch: Record<string, unknown> = {};
          if (typeof opts.name === "string") patch.name = opts.name;
          if (typeof opts.description === "string") patch.description = opts.description;
          if (opts.enable && opts.disable)
            throw new Error("Escolha --enable ou --disable, não ambos");
          if (opts.enable) patch.enabled = true;
          if (opts.disable) patch.enabled = false;
          if (opts.deleteAfterRun && opts.keepAfterRun) {
            throw new Error("Escolha --delete-after-run ou --keep-after-run, não ambos");
          }
          if (opts.deleteAfterRun) patch.deleteAfterRun = true;
          if (opts.keepAfterRun) patch.deleteAfterRun = false;
          if (typeof opts.session === "string") patch.sessionTarget = opts.session;
          if (typeof opts.wake === "string") patch.wakeMode = opts.wake;
          if (opts.agent && opts.clearAgent) {
            throw new Error("Use --agent ou --clear-agent, não ambos");
          }
          if (typeof opts.agent === "string" && opts.agent.trim()) {
            patch.agentId = sanitizeAgentId(opts.agent.trim());
          }
          if (opts.clearAgent) {
            patch.agentId = null;
          }

          const scheduleChosen = [opts.at, opts.every, opts.cron].filter(Boolean).length;
          if (scheduleChosen > 1) throw new Error("Escolha no máximo uma mudança de agendamento");
          if (opts.at) {
            const atMs = parseAtMs(String(opts.at));
            if (!atMs) throw new Error("--at inválido");
            patch.schedule = { kind: "at", atMs };
          } else if (opts.every) {
            const everyMs = parseDurationMs(String(opts.every));
            if (!everyMs) throw new Error("--every inválido");
            patch.schedule = { kind: "every", everyMs };
          } else if (opts.cron) {
            patch.schedule = {
              kind: "cron",
              expr: String(opts.cron),
              tz: typeof opts.tz === "string" && opts.tz.trim() ? opts.tz.trim() : undefined,
            };
          }

          const hasSystemEventPatch = typeof opts.systemEvent === "string";
          const model =
            typeof opts.model === "string" && opts.model.trim() ? opts.model.trim() : undefined;
          const thinking =
            typeof opts.thinking === "string" && opts.thinking.trim()
              ? opts.thinking.trim()
              : undefined;
          const timeoutSeconds = opts.timeoutSeconds
            ? Number.parseInt(String(opts.timeoutSeconds), 10)
            : undefined;
          const hasTimeoutSeconds = Boolean(timeoutSeconds && Number.isFinite(timeoutSeconds));
          const hasAgentTurnPatch =
            typeof opts.message === "string" ||
            Boolean(model) ||
            Boolean(thinking) ||
            hasTimeoutSeconds ||
            typeof opts.deliver === "boolean" ||
            typeof opts.channel === "string" ||
            typeof opts.to === "string" ||
            typeof opts.bestEffortDeliver === "boolean";
          if (hasSystemEventPatch && hasAgentTurnPatch) {
            throw new Error("Escolha no máximo uma mudança de payload");
          }
          if (hasSystemEventPatch) {
            patch.payload = {
              kind: "systemEvent",
              text: String(opts.systemEvent),
            };
          } else if (hasAgentTurnPatch) {
            const payload: Record<string, unknown> = { kind: "agentTurn" };
            assignIf(payload, "message", String(opts.message), typeof opts.message === "string");
            assignIf(payload, "model", model, Boolean(model));
            assignIf(payload, "thinking", thinking, Boolean(thinking));
            assignIf(payload, "timeoutSeconds", timeoutSeconds, hasTimeoutSeconds);
            assignIf(payload, "deliver", opts.deliver, typeof opts.deliver === "boolean");
            assignIf(payload, "channel", opts.channel, typeof opts.channel === "string");
            assignIf(payload, "to", opts.to, typeof opts.to === "string");
            assignIf(
              payload,
              "bestEffortDeliver",
              opts.bestEffortDeliver,
              typeof opts.bestEffortDeliver === "boolean",
            );
            patch.payload = payload;
          }

          if (typeof opts.postPrefix === "string") {
            patch.isolation = {
              postToMainPrefix: opts.postPrefix.trim() ? opts.postPrefix : "Cron",
            };
          }

          const res = await callGatewayFromCli("cron.update", opts, {
            id,
            patch,
          });
          defaultRuntime.log(JSON.stringify(res, null, 2));
          await warnIfCronSchedulerDisabled(opts);
        } catch (err) {
          defaultRuntime.error(danger(String(err)));
          defaultRuntime.exit(1);
        }
      }),
  );
}
