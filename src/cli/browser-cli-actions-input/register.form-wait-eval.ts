import type { Command } from "commander";
import { browserAct } from "../../browser/client-actions.js";
import { danger } from "../../globals.js";
import { defaultRuntime } from "../../runtime.js";
import type { BrowserParentOpts } from "../browser-cli-shared.js";
import { readFields, resolveBrowserActionContext } from "./shared.js";

export function registerBrowserFormWaitEvalCommands(
  browser: Command,
  parentOpts: (cmd: Command) => BrowserParentOpts,
) {
  browser
    .command("fill")
    .description("Preencher um formulário com descritores de campo JSON")
    .option("--fields <json>", "Array JSON de objetos de campo")
    .option("--fields-file <path>", "Ler array JSON de um arquivo")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      try {
        const fields = await readFields({
          fields: opts.fields,
          fieldsFile: opts.fieldsFile,
        });
        const result = await browserAct(
          baseUrl,
          {
            kind: "fill",
            fields,
            targetId: opts.targetId?.trim() || undefined,
          },
          { profile },
        );
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`preenchido(s) ${fields.length} campo(s)`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("wait")
    .description("Aguardar por tempo, seletor, URL, estado de carregamento ou condições JS")
    .argument("[selector]", "Seletor CSS para aguardar (visível)")
    .option("--time <ms>", "Aguardar por N milissegundos", (v: string) => Number(v))
    .option("--text <value>", "Aguardar o texto aparecer")
    .option("--text-gone <value>", "Aguardar o texto desaparecer")
    .option("--url <pattern>", "Aguardar pela URL (suporta globs como **/dash)")
    .option("--load <load|domcontentloaded|networkidle>", "Aguardar estado de carregamento")
    .option("--fn <js>", "Aguardar condição JS (passada para waitForFunction)")
    .option(
      "--timeout-ms <ms>",
      "Quanto tempo esperar por cada condição (padrão: 20000)",
      (v: string) => Number(v),
    )
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (selector: string | undefined, opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      try {
        const sel = selector?.trim() || undefined;
        const load =
          opts.load === "load" || opts.load === "domcontentloaded" || opts.load === "networkidle"
            ? (opts.load as "load" | "domcontentloaded" | "networkidle")
            : undefined;
        const result = await browserAct(
          baseUrl,
          {
            kind: "wait",
            timeMs: Number.isFinite(opts.time) ? opts.time : undefined,
            text: opts.text?.trim() || undefined,
            textGone: opts.textGone?.trim() || undefined,
            selector: sel,
            url: opts.url?.trim() || undefined,
            loadState: load,
            fn: opts.fn?.trim() || undefined,
            targetId: opts.targetId?.trim() || undefined,
            timeoutMs: Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : undefined,
          },
          { profile },
        );
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log("espera concluída");
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("evaluate")
    .description("Avaliar uma função contra a página ou uma referência")
    .option("--fn <code>", "Código fonte da função, ex: (el) => el.textContent")
    .option("--ref <id>", "Referência do snapshot")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      if (!opts.fn) {
        defaultRuntime.error(danger("Faltando --fn"));
        defaultRuntime.exit(1);
        return;
      }
      try {
        const result = await browserAct(
          baseUrl,
          {
            kind: "evaluate",
            fn: opts.fn,
            ref: opts.ref?.trim() || undefined,
            targetId: opts.targetId?.trim() || undefined,
          },
          { profile },
        );
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(JSON.stringify(result.result ?? null, null, 2));
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });
}
