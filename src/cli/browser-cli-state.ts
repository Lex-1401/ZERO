import type { Command } from "commander";

import { resolveBrowserControlUrl } from "../browser/client.js";
import {
  browserSetDevice,
  browserSetGeolocation,
  browserSetHeaders,
  browserSetHttpCredentials,
  browserSetLocale,
  browserSetMedia,
  browserSetOffline,
  browserSetTimezone,
} from "../browser/client-actions.js";
import { browserAct } from "../browser/client-actions-core.js";
import { danger } from "../globals.js";
import { defaultRuntime } from "../runtime.js";
import { parseBooleanValue } from "../utils/boolean.js";
import type { BrowserParentOpts } from "./browser-cli-shared.js";
import { registerBrowserCookiesAndStorageCommands } from "./browser-cli-state.cookies-storage.js";
import { runCommandWithRuntime } from "./cli-utils.js";

function parseOnOff(raw: string): boolean | null {
  const parsed = parseBooleanValue(raw);
  return parsed === undefined ? null : parsed;
}

function runBrowserCommand(action: () => Promise<void>) {
  return runCommandWithRuntime(defaultRuntime, action, (err) => {
    defaultRuntime.error(danger(String(err)));
    defaultRuntime.exit(1);
  });
}

export function registerBrowserStateCommands(
  browser: Command,
  parentOpts: (cmd: Command) => BrowserParentOpts,
) {
  registerBrowserCookiesAndStorageCommands(browser, parentOpts);

  const set = browser.command("set").description("Configurações do ambiente do navegador");

  set
    .command("viewport")
    .description("Definir o tamanho da janela de visualização (alias para resize)")
    .argument("<width>", "Largura da janela de visualização", (v: string) => Number(v))
    .argument("<height>", "Altura da janela de visualização", (v: string) => Number(v))
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (width: number, height: number, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        defaultRuntime.error(danger("largura e altura devem ser números"));
        defaultRuntime.exit(1);
        return;
      }
      await runBrowserCommand(async () => {
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
        defaultRuntime.log(`janela de visualização definida: ${width}x${height}`);
      });
    });

  set
    .command("offline")
    .description("Alternar modo offline")
    .argument("<on|off>", "on/off")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (value: string, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      const offline = parseOnOff(value);
      if (offline === null) {
        defaultRuntime.error(danger("Esperado on|off"));
        defaultRuntime.exit(1);
        return;
      }
      await runBrowserCommand(async () => {
        const result = await browserSetOffline(baseUrl, {
          offline,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`offline: ${offline}`);
      });
    });

  set
    .command("headers")
    .description("Definir cabeçalhos HTTP extras (objeto JSON)")
    .requiredOption("--json <json>", "Objeto JSON de cabeçalhos")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const parsed = JSON.parse(String(opts.json)) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("o json de cabeçalhos deve ser um objeto");
        }
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof v === "string") headers[k] = v;
        }
        const result = await browserSetHeaders(baseUrl, {
          headers,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log("cabeçalhos definidos");
      });
    });

  set
    .command("credentials")
    .description("Definir credenciais de autenticação básica HTTP")
    .option("--clear", "Limpar credenciais", false)
    .argument("[username]", "Nome de usuário")
    .argument("[password]", "Senha")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (username: string | undefined, password: string | undefined, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const result = await browserSetHttpCredentials(baseUrl, {
          username: username?.trim() || undefined,
          password,
          clear: Boolean(opts.clear),
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(opts.clear ? "credenciais limpas" : "credenciais definidas");
      });
    });

  set
    .command("geo")
    .description("Definir geolocalização (e conceder permissão)")
    .option("--clear", "Limpar geolocalização + permissões", false)
    .argument("[latitude]", "Latitude", (v: string) => Number(v))
    .argument("[longitude]", "Longitude", (v: string) => Number(v))
    .option("--accuracy <m>", "Precisão em metros", (v: string) => Number(v))
    .option("--origin <origin>", "Origem para conceder permissões")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (latitude: number | undefined, longitude: number | undefined, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const result = await browserSetGeolocation(baseUrl, {
          latitude: Number.isFinite(latitude) ? latitude : undefined,
          longitude: Number.isFinite(longitude) ? longitude : undefined,
          accuracy: Number.isFinite(opts.accuracy) ? opts.accuracy : undefined,
          origin: opts.origin?.trim() || undefined,
          clear: Boolean(opts.clear),
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(opts.clear ? "geolocalização limpa" : "geolocalização definida");
      });
    });

  set
    .command("media")
    .description("Emular prefers-color-scheme")
    .argument("<dark|light|none>", "dark/light/none")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (value: string, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      const v = value.trim().toLowerCase();
      const colorScheme =
        v === "dark" ? "dark" : v === "light" ? "light" : v === "none" ? "none" : null;
      if (!colorScheme) {
        defaultRuntime.error(danger("Esperado dark|light|none"));
        defaultRuntime.exit(1);
        return;
      }
      await runBrowserCommand(async () => {
        const result = await browserSetMedia(baseUrl, {
          colorScheme,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`media colorScheme: ${colorScheme}`);
      });
    });

  set
    .command("timezone")
    .description("Sobrescrever fuso horário (CDP)")
    .argument("<timezoneId>", "ID do fuso horário (ex: America/Sao_Paulo)")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (timezoneId: string, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const result = await browserSetTimezone(baseUrl, {
          timezoneId,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`timezone: ${timezoneId}`);
      });
    });

  set
    .command("locale")
    .description("Sobrescrever localidade (CDP)")
    .argument("<locale>", "Localidade (ex: pt-BR)")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (locale: string, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const result = await browserSetLocale(baseUrl, {
          locale,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`locale: ${locale}`);
      });
    });

  set
    .command("device")
    .description('Aplicar um descritor de dispositivo do Playwright (ex: "iPhone 14")')
    .argument("<name>", "Nome do dispositivo (dispositivos Playwright)")
    .option("--target-id <id>", "ID de alvo CDP (ou prefixo único)")
    .action(async (name: string, opts, cmd) => {
      const parent = parentOpts(cmd);
      const baseUrl = resolveBrowserControlUrl(parent?.url);
      const profile = parent?.browserProfile;
      await runBrowserCommand(async () => {
        const result = await browserSetDevice(baseUrl, {
          name,
          targetId: opts.targetId?.trim() || undefined,
          profile,
        });
        if (parent?.json) {
          defaultRuntime.log(JSON.stringify(result, null, 2));
          return;
        }
        defaultRuntime.log(`device: ${name}`);
      });
    });
}
