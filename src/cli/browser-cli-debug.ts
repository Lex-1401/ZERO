import type { Command } from "commander";

import { resolveBrowserControlUrl } from "../browser/client.js";
import {
  browserHighlight,
  browserPageErrors,
  browserRequests,
  browserTraceStart,
  browserTraceStop,
} from "../browser/client-actions.js";
import { danger } from "../globals.js";
import { defaultRuntime } from "../runtime.js";
import type { BrowserParentOpts } from "./browser-cli-shared.js";
import { runCommandWithRuntime } from "./cli-utils.js";
import { shortenHomePath } from "../utils.js";

function runBrowserDebug(action: () => Promise<void>) {
  return runCommandWithRuntime(defaultRuntime, action, (err) => {
    defaultRuntime.error(danger(String(err)));
    defaultRuntime.exit(1);
  });
}

export function registerBrowserDebugCommands(
  browser: Command,
  parentOpts: (cmd: Command) => BrowserParentOpts,
) {
  browser
    .command("highlight")
    .description("Destacar um elemento por referência")
    .argument("<ref>", "ID de referência do snapshot")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (ref: string, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserDebug(async () => {
        const result = await browserHighlight(baseUrl, {
          ref: ref.trim(),
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`destacado ${ref.trim()}`);
      });
    });

  browser
    .command("errors")
    .description("Obter erros de página recentes")
    .option("--clear", "Limpar erros armazenados após a leitura", false)
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserDebug(async () => {
        const result = await browserPageErrors(baseUrl, {
          targetId: opts.targetId?.trim() || undefined,
          clear: Boolean(opts.clear),
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        if (!result.errors.length) {
          defaultRuntime.log("Nenhum erro de página.");
          return;
        }
        defaultRuntime.log(
          result.errors
            .map((e) => `${e.timestamp} ${e.name ? `${e.name}: ` : ""}${e.message}`)
            .join("\n"),
        );
      });
    });

  browser
    .command("requests")
    .description("Obter solicitações de rede recentes (melhor esforço)")
    .option("--filter <text>", "Mostrar apenas URLs que contêm esta substring")
    .option("--clear", "Limpar solicitações armazenadas após a leitura", false)
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserDebug(async () => {
        const result = await browserRequests(baseUrl, {
          targetId: opts.targetId?.trim() || undefined,
          filter: opts.filter?.trim() || undefined,
          clear: Boolean(opts.clear),
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        if (!result.requests.length) {
          defaultRuntime.log("Nenhuma solicitação gravada.");
          return;
        }
        defaultRuntime.log(
          result.requests
            .map((r) => {
              const status = typeof r.status === "number" ? ` ${r.status}` : "";
              const ok = r.ok === true ? " ok" : r.ok === false ? " fail" : "";
              const fail = r.failureText ? ` (${r.failureText})` : "";
              return `${r.timestamp} ${r.method}${status}${ok} ${r.url}${fail}`;
            })
            .join("\n"),
        );
      });
    });

  const trace = browser.command("trace").description("Gravar um monitoramento do Playwright");

  trace
    .command("start")
    .description("Iniciar a gravação de monitoramento")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .option("--no-screenshots", "Desativar capturas de tela")
    .option("--no-snapshots", "Desativar snapshots")
    .option("--sources", "Incluir fontes (monitoramentos maiores)", false)
    .action(async (opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserDebug(async () => {
        const result = await browserTraceStart(baseUrl, {
          targetId: opts.targetId?.trim() || undefined,
          screenshots: Boolean(opts.screenshots),
          snapshots: Boolean(opts.snapshots),
          sources: Boolean(opts.sources),
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log("monitoramento iniciado");
      });
    });

  trace
    .command("stop")
    .description("Parar a gravação de monitoramento e gravar um .zip")
    .option("--out <path>", "Caminho de saída para o zip de monitoramento")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserDebug(async () => {
        const result = await browserTraceStop(baseUrl, {
          targetId: opts.targetId?.trim() || undefined,
          path: opts.out?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`TRACE:${shortenHomePath(result.path)}`);
      });
    });
}
