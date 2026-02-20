import type { Command } from "commander";
import type { BrowserTab } from "../browser/client.js";
import {
  browserCloseTab,
  browserCreateProfile,
  browserDeleteProfile,
  browserFocusTab,
  browserOpenTab,
  browserProfiles,
  browserResetProfile,
  browserStart,
  browserStatus,
  browserStop,
  browserTabAction,
  browserTabs,
  resolveBrowserControlUrl,
} from "../browser/client.js";
import { browserAct } from "../browser/client-actions-core.js";
import { danger, info } from "../globals.js";
import { defaultRuntime } from "../runtime.js";
import { shortenHomePath } from "../utils.js";
import type { BrowserParentOpts } from "./browser-cli-shared.js";
import { runCommandWithRuntime } from "./cli-utils.js";

function runBrowserCommand(action: () => Promise<void>) {
  return runCommandWithRuntime(defaultRuntime, action, (err) => {
    defaultRuntime.error(danger(String(err)));
    defaultRuntime.exit(1);
  });
}

export function registerBrowserManageCommands(
  browser: Command,
  parentOpts: (cmd: Command) => BrowserParentOpts,
) {
  browser
    .command("status")
    .description("Mostrar status do navegador")
    .action(async (_opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      await runBrowserCommand(async () => {
        const status = await browserStatus(baseUrl, {
          profile: parent?.browserProfile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(status, null, 2));
          return;
        }
        const detectedPath = status.detectedExecutablePath ?? status.executablePath;
        const detectedDisplay = detectedPath ? shortenHomePath(detectedPath) : "auto";
        const name = status.profile ?? "zero";
        defaultRuntime.log(
          [
            `perfil: ${name}`,
            `habilitado: ${status.enabled}`,
            `em execução: ${status.running}`,
            `urlControle: ${status.controlUrl}`,
            `portaCDP: ${status.cdpPort}`,
            `urlCDP: ${status.cdpUrl ?? `http://127.0.0.1:${status.cdpPort}`}`,
            `navegador: ${status.chosenBrowser ?? "desconhecido"}`,
            `navegadorDetectado: ${status.detectedBrowser ?? "desconhecido"}`,
            `caminhoDetectado: ${detectedDisplay}`,
            `corPerfil: ${status.color}`,
            ...(status.detectError ? [`erroDeteccao: ${status.detectError}`] : []),
          ].join("\n"),
        );
      });
    });

  browser
    .command("start")
    .description("Iniciar o navegador (sem efeito se já estiver rodando)")
    .action(async (_opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        await browserStart(baseUrl, { profile });
        const status = await browserStatus(baseUrl, { profile });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(status, null, 2));
          return;
        }
        const name = status.profile ?? "zero";
        const statusRunning = status.running ? "em execução" : "parado";
        defaultRuntime.log(info(`∅ navegador [${name}] status: ${statusRunning}`));
      });
    });

  browser
    .command("stop")
    .description("Parar o navegador")
    .action(async (_opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        await browserStop(baseUrl, { profile });
        const status = await browserStatus(baseUrl, { profile });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(status, null, 2));
          return;
        }
        const name = status.profile ?? "zero";
        const statusRunning = status.running ? "em execução" : "parado";
        defaultRuntime.log(info(`∅ navegador [${name}] status: ${statusRunning}`));
      });
    });

  browser
    .command("reset-profile")
    .description("Resetar perfil do navegador (move para a Lixeira)")
    .action(async (_opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const result = await browserResetProfile(baseUrl, { profile });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        if (!result.moved) {
          defaultRuntime.log(info(`∅ perfil do navegador já ausente.`));
          return;
        }
        const dest = result.to ?? result.from;
        defaultRuntime.log(info(`∅ perfil do navegador movido para a Lixeira (${dest})`));
      });
    });

  browser
    .command("tabs")
    .description("Listar abas abertas")
    .action(async (_opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const tabs = await browserTabs(baseUrl, { profile });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify({ tabs }, null, 2));
          return;
        }
        if (tabs.length === 0) {
          defaultRuntime.log("Nenhuma aba aberta (navegador fechado ou sem alvos).");
          return;
        }
        defaultRuntime.log(
          tabs
            .map(
              (t, i) => `${i + 1}. ${t.title || "(sem título)"}\n   ${t.url}\n   id: ${t.targetId}`,
            )
            .join("\n"),
        );
      });
    });

  const tab = browser
    .command("tab")
    .description("Atalhos de aba (baseado em índice)")
    .action(async (_opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const result = (await browserTabAction(baseUrl, {
          action: "list",
          profile,
        })) as { ok: true; tabs: BrowserTab[] };
        const tabs = result.tabs ?? [];
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify({ tabs }, null, 2));
          return;
        }
        if (tabs.length === 0) {
          defaultRuntime.log("Nenhuma aba aberta (navegador fechado ou sem alvos).");
          return;
        }
        defaultRuntime.log(
          tabs
            .map(
              (t, i) => `${i + 1}. ${t.title || "(sem título)"}\n   ${t.url}\n   id: ${t.targetId}`,
            )
            .join("\n"),
        );
      });
    });

  tab
    .command("new")
    .description("Abrir uma nova aba (about:blank)")
    .action(async (_opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const result = await browserTabAction(baseUrl, {
          action: "new",
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log("nova aba aberta");
      });
    });

  tab
    .command("select")
    .description("Focar aba por índice (começa em 1)")
    .argument("<index>", "Índice da aba (começa em 1)", (v: string) => Number(v))
    .action(async (index: number, _opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      if (!Number.isFinite(index) || index < 1) {
        defaultRuntime.error(danger("o índice deve ser um número positivo"));
        defaultRuntime.exit(1);
        return;
      }
      await runBrowserCommand(async () => {
        const result = await browserTabAction(baseUrl, {
          action: "select",
          index: Math.floor(index) - 1,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`aba ${Math.floor(index)} selecionada`);
      });
    });

  tab
    .command("close")
    .description("Fechar aba por índice (começa em 1); padrão: primeira aba")
    .argument("[index]", "Índice da aba (começa em 1)", (v: string) => Number(v))
    .action(async (index: number | undefined, _opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      const idx =
        typeof index === "number" && Number.isFinite(index) ? Math.floor(index) - 1 : undefined;
      if (typeof idx === "number" && idx < 0) {
        defaultRuntime.error(danger("o índice deve ser >= 1"));
        defaultRuntime.exit(1);
        return;
      }
      await runBrowserCommand(async () => {
        const result = await browserTabAction(baseUrl, {
          action: "close",
          index: idx,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log("aba fechada");
      });
    });

  browser
    .command("open")
    .description("Abrir uma URL em uma nova aba")
    .argument("<url>", "URL para abrir")
    .action(async (url: string, _opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const tab = await browserOpenTab(baseUrl, url, { profile });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(tab, null, 2));
          return;
        }
        defaultRuntime.log(`aberto: ${tab.url}\nid: ${tab.targetId}`);
      });
    });

  browser
    .command("focus")
    .description("Focar uma aba por ID de alvo (ou prefixo único)")
    .argument("<targetId>", "ID de alvo ou prefixo único")
    .action(async (targetId: string, _opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        await browserFocusTab(baseUrl, targetId, { profile });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify({ ok: true }, null, 2));
          return;
        }
        defaultRuntime.log(`aba ${targetId} focada`);
      });
    });

  browser
    .command("close")
    .description("Fechar uma aba (ID de alvo opcional)")
    .argument("[targetId]", "ID de alvo ou prefixo único (opcional)")
    .action(async (targetId: string | undefined, _opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        if (targetId?.trim()) {
          await browserCloseTab(baseUrl, targetId.trim(), { profile });
        } else {
          await browserAct(baseUrl, { kind: "close" }, { profile });
        }
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify({ ok: true }, null, 2));
          return;
        }
        defaultRuntime.log("aba fechada");
      });
    });

  // Profile management commands
  browser
    .command("profiles")
    .description("Listar todos os perfis do navegador")
    .action(async (_opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      await runBrowserCommand(async () => {
        const profiles = await browserProfiles(baseUrl);
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify({ profiles }, null, 2));
          return;
        }
        if (profiles.length === 0) {
          defaultRuntime.log("Nenhum perfil configurado.");
          return;
        }
        defaultRuntime.log(
          profiles
            .map((p) => {
              const status = p.running ? "em execução" : "parado";
              const tabs = p.running ? ` (${p.tabCount} abas)` : "";
              const def = p.isDefault ? " [padrão]" : "";
              const loc = p.isRemote ? `urlCDP: ${p.cdpUrl}` : `porta: ${p.cdpPort}`;
              const remote = p.isRemote ? " [remoto]" : "";
              return `${p.name}: ${status}${tabs}${def}${remote}\n  ${loc}, cor: ${p.color}`;
            })
            .join("\n"),
        );
      });
    });

  browser
    .command("create-profile")
    .description("Criar um novo perfil de navegador")
    .requiredOption("--name <name>", "Nome do perfil (minúsculas, números, hifens)")
    .option("--color <hex>", "Cor do perfil (formato hex, ex: #0066CC)")
    .option("--cdp-url <url>", "URL CDP para Chrome remoto (http/https)")
    .option("--driver <driver>", "Driver do perfil (zero|extension). Padrão: zero")
    .action(
      async (opts: { name: string; color?: string; cdpUrl?: string; driver?: string }, cmd) => {
        const parent = parentOpts(cmd);
        const baseUrl = resolveBrowserControlUrl(parent?.url);
        await runBrowserCommand(async () => {
          const result = await browserCreateProfile(baseUrl, {
            name: opts.name,
            color: opts.color,
            cdpUrl: opts.cdpUrl,
            driver: opts.driver === "extension" ? "extension" : undefined,
          });
          if (parent?.json) {
            defaultRuntime.log(JSON.stringify(result, null, 2));
            return;
          }
          const loc = result.isRemote ? `  urlCDP: ${result.cdpUrl}` : `  porta: ${result.cdpPort}`;
          defaultRuntime.log(
            info(
              `∅ Perfil "${result.profile}" criado\n${loc}\n  cor: ${result.color}${
                opts.driver === "extension" ? "\n  driver: extension" : ""
              }`,
            ),
          );
        });
      },
    );

  browser
    .command("delete-profile")
    .description("Deletar um perfil de navegador")
    .requiredOption("--name <name>", "Nome do perfil para deletar")
    .action(async (opts: { name: string }, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      await runBrowserCommand(async () => {
        const result = await browserDeleteProfile(baseUrl, opts.name);
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        const msg = result.deleted
          ? `∅ Perfil "${result.profile}" deletado (dados de usuário removidos)`
          : `∅ Perfil "${result.profile}" deletado (nenhum dado de usuário encontrado)`;
        defaultRuntime.log(info(msg));
      });
    });
}
