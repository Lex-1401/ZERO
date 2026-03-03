import type { Command } from "commander";
import { resolveBrowserControlUrl } from "../browser/client.js";
import {
  browserConsoleMessages,
  browserPdfSave,
  browserResponseBody,
} from "../browser/client-actions.js";
import { danger } from "../globals.js";
import { defaultRuntime } from "../runtime.js";
import type { BrowserParentOpts } from "./browser-cli-shared.js";
import { runCommandWithRuntime } from "./cli-utils.js";
import { shortenHomePath } from "../utils.js";

function runBrowserObserve(action: () => Promise<void>) {
  return runCommandWithRuntime(defaultRuntime, action, (err) => {
    defaultRuntime.error(danger(String(err)));
    defaultRuntime.exit(1);
  });
}

export function registerBrowserActionObserveCommands(
  browser: Command,
  parentOpts: (cmd: Command) => BrowserParentOpts,
) {
  browser
    .command("console")
    .description("Obter mensagens recentes do console")
    .option("--level <level>", "Filtrar por nível (error, warn, info)")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserObserve(async () => {
        const result = await browserConsoleMessages(baseUrl, {
          level: opts.level?.trim() || undefined,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(JSON.stringify(result.messages, null, 2));
      });
    });

  browser
    .command("pdf")
    .description("Salvar página como PDF")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserObserve(async () => {
        const result = await browserPdfSave(baseUrl, {
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`PDF: ${shortenHomePath(result.path)}`);
      });
    });

  browser
    .command("responsebody")
    .description("Aguardar por uma resposta de rede e retornar seu corpo")
    .argument("<url>", "URL (exata, substring, ou glob como **/api)")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .option(
      "--timeout-ms <ms>",
      "Quanto tempo esperar pela resposta (padrão: 20000)",
      (v: string) => Number(v),
    )
    .option("--max-chars <n>", "Limite de caracteres do corpo (padrão: 200000)", (v: string) =>
      Number(v),
    )
    .action(async (url: string, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserObserve(async () => {
        const result = await browserResponseBody(baseUrl, {
          url,
          targetId: opts.targetId?.trim() || undefined,
          timeoutMs: Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : undefined,
          maxChars: Number.isFinite(opts.maxChars) ? opts.maxChars : undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(result.response.body);
      });
    });
}
