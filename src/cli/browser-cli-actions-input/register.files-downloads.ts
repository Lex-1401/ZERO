import type { Command } from "commander";
import {
  browserArmDialog,
  browserArmFileChooser,
  browserDownload,
  browserWaitForDownload,
} from "../../browser/client-actions.js";
import { danger } from "../../globals.js";
import { defaultRuntime } from "../../runtime.js";
import type { BrowserParentOpts } from "../browser-cli-shared.js";
import { resolveBrowserActionContext } from "./shared.js";
import { shortenHomePath } from "../../utils.js";

export function registerBrowserFilesAndDownloadsCommands(
  browser: Command,
  parentOpts: (cmd: Command) => BrowserParentOpts,
) {
  browser
    .command("upload")
    .description("Preparar upload de arquivo para o próximo seletor de arquivos")
    .argument("<paths...>", "Caminhos dos arquivos para upload")
    .option("--ref <ref>", "ID de referência do snapshot para clicar após preparar")
    .option("--input-ref <ref>", "ID de referência para <input type=file> para definir diretamente")
    .option("--element <selector>", "Seletor CSS para <input type=file>")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .option(
      "--timeout-ms <ms>",
      "Quanto tempo esperar pelo próximo seletor de arquivos (padrão: 120000)",
      (v: string) => Number(v),
    )
    .action(async (paths: string[], opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      try {
        const result = await browserArmFileChooser(baseUrl, {
          paths,
          ref: opts.ref?.trim() || undefined,
          inputRef: opts.inputRef?.trim() || undefined,
          element: opts.element?.trim() || undefined,
          targetId: opts.targetId?.trim() || undefined,
          timeoutMs: Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`upload preparado para ${paths.length} arquivo(s)`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("waitfordownload")
    .description("Aguardar pelo próximo download (e salvá-lo)")
    .argument("[path]", "Caminho de salvamento (padrão: /tmp/zero/downloads/...)")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .option(
      "--timeout-ms <ms>",
      "Quanto tempo esperar pelo próximo download (padrão: 120000)",
      (v: string) => Number(v),
    )
    .action(async (outPath: string | undefined, opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      try {
        const result = await browserWaitForDownload(baseUrl, {
          path: outPath?.trim() || undefined,
          targetId: opts.targetId?.trim() || undefined,
          timeoutMs: Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`baixado: ${shortenHomePath(result.download.path)}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("download")
    .description("Clicar em uma referência e salvar o download resultante")
    .argument("<ref>", "ID de referência do snapshot para clicar")
    .argument("<path>", "Caminho de salvamento")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .option(
      "--timeout-ms <ms>",
      "Quanto tempo esperar para o download iniciar (padrão: 120000)",
      (v: string) => Number(v),
    )
    .action(async (ref: string, outPath: string, opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      try {
        const result = await browserDownload(baseUrl, {
          ref,
          path: outPath,
          targetId: opts.targetId?.trim() || undefined,
          timeoutMs: Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`baixado: ${shortenHomePath(result.download.path)}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("dialog")
    .description("Preparar o próximo diálogo modal (alert/confirm/prompt)")
    .option("--accept", "Aceitar o diálogo", false)
    .option("--dismiss", "Recusar o diálogo", false)
    .option("--prompt <text>", "Texto de resposta para o prompt")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .option(
      "--timeout-ms <ms>",
      "Quanto tempo esperar pelo próximo diálogo (padrão: 120000)",
      (v: string) => Number(v),
    )
    .action(async (opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      const accept = opts.accept ? true : opts.dismiss ? false : undefined;
      if (accept === undefined) {
        defaultRuntime.error(danger("Especifique --accept ou --dismiss"));
        defaultRuntime.exit(1);
        return;
      }
      try {
        const result = await browserArmDialog(baseUrl, {
          accept,
          promptText: opts.prompt?.trim() || undefined,
          targetId: opts.targetId?.trim() || undefined,
          timeoutMs: Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log("diálogo preparado");
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });
}
