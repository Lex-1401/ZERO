import type { Command } from "commander";

import { loadConfig } from "../config/config.js";
import { danger, info } from "../globals.js";
import { defaultRuntime } from "../runtime.js";
import { resolveBrowserConfig, resolveProfile } from "../browser/config.js";
import { startBrowserBridgeServer, stopBrowserBridgeServer } from "../browser/bridge-server.js";
import { ensureChromeExtensionRelayServer } from "../browser/extension-relay.js";

function isLoopbackBindHost(host: string) {
  const h = host.trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

function parsePort(raw: unknown): number | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < 0 || n > 65535) return null;
  return n;
}

export function registerBrowserServeCommands(
  browser: Command,
  _parentOpts: (cmd: Command) => unknown,
) {
  browser
    .command("serve")
    .description("Executar um servidor de controle de navegador autônomo (para gateways remotos)")
    .option("--bind <host>", "Host de bind (padrão: 127.0.0.1)")
    .option("--port <port>", "Porta de bind (padrão: de browser.controlUrl)")
    .option(
      "--token <token>",
      "Exigir Authorization: Bearer <token> (obrigatório ao fazer bind em endereços não-loopback)",
    )
    .action(async (opts: { bind?: string; port?: string; token?: string }) => {
      const cfg = loadConfig();
      const resolved = resolveBrowserConfig(cfg.browser);
      if (!resolved.enabled) {
        defaultRuntime.error(
          danger(
            "O controle do navegador está desativado. Defina browser.enabled=true e tente novamente.",
          ),
        );
        defaultRuntime.exit(1);
      }

      const host = (opts.bind ?? "127.0.0.1").trim();
      const port = parsePort(opts.port) ?? resolved.controlPort;

      const envToken = process.env.ZERO_BROWSER_CONTROL_TOKEN?.trim();
      const authToken = (opts.token ?? envToken ?? resolved.controlToken)?.trim();
      if (!isLoopbackBindHost(host) && !authToken) {
        defaultRuntime.error(
          danger(
            `Recusando fazer bind do controle do navegador em ${host} sem --token (ou ZERO_BROWSER_CONTROL_TOKEN, ou browser.controlToken).`,
          ),
        );
        defaultRuntime.exit(1);
      }

      const bridge = await startBrowserBridgeServer({
        resolved,
        host,
        port,
        ...(authToken ? { authToken } : {}),
      });

      // If any profile uses the Chrome extension relay, start the local relay server eagerly
      // so the extension can connect before the first browser action.
      for (const name of Object.keys(resolved.profiles)) {
        const profile = resolveProfile(resolved, name);
        if (!profile || profile.driver !== "extension") continue;
        await ensureChromeExtensionRelayServer({ cdpUrl: profile.cdpUrl }).catch((err) => {
          defaultRuntime.error(
            danger(
              `Falha na inicialização do relay da extensão do Chrome para o perfil "${name}": ${String(err)}`,
            ),
          );
        });
      }

      defaultRuntime.log(
        info(
          [
            `∅ Controle do navegador ouvindo em ${bridge.baseUrl}/`,
            authToken ? "Auth: Token Bearer obrigatório." : "Auth: desativada (apenas loopback).",
            "",
            "Cole no Gateway (zero.json):",
            JSON.stringify(
              {
                browser: {
                  enabled: true,
                  controlUrl: bridge.baseUrl,
                  ...(authToken ? { controlToken: authToken } : {}),
                },
              },
              null,
              2,
            ),
            ...(authToken
              ? [
                  "",
                  "Ou use env no Gateway (em vez de controlToken na config):",
                  `export ZERO_BROWSER_CONTROL_TOKEN=${JSON.stringify(authToken)}`,
                ]
              : []),
          ].join("\n"),
        ),
      );

      let shuttingDown = false;
      const shutdown = async (signal: string) => {
        if (shuttingDown) return;
        shuttingDown = true;
        defaultRuntime.log(info(`Desligando (${signal})...`));
        await stopBrowserBridgeServer(bridge.server).catch(() => {});
        process.exit(0);
      };
      process.once("SIGINT", () => void shutdown("SIGINT"));
      process.once("SIGTERM", () => void shutdown("SIGTERM"));

      await new Promise(() => {});
    });
}
