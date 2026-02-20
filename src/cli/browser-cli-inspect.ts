import type { Command } from "commander";

import { browserSnapshot, resolveBrowserControlUrl } from "../browser/client.js";
import { browserScreenshotAction } from "../browser/client-actions.js";
import { loadConfig } from "../config/config.js";
import { danger } from "../globals.js";
import { defaultRuntime } from "../runtime.js";
import { shortenHomePath } from "../utils.js";
import type { BrowserParentOpts } from "./browser-cli-shared.js";

export function registerBrowserInspectCommands(
  browser: Command,
  parentOpts: (cmd: Command) => BrowserParentOpts,
) {
  browser
    .command("screenshot")
    .description("Captura uma captura de tela (MEDIA:<path>)")
    .argument("[targetId]", "ID de alvo CDP (ou prefixo único)")
    .option("--full-page", "Captura a página rolável inteira", false)
    .option("--ref <ref>", "Referência ARIA do snapshot de IA")
    .option("--element <selector>", "Seletor CSS para captura de tela do elemento")
    .option("--type <png|jpeg>", "Tipo de saída (padrão: png)", "png")
    .action(async (targetId: string | undefined, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      try {
        const result = await browserScreenshotAction(baseUrl, {
          targetId: targetId?.trim() || undefined,
          fullPage: Boolean(opts.fullPage),
          ref: opts.ref?.trim() || undefined,
          element: opts.element?.trim() || undefined,
          type: opts.type === "jpeg" ? "jpeg" : "png",
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`MEDIA:${shortenHomePath(result.path)}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("snapshot")
    .description("Captura um snapshot (padrão: ai; aria é a árvore de acessibilidade)")
    .option("--format <aria|ai>", "Formato do snapshot (padrão: ai)", "ai")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .option("--limit <n>", "Limite de nós (padrão: 500/800)", (v: string) => Number(v))
    .option("--mode <efficient>", "Preset do snapshot (efficient)")
    .option("--efficient", "Usar o preset de snapshot eficiente", false)
    .option("--interactive", "Snapshot de papel: apenas elementos interativos", false)
    .option("--compact", "Snapshot de papel: saída compacta", false)
    .option("--depth <n>", "Snapshot de papel: profundidade máxima", (v: string) => Number(v))
    .option("--selector <sel>", "Snapshot de papel: escopo para seletor CSS")
    .option("--frame <sel>", "Snapshot de papel: escopo para um seletor de iframe")
    .option("--labels", "Incluir captura de tela com overlay de labels da viewport", false)
    .option("--out <path>", "Escrever o snapshot em um arquivo")
    .action(async (opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      const format = opts.format === "aria" ? "aria" : "ai";
      const configMode =
        format === "ai" && loadConfig().browser?.snapshotDefaults?.mode === "efficient"
          ? "efficient"
          : undefined;
      const mode = opts.efficient === true || opts.mode === "efficient" ? "efficient" : configMode;
      try {
        const result = await browserSnapshot(baseUrl, {
          format,
          targetId: opts.targetId?.trim() || undefined,
          limit: Number.isFinite(opts.limit) ? opts.limit : undefined,
          interactive: Boolean(opts.interactive) || undefined,
          compact: Boolean(opts.compact) || undefined,
          depth: Number.isFinite(opts.depth) ? opts.depth : undefined,
          selector: opts.selector?.trim() || undefined,
          frame: opts.frame?.trim() || undefined,
          labels: Boolean(opts.labels) || undefined,
          mode,
          profile,
        });

        if (opts.out) {
          const fs = await import("node:fs/promises");
          if (result.format === "ai") {
            await fs.writeFile(opts.out, result.snapshot, "utf8");
          } else {
            const payload = JSON.stringify(result, null, 2);
            await fs.writeFile(opts.out, payload, "utf8");
          }
          if (parent?.json) {
            defaultRuntime.log(
              JSON.stringify(
                {
                  ok: true,
                  out: opts.out,
                  ...(result.format === "ai" && result.imagePath
                    ? { imagePath: result.imagePath }
                    : {}),
                },
                null,
                2,
              ),
            );
          } else {
            defaultRuntime.log(shortenHomePath(opts.out));
            if (result.format === "ai" && result.imagePath) {
              defaultRuntime.log(`MEDIA:${shortenHomePath(result.imagePath)}`);
            }
          }
          return;
        }

        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }

        if (result.format === "ai") {
          defaultRuntime.log(result.snapshot);
          if (result.imagePath) {
            defaultRuntime.log(`MEDIA:${shortenHomePath(result.imagePath)}`);
          }
          return;
        }

        const nodes = "nodes" in result ? result.nodes : [];
        defaultRuntime.log(
          nodes
            .map((n) => {
              const indent = "  ".repeat(Math.min(20, n.depth));
              const name = n.name ? ` "${n.name}"` : "";
              const value = n.value ? ` = "${n.value}"` : "";
              return `${indent}- ${n.role}${name}${value}`;
            })
            .join("\n"),
        );
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });
}
