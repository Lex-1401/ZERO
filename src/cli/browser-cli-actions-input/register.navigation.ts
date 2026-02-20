import type { Command } from "commander";
import { browserAct, browserNavigate } from "../../browser/client-actions.js";
import { danger } from "../../globals.js";
import { defaultRuntime } from "../../runtime.js";
import type { BrowserParentOpts } from "../browser-cli-shared.js";
import { requireRef, resolveBrowserActionContext } from "./shared.js";

export function registerBrowserNavigationCommands(
  browser: Command,
  parentOpts: (cmd: Command) => BrowserParentOpts,
) {
  browser
    .command("navigate")
    .description("Navegar a aba atual para uma URL")
    .argument("<url>", "URL para navegar")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (url: string, opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      try {
        const result = await browserNavigate(baseUrl, {
          url,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`navegado para ${result.url ?? url}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  browser
    .command("resize")
    .description("Redimensionar a janela de visualização (viewport)")
    .argument("<width>", "Largura da janela", (v: string) => Number(v))
    .argument("<height>", "Altura da janela", (v: string) => Number(v))
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (width: number, height: number, opts, cmd) => {
      const { parent, baseUrl, profile } = resolveBrowserActionContext(cmd, parentOpts);
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        defaultRuntime.error(danger("largura e altura devem ser números"));
        defaultRuntime.exit(1);
        return;
      }
      try {
        const result = await browserAct(
          baseUrl,
          {
            kind: "resize",
            width,
            height,
            targetId: opts.targetId?.trim() || undefined,
          },
          { profile },
        );
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`redimensionado para ${width}x${height}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  // Keep `requireRef` reachable; shared utilities are intended for other modules too.
  void requireRef;
}
