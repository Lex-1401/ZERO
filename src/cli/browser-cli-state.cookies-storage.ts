import type { Command } from "commander";

import { resolveBrowserControlUrl } from "../browser/client.js";
import {
  browserCookies,
  browserCookiesClear,
  browserCookiesSet,
  browserStorageClear,
  browserStorageGet,
  browserStorageSet,
} from "../browser/client-actions.js";
import { danger } from "../globals.js";
import { defaultRuntime } from "../runtime.js";
import type { BrowserParentOpts } from "./browser-cli-shared.js";

export function registerBrowserCookiesAndStorageCommands(
  browser: Command,
  parentOpts: (cmd: Command) => BrowserParentOpts,
) {
  const cookies = browser.command("cookies").description("Ler/gravar cookies");

  cookies
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      try {
        const result = await browserCookies(baseUrl, {
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(JSON.stringify(result.cookies ?? [], null, 2));
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  cookies
    .command("set")
    .description("Definir um cookie (requer --url ou domínio+caminho)")
    .argument("<name>", "Nome do cookie")
    .argument("<value>", "Valor do cookie")
    .requiredOption("--url <url>", "Escopo de URL do cookie (recomendado)")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (name: string, value: string, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      try {
        const result = await browserCookiesSet(baseUrl, {
          targetId: opts.targetId?.trim() || undefined,
          cookie: { name, value, url: opts.url },
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`cookie definido: ${name}`);
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  cookies
    .command("clear")
    .description("Limpar todos os cookies")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      try {
        const result = await browserCookiesClear(baseUrl, {
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log("cookies limpos");
      } catch (err) {
        defaultRuntime.error(danger(String(err)));
        defaultRuntime.exit(1);
      }
    });

  const storage = browser.command("storage").description("Ler/gravar localStorage/sessionStorage");

  function registerStorageKind(kind: "local" | "session") {
    const cmd = storage.command(kind).description(`Comandos de ${kind}Storage`);

    cmd
      .command("get")
      .description(`Obter ${kind}Storage (todas as chaves ou uma chave)`)
      .argument("[key]", "Chave (opcional)")
      .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
      .action(async (key: string | undefined, opts, cmd2) => {
        const parent = parentOpts(cmd2);
        const baseUrl = resolveBrowserControlUrl(parent?.url);
        const profile = parent?.browserProfile;
        try {
          const result = await browserStorageGet(baseUrl, {
            kind,
            key: key?.trim() || undefined,
            targetId: opts.targetId?.trim() || undefined,
            profile,
          });
          if (parent?.json) {
            defaultRuntime.log(JSON.stringify(result, null, 2));
            return;
          }
          defaultRuntime.log(JSON.stringify(result.values ?? {}, null, 2));
        } catch (err) {
          defaultRuntime.error(danger(String(err)));
          defaultRuntime.exit(1);
        }
      });

    cmd
      .command("set")
      .description(`Definir uma chave de ${kind}Storage`)
      .argument("<key>", "Chave")
      .argument("<value>", "Valor")
      .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
      .action(async (key: string, value: string, opts, cmd2) => {
        const parent = parentOpts(cmd2);
        const baseUrl = resolveBrowserControlUrl(parent?.url);
        const profile = parent?.browserProfile;
        try {
          const result = await browserStorageSet(baseUrl, {
            kind,
            key,
            value,
            targetId: opts.targetId?.trim() || undefined,
            profile,
          });
          if (parent?.json) {
            defaultRuntime.log(JSON.stringify(result, null, 2));
            return;
          }
          defaultRuntime.log(`${kind}Storage definido: ${key}`);
        } catch (err) {
          defaultRuntime.error(danger(String(err)));
          defaultRuntime.exit(1);
        }
      });

    cmd
      .command("clear")
      .description(`Limpar todas as chaves de ${kind}Storage`)
      .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
      .action(async (opts, cmd2) => {
        const parent = parentOpts(cmd2);
        const baseUrl = resolveBrowserControlUrl(parent?.url);
        const profile = parent?.browserProfile;
        try {
          const result = await browserStorageClear(baseUrl, {
            kind,
            targetId: opts.targetId?.trim() || undefined,
            profile,
          });
          if (parent?.json) {
            defaultRuntime.log(JSON.stringify(result, null, 2));
            return;
          }
          defaultRuntime.log(`${kind}Storage limpo`);
        } catch (err) {
          defaultRuntime.error(danger(String(err)));
          defaultRuntime.exit(1);
        }
      });
  }

  registerStorageKind("local");
  registerStorageKind("session");
}
