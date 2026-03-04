import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Command } from "commander";

import { STATE_DIR_ZERO } from "../config/paths.js";
import { danger, info } from "../globals.js";
import { copyToClipboard } from "../infra/clipboard.js";
import { defaultRuntime } from "../runtime.js";
import { movePathToTrash } from "../browser/trash.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { shortenHomePath } from "../utils.js";
import { formatCliCommand } from "./command-format.js";

function bundledExtensionRootDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../assets/chrome-extension");
}

function installedExtensionRootDir() {
  return path.join(STATE_DIR_ZERO, "browser", "chrome-extension");
}

function hasManifest(dir: string) {
  return fs.existsSync(path.join(dir, "manifest.json"));
}

export async function installChromeExtension(opts?: {
  stateDir?: string;
  sourceDir?: string;
}): Promise<{ path: string }> {
  const src = opts?.sourceDir ?? bundledExtensionRootDir();
  if (!hasManifest(src)) {
    throw new Error(
      "A extensão do Chrome embutida está faltando. Reinstale o ZERO e tente novamente.",
    );
  }

  const stateDir = opts?.stateDir ?? STATE_DIR_ZERO;
  const dest = path.join(stateDir, "browser", "chrome-extension");
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (fs.existsSync(dest)) {
    await movePathToTrash(dest).catch(() => {
      const backup = `${dest}.old-${Date.now()}`;
      fs.renameSync(dest, backup);
    });
  }

  await fs.promises.cp(src, dest, { recursive: true });
  if (!hasManifest(dest)) {
    throw new Error(
      "A instalação da extensão do Chrome falhou (manifest.json ausente). Tente novamente.",
    );
  }

  return { path: dest };
}

export function registerBrowserExtensionCommands(
  browser: Command,
  parentOpts: (cmd: Command) => { json?: boolean },
) {
  const ext = browser.command("extension").description("Ajudantes da extensão do Chrome");

  ext
    .command("install")
    .description("Instalar a extensão do Chrome em um caminho local estável")
    .action(async (_opts, cmd) => {
      const parent = parentOpts(cmd);
      let installed: { path: string };
      try {
        installed = await installChromeExtension();
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }

      if (parent?.json) {
        defaultRuntime.log(JSON.stringify({ ok: true, path: installed.path }, null, 2));
        return;
      }
      const displayPath = shortenHomePath(installed.path);
      defaultRuntime.log(displayPath);
      const copied = await copyToClipboard(installed.path).catch(() => false);
      defaultRuntime.error(
        info(
          [
            copied
              ? "Copiado para a área de transferência."
              : "Cópia para a área de transferência indisponível.",
            "Próximos passos:",
            `- Chrome → chrome://extensions → habilitar “Modo do desenvolvedor”`,
            `- “Carregar sem compactação” → selecione: ${displayPath}`,
            `- Fixar “ZERO Browser Relay”, então clique nele na aba (o ícone mostra ON)`,
            "",
            `${theme.muted("Docs:")} ${formatDocsLink("/tools/chrome-extension", "docs.zero.local/tools/chrome-extension")}`,
          ].join("\n"),
        ),
      );
    });

  ext
    .command("path")
    .description("Imprimir o caminho da extensão do Chrome instalada (carregar sem compactação)")
    .action(async (_opts, cmd) => {
      const parent = parentOpts(cmd);
      const dir = installedExtensionRootDir();
      if (!hasManifest(dir)) {
        defaultRuntime.error(
          danger(
            [
              `A extensão do Chrome não está instalada. Execute: "${formatCliCommand("zero browser extension install")}"`,
              `Docs: ${formatDocsLink("/tools/chrome-extension", "docs.zero.local/tools/chrome-extension")}`,
            ].join("\n"),
          ),
        );
        defaultRuntime.exit(1);
      }
      if (parent?.json) {
        defaultRuntime.log(JSON.stringify({ path: dir }, null, 2));
        return;
      }
      const displayPath = shortenHomePath(dir);
      defaultRuntime.log(displayPath);
      const copied = await copyToClipboard(dir).catch(() => false);
      if (copied) defaultRuntime.error(info("Copiado para a área de transferência."));
    });
}
