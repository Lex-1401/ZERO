import type { Command } from "commander";
import { browserAct } from "../../browser/client-actions.js";
import { danger } from "../../globals.js";
import { defaultRuntime } from "../../runtime.js";
import type { BrowserParentOpts } from "../browser-cli-shared.js";
import { requireRef, resolveBrowserActionContext } from "./shared.js";

export function registerBrowserElementCommands(
  browser: Command,
  parentOpts: (cmd: Command) => BrowserParentOpts,
) {
  browser
    .command("click")
    .description("Clicar em um elemento por referência (ref) do snapshot")
    .argument("<ref>", "ID de referência do snapshot")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .option("--double", "Clique duplo", false)
    .option("--button <left|right|middle>", "Botão do mouse a ser usado")
    .option("--modifiers <list>", "Modificadores separados por vírgula (Shift,Alt,Meta)")
    .action(async (ref: string | undefined, opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      const refValue = requireRef(ref);
      if (!refValue) return;
      const modifiers = opts.modifiers
        ? String(opts.modifiers)
            .split(",")
            .map((v: string) => v.trim())
            .filter(Boolean)
        : undefined;
      try {
        const result = await browserAct(
          baseUrl,
          {
            kind: "click",
            ref: refValue,
            targetId: opts.targetId?.trim() || undefined,
            doubleClick: Boolean(opts.double),
            button: opts.button?.trim() || undefined,
            modifiers,
          },
          { profile },
        );
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        const suffix = result.url ? ` em ${result.url}` : "";
        defaultRuntime.log(`clicado ref ${refValue}${suffix}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("type")
    .description("Digitar em um elemento por referência do snapshot")
    .argument("<ref>", "ID de referência do snapshot")
    .argument("<text>", "Texto para digitar")
    .option("--submit", "Pressionar Enter após digitar", false)
    .option("--slowly", "Digitar lentamente (humano)", false)
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (ref: string | undefined, text: string, opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      const refValue = requireRef(ref);
      if (!refValue) return;
      try {
        const result = await browserAct(
          baseUrl,
          {
            kind: "type",
            ref: refValue,
            text,
            submit: Boolean(opts.submit),
            slowly: Boolean(opts.slowly),
            targetId: opts.targetId?.trim() || undefined,
          },
          { profile },
        );
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`digitado na ref ${refValue}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("press")
    .description("Pressionar uma tecla")
    .argument("<key>", "Tecla a ser pressionada (ex: Enter)")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (key: string, opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      try {
        const result = await browserAct(
          baseUrl,
          { kind: "press", key, targetId: opts.targetId?.trim() || undefined },
          { profile },
        );
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`pressionado ${key}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("hover")
    .description("Passar o mouse sobre um elemento por referência de IA")
    .argument("<ref>", "ID de referência do snapshot")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (ref: string, opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      try {
        const result = await browserAct(
          baseUrl,
          { kind: "hover", ref, targetId: opts.targetId?.trim() || undefined },
          { profile },
        );
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`mouse sobre a ref ${ref}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("scrollintoview")
    .description("Rolar um elemento para visualização por referência do snapshot")
    .argument("<ref>", "ID de referência do snapshot")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .option("--timeout-ms <ms>", "Quanto tempo esperar pela rolagem (padrão: 20000)", (v: string) =>
      Number(v),
    )
    .action(async (ref: string | undefined, opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      const refValue = requireRef(ref);
      if (!refValue) return;
      try {
        const result = await browserAct(
          baseUrl,
          {
            kind: "scrollIntoView",
            ref: refValue,
            targetId: opts.targetId?.trim() || undefined,
            timeoutMs: Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : undefined,
          },
          { profile },
        );
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`rolado para visualização: ${refValue}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("drag")
    .description("Arrastar de uma referência para outra")
    .argument("<startRef>", "ID de referência inicial")
    .argument("<endRef>", "ID de referência final")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (startRef: string, endRef: string, opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      try {
        const result = await browserAct(
          baseUrl,
          {
            kind: "drag",
            startRef,
            endRef,
            targetId: opts.targetId?.trim() || undefined,
          },
          { profile },
        );
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`arrastado ${startRef} → ${endRef}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("select")
    .description("Selecionar opção(ões) em um elemento select")
    .argument("<ref>", "ID de referência do snapshot")
    .argument("<values...>", "Valores das opções para selecionar")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (ref: string, values: string[], opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      try {
        const result = await browserAct(
          baseUrl,
          {
            kind: "select",
            ref,
            values,
            targetId: opts.targetId?.trim() || undefined,
          },
          { profile },
        );
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`selecionado ${values.join(", ")}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });
}
