import type { Command } from "commander";
import type { CronJob } from "../../cron/types.js";
import { danger } from "../../globals.js";
import { defaultRuntime } from "../../runtime.js";
import { sanitizeAgentId } from "../../routing/session-key.js";
import type { GatewayRpcOpts } from "../gateway-rpc.js";
import { addGatewayClientOptions, callGatewayFromCli } from "../gateway-rpc.js";
import { parsePositiveIntOrUndefined } from "../program/helpers.js";
import {
  getCronChannelOptions,
  parseAtMs,
  parseDurationMs,
  printCronList,
  warnIfCronSchedulerDisabled,
} from "./shared.js";

export function registerCronStatusCommand(cron: Command) {
  addGatewayClientOptions(
    cron
      .command("status")
      .description("Mostrar status do agendador cron")
      .option("--json", "Saída JSON", false)
      .action(async (opts) => {
        try {
          const res = await callGatewayFromCli("cron.status", opts, {});
          defaultRuntime.log(JSON.stringify(res, null, 2));
        } catch (err) {
          defaultRuntime.error(danger(String(err)));
          defaultRuntime.exit(1);
        }
      }),
  );
}

export function registerCronListCommand(cron: Command) {
  addGatewayClientOptions(
    cron
      .command("list")
      .description("Listar tarefas cron")
      .option("--all", "Incluir tarefas desativadas", false)
      .option("--json", "Saída JSON", false)
      .action(async (opts) => {
        try {
          const res = await callGatewayFromCli("cron.list", opts, {
            includeDisabled: Boolean(opts.all),
          });
          if (opts.json) {
            defaultRuntime.log(JSON.stringify(res, null, 2));
            return;
          }
          const jobs = (res as { jobs?: CronJob[] } | null)?.jobs ?? [];
          printCronList(jobs, defaultRuntime);
        } catch (err) {
          defaultRuntime.error(danger(String(err)));
          defaultRuntime.exit(1);
        }
      }),
  );
}

export function registerCronAddCommand(cron: Command) {
  addGatewayClientOptions(
    cron
      .command("add")
      .alias("create")
      .description("Adicionar uma tarefa cron")
      .requiredOption("--name <name>", "Nome da tarefa")
      .option("--description <text>", "Descrição opcional")
      .option("--disabled", "Criar tarefa desativada", false)
      .option("--delete-after-run", "Deletar tarefa de execução única após sucesso", false)
      .option("--agent <id>", "ID do agente para esta tarefa")
      .option("--session <target>", "Alvo da sessão (main|isolated)", "main")
      .option("--wake <mode>", "Modo de despertar (now|next-heartbeat)", "next-heartbeat")
      .option("--at <when>", "Executar uma vez no horário (ISO) ou +duração (ex: 20m)")
      .option("--every <duration>", "Executar a cada duração (ex: 10m, 1h)")
      .option("--cron <expr>", "Expressão cron (5 campos)")
      .option("--tz <iana>", "Fuso horário para expressões cron (IANA)", "")
      .option("--system-event <text>", "Payload de evento do sistema (sessão main)")
      .option("--message <text>", "Payload de mensagem do agente")
      .option(
        "--thinking <level>",
        "Nível de pensamento para tarefas de agente (off|minimal|low|medium|high)",
      )
      .option(
        "--model <model>",
        "Sobrescrever modelo para tarefas de agente (provedor/modelo ou alias)",
      )
      .option("--timeout-seconds <n>", "Segundos de tempo limite para tarefas de agente")
      .option(
        "--deliver",
        "Entregar saída do agente (necessário ao usar entrega last-route sem --to)",
        false,
      )
      .option("--channel <channel>", `Canal de entrega (${getCronChannelOptions()})`, "last")
      .option(
        "--to <dest>",
        "Destino da entrega (E.164, Telegram chatId, ou canal/usuário Discord)",
      )
      .option("--best-effort-deliver", "Não falhar a tarefa se a entrega falhar", false)
      .option("--post-prefix <prefix>", "Prefixo para postagem na sessão main", "Cron")
      .option(
        "--post-mode <mode>",
        "O que postar de volta na main para tarefas isoladas (summary|full)",
        "summary",
      )
      .option(
        "--post-max-chars <n>",
        "Máximo de caracteres quando --post-mode=full (padrão 8000)",
        "8000",
      )
      .option("--json", "Saída JSON", false)
      .action(async (opts: GatewayRpcOpts & Record<string, unknown>) => {
        try {
          const schedule = (() => {
            const at = typeof opts.at === "string" ? opts.at : "";
            const every = typeof opts.every === "string" ? opts.every : "";
            const cronExpr = typeof opts.cron === "string" ? opts.cron : "";
            const chosen = [Boolean(at), Boolean(every), Boolean(cronExpr)].filter(Boolean).length;
            if (chosen !== 1) {
              throw new Error("Escolha exatamente um agendamento: --at, --every, ou --cron");
            }
            if (at) {
              const atMs = parseAtMs(at);
              if (!atMs) throw new Error("Inválido --at; use horário ISO ou duração como 20m");
              return { kind: "at" as const, atMs };
            }
            if (every) {
              const everyMs = parseDurationMs(every);
              if (!everyMs) throw new Error("Inválido --every; use ex: 10m, 1h, 1d");
              return { kind: "every" as const, everyMs };
            }
            return {
              kind: "cron" as const,
              expr: cronExpr,
              tz: typeof opts.tz === "string" && opts.tz.trim() ? opts.tz.trim() : undefined,
            };
          })();

          const sessionTargetRaw = typeof opts.session === "string" ? opts.session : "main";
          const sessionTarget = sessionTargetRaw.trim() || "main";
          if (sessionTarget !== "main" && sessionTarget !== "isolated") {
            throw new Error("--session deve ser main ou isolated");
          }

          const wakeModeRaw = typeof opts.wake === "string" ? opts.wake : "next-heartbeat";
          const wakeMode = wakeModeRaw.trim() || "next-heartbeat";
          if (wakeMode !== "now" && wakeMode !== "next-heartbeat") {
            throw new Error("--wake deve ser now ou next-heartbeat");
          }

          const agentId =
            typeof opts.agent === "string" && opts.agent.trim()
              ? sanitizeAgentId(opts.agent.trim())
              : undefined;

          const payload = (() => {
            const systemEvent = typeof opts.systemEvent === "string" ? opts.systemEvent.trim() : "";
            const message = typeof opts.message === "string" ? opts.message.trim() : "";
            const chosen = [Boolean(systemEvent), Boolean(message)].filter(Boolean).length;
            if (chosen !== 1) {
              throw new Error("Escolha exatamente um payload: --system-event ou --message");
            }
            if (systemEvent) return { kind: "systemEvent" as const, text: systemEvent };
            const timeoutSeconds = parsePositiveIntOrUndefined(opts.timeoutSeconds);
            return {
              kind: "agentTurn" as const,
              message,
              model:
                typeof opts.model === "string" && opts.model.trim() ? opts.model.trim() : undefined,
              thinking:
                typeof opts.thinking === "string" && opts.thinking.trim()
                  ? opts.thinking.trim()
                  : undefined,
              timeoutSeconds:
                timeoutSeconds && Number.isFinite(timeoutSeconds) ? timeoutSeconds : undefined,
              deliver: opts.deliver ? true : undefined,
              channel: typeof opts.channel === "string" ? opts.channel : "last",
              to: typeof opts.to === "string" && opts.to.trim() ? opts.to.trim() : undefined,
              bestEffortDeliver: opts.bestEffortDeliver ? true : undefined,
            };
          })();

          if (sessionTarget === "main" && payload.kind !== "systemEvent") {
            throw new Error("Tarefas main requerem --system-event (systemEvent).");
          }
          if (sessionTarget === "isolated" && payload.kind !== "agentTurn") {
            throw new Error("Tarefas isoladas requerem --message (agentTurn).");
          }

          const isolation =
            sessionTarget === "isolated"
              ? {
                  postToMainPrefix:
                    typeof opts.postPrefix === "string" && opts.postPrefix.trim()
                      ? opts.postPrefix.trim()
                      : "Cron",
                  postToMainMode:
                    opts.postMode === "full" || opts.postMode === "summary"
                      ? opts.postMode
                      : undefined,
                  postToMainMaxChars:
                    typeof opts.postMaxChars === "string" && /^\d+$/.test(opts.postMaxChars)
                      ? Number.parseInt(opts.postMaxChars, 10)
                      : undefined,
                }
              : undefined;

          const nameRaw = typeof opts.name === "string" ? opts.name : "";
          const name = nameRaw.trim();
          if (!name) throw new Error("--name é obrigatório");

          const description =
            typeof opts.description === "string" && opts.description.trim()
              ? opts.description.trim()
              : undefined;

          const params = {
            name,
            description,
            enabled: !opts.disabled,
            deleteAfterRun: Boolean(opts.deleteAfterRun),
            agentId,
            schedule,
            sessionTarget,
            wakeMode,
            payload,
            isolation,
          };

          const res = await callGatewayFromCli("cron.add", opts, params);
          defaultRuntime.log(JSON.stringify(res, null, 2));
          await warnIfCronSchedulerDisabled(opts);
        } catch (err) {
          defaultRuntime.error(danger(String(err)));
          defaultRuntime.exit(1);
        }
      }),
  );
}
