import type { ZEROConfig } from "../config/config.js";
import { resolveGatewayPort } from "../config/config.js";
import { findTailscaleBinary } from "../infra/tailscale.js";
import type { RuntimeEnv } from "../runtime.js";
import { note } from "../terminal/note.js";
import { buildGatewayAuthConfig } from "./configure.gateway-auth.js";
import { confirm, select, text } from "./configure.shared.js";
import { guardCancel, randomToken } from "./onboard-helpers.js";

type GatewayAuthChoice = "off" | "token" | "password";

export async function promptGatewayConfig(
  cfg: ZEROConfig,
  runtime: RuntimeEnv,
): Promise<{
  config: ZEROConfig;
  port: number;
  token?: string;
}> {
  const portRaw = guardCancel(
    await text({
      message: "Porta do gateway",
      initialValue: String(resolveGatewayPort(cfg)),
      validate: (value) => (Number.isFinite(Number(value)) ? undefined : "Porta inválida"),
    }),
    runtime,
  );
  const port = Number.parseInt(String(portRaw), 10);

  let bind = guardCancel(
    await select({
      message: "Modo de vinculação (bind) do gateway",
      options: [
        {
          value: "loopback",
          label: "Loopback (Apenas local)",
          hint: "Vincular a 127.0.0.1 - seguro, acesso apenas local",
        },
        {
          value: "tailnet",
          label: "Tailnet (IP do Tailscale)",
          hint: "Vincular apenas ao seu IP do Tailscale (100.x.x.x)",
        },
        {
          value: "auto",
          label: "Automático (Loopback → LAN)",
          hint: "Preferir loopback; reverter para todas as interfaces se indisponível",
        },
        {
          value: "lan",
          label: "LAN (Todas as interfaces)",
          hint: "Vincular a 0.0.0.0 - acessível de qualquer lugar na sua rede",
        },
        {
          value: "custom",
          label: "IP personalizado",
          hint: "Especificar um endereço IP específico, com reverso para 0.0.0.0 se indisponível",
        },
      ],
    }),
    runtime,
  ) as "auto" | "lan" | "loopback" | "custom" | "tailnet";

  let customBindHost: string | undefined;
  if (bind === "custom") {
    const input = guardCancel(
      await text({
        message: "Endereço IP personalizado",
        placeholder: "192.168.1.100",
        validate: (value) => {
          if (!value) return "O endereço IP é obrigatório para o modo de vinculação personalizado";
          const trimmed = value.trim();
          const parts = trimmed.split(".");
          if (parts.length !== 4) return "Endereço IPv4 inválido (ex: 192.168.1.100)";
          if (
            parts.every((part) => {
              const n = parseInt(part, 10);
              return !Number.isNaN(n) && n >= 0 && n <= 255 && part === String(n);
            })
          )
            return undefined;
          return "Endereço IPv4 inválido (cada octeto deve ser 0-255)";
        },
      }),
      runtime,
    );
    customBindHost = typeof input === "string" ? input : undefined;
  }

  let authMode = guardCancel(
    await select({
      message: "Autenticação do gateway",
      options: [
        {
          value: "off",
          label: "Desativada (apenas loopback)",
          hint: "Não recomendado, a menos que você confie plenamente nos processos locais",
        },
        { value: "token", label: "Token", hint: "Padrão recomendado" },
        { value: "password", label: "Senha" },
      ],
      initialValue: "token",
    }),
    runtime,
  ) as GatewayAuthChoice;

  const tailscaleMode = guardCancel(
    await select({
      message: "Exposição via Tailscale",
      options: [
        { value: "off", label: "Off", hint: "Nenhuma exposição via Tailscale" },
        {
          value: "serve",
          label: "Serve",
          hint: "HTTPS privado para sua tailnet (dispositivos no Tailscale)",
        },
        {
          value: "funnel",
          label: "Funnel",
          hint: "HTTPS público via Tailscale Funnel (internet)",
        },
      ],
    }),
    runtime,
  ) as "off" | "serve" | "funnel";

  // Detect Tailscale binary before proceeding with serve/funnel setup.
  if (tailscaleMode !== "off") {
    const tailscaleBin = await findTailscaleBinary();
    if (!tailscaleBin) {
      note(
        [
          "Binário do Tailscale não encontrado no PATH ou em /Applications.",
          "Certifique-se de que o Tailscale esteja instalado de:",
          "  https://tailscale.com/download/mac",
          "",
          "Você pode continuar a configuração, mas serve/funnel falhará em tempo de execução.",
        ].join("\n"),
        "Aviso do Tailscale",
      );
    }
  }

  let tailscaleResetOnExit = false;
  if (tailscaleMode !== "off") {
    note(
      [
        "Docs:",
        "https://github.com/Lex-1401/ZERO/tree/main/docs/gateway/tailscale",
        "https://github.com/Lex-1401/ZERO/tree/main/docs/web",
      ].join("\n"),
      "Tailscale",
    );
    tailscaleResetOnExit = Boolean(
      guardCancel(
        await confirm({
          message: "Resetar serve/funnel do Tailscale ao sair?",
          initialValue: false,
        }),
        runtime,
      ),
    );
  }

  if (tailscaleMode !== "off" && bind !== "loopback") {
    note("O Tailscale requer bind=loopback. Ajustando bind para loopback.", "Nota");
    bind = "loopback";
  }

  if (authMode === "off" && bind !== "loopback") {
    note(
      "Vinculação não-loopback requer autenticação. Mudando para autenticação por token.",
      "Nota",
    );
    authMode = "token";
  }

  if (tailscaleMode === "funnel" && authMode !== "password") {
    note("O Tailscale funnel requer autenticação por senha.", "Nota");
    authMode = "password";
  }

  let gatewayToken: string | undefined;
  let gatewayPassword: string | undefined;
  let next = cfg;

  if (authMode === "token") {
    const tokenInput = guardCancel(
      await text({
        message: "Token do gateway (deixe em branco para gerar)",
        initialValue: randomToken(),
      }),
      runtime,
    );
    gatewayToken = String(tokenInput).trim() || randomToken();
  }

  if (authMode === "password") {
    const password = guardCancel(
      await text({
        message: "Senha do gateway",
        validate: (value) => (value?.trim() ? undefined : "Obrigatório"),
      }),
      runtime,
    );
    gatewayPassword = String(password).trim();
  }

  const authConfig = buildGatewayAuthConfig({
    existing: next.gateway?.auth,
    mode: authMode,
    token: gatewayToken,
    password: gatewayPassword,
  });

  next = {
    ...next,
    gateway: {
      ...next.gateway,
      mode: "local",
      port,
      bind,
      auth: authConfig,
      ...(customBindHost && { customBindHost }),
      tailscale: {
        ...next.gateway?.tailscale,
        mode: tailscaleMode,
        resetOnExit: tailscaleResetOnExit,
      },
    },
  };

  return { config: next, port, token: gatewayToken };
}
