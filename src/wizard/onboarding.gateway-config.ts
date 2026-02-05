import { randomToken } from "../commands/onboard-helpers.js";
import type { GatewayAuthChoice } from "../commands/onboard-types.js";
import type { ZEROConfig } from "../config/config.js";
import { findTailscaleBinary } from "../infra/tailscale.js";
import type { RuntimeEnv } from "../runtime.js";
import type {
  GatewayWizardSettings,
  QuickstartGatewayDefaults,
  WizardFlow,
} from "./onboarding.types.js";
import type { WizardPrompter } from "./prompts.js";

type ConfigureGatewayOptions = {
  flow: WizardFlow;
  baseConfig: ZEROConfig;
  nextConfig: ZEROConfig;
  localPort: number;
  quickstartGateway: QuickstartGatewayDefaults;
  prompter: WizardPrompter;
  runtime: RuntimeEnv;
};

type ConfigureGatewayResult = {
  nextConfig: ZEROConfig;
  settings: GatewayWizardSettings;
};

export async function configureGatewayForOnboarding(
  opts: ConfigureGatewayOptions,
): Promise<ConfigureGatewayResult> {
  const { flow, localPort, quickstartGateway, prompter } = opts;
  let { nextConfig } = opts;

  const port =
    flow === "quickstart"
      ? quickstartGateway.port
      : Number.parseInt(
          String(
            await prompter.text({
              message: "Porta do Gateway",
              initialValue: String(localPort),
              validate: (value) => (Number.isFinite(Number(value)) ? undefined : "Porta inválida"),
            }),
          ),
          10,
        );

  let bind = (
    flow === "quickstart"
      ? quickstartGateway.bind
      : ((await prompter.select({
          message: "Vinculação (bind) do Gateway",
          options: [
            { value: "loopback", label: "Loopback (127.0.0.1)" },
            { value: "lan", label: "LAN (0.0.0.0)" },
            { value: "tailnet", label: "Tailnet (IP do Tailscale)" },
            { value: "auto", label: "Auto (Loopback → LAN)" },
            { value: "custom", label: "IP customizado" },
          ],
        })) as "loopback" | "lan" | "auto" | "custom" | "tailnet")
  ) as "loopback" | "lan" | "auto" | "custom" | "tailnet";

  let customBindHost = quickstartGateway.customBindHost;
  if (bind === "custom") {
    const needsPrompt = flow !== "quickstart" || !customBindHost;
    if (needsPrompt) {
      const input = await prompter.text({
        message: "Endereço IP customizado",
        placeholder: "192.168.1.100",
        initialValue: customBindHost ?? "",
        validate: (value) => {
          if (!value) return "Endereço IP é obrigatório para o modo bind customizado";
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
      });
      customBindHost = typeof input === "string" ? input.trim() : undefined;
    }
  }

  let authMode = (
    flow === "quickstart"
      ? quickstartGateway.authMode
      : ((await prompter.select({
          message: "Autenticação do Gateway",
          options: [
            {
              value: "off",
              label: "Desativada (apenas loopback)",
              hint: "Não recomendado a menos que você confie plenamente nos processos locais",
            },
            {
              value: "token",
              label: "Token",
              hint: "Padrão recomendado (local + remoto)",
            },
            { value: "password", label: "Senha" },
          ],
          initialValue: "token",
        })) as GatewayAuthChoice)
  ) as GatewayAuthChoice;

  const tailscaleMode = (
    flow === "quickstart"
      ? quickstartGateway.tailscaleMode
      : ((await prompter.select({
          message: "Exposição via Tailscale",
          options: [
            { value: "off", label: "Desativada", hint: "Nenhuma exposição via Tailscale" },
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
        })) as "off" | "serve" | "funnel")
  ) as "off" | "serve" | "funnel";

  // Detect Tailscale binary before proceeding with serve/funnel setup.
  if (tailscaleMode !== "off") {
    const tailscaleBin = await findTailscaleBinary();
    if (!tailscaleBin) {
      await prompter.note(
        [
          "Binário do Tailscale não encontrado no PATH ou em /Applications.",
          "Certifique-se de que o Tailscale está instalado a partir de:",
          "  https://tailscale.com/download/mac",
          "",
          "Você pode continuar a configuração, mas o serve/funnel falhará em tempo de execução.",
        ].join("\n"),
        "Aviso do Tailscale",
      );
    }
  }

  if (bind === "lan" && authMode === "off") {
    await prompter.note(
      [
        "⚠️ ALERTA DE SEGURANÇA ⚠️",
        "Você está expondo o ZERO na rede local (0.0.0.0) sem autenticação.",
        "Se este computador estiver conectado diretamente à internet (VPS, DMZ), qualquer pessoa poderá controlar seu agente.",
        "Recomendamos fortemente o uso de 'Token' ou 'Tailscale'.",
      ].join("\n"),
      "Risco Detectado",
    );
  }

  let tailscaleResetOnExit = flow === "quickstart" ? quickstartGateway.tailscaleResetOnExit : false;
  if (tailscaleMode !== "off" && flow !== "quickstart") {
    await prompter.note(
      ["Docs:", "https://docs.zero.local/gateway/tailscale", "https://docs.zero.local/web"].join(
        "\n",
      ),
      "Tailscale",
    );
    tailscaleResetOnExit = Boolean(
      await prompter.confirm({
        message: "Resetar tailscale serve/funnel ao sair?",
        initialValue: false,
      }),
    );
  }

  // Safety + constraints:
  // - Tailscale wants bind=loopback so we never expose a non-loopback server + tailscale serve/funnel at once.
  // - Auth off only allowed for bind=loopback.
  // - Funnel requires password auth.
  if (tailscaleMode !== "off" && bind !== "loopback") {
    await prompter.note(
      "O Tailscale requer bind=loopback. Ajustando o bind para loopback.",
      "Nota",
    );
    bind = "loopback";
    customBindHost = undefined;
  }

  if (authMode === "off" && bind !== "loopback") {
    await prompter.note(
      "Bind não-loopback requer autenticação. Mudando para autenticação por token.",
      "Nota",
    );
    authMode = "token";
  }

  if (tailscaleMode === "funnel" && authMode !== "password") {
    await prompter.note("O Tailscale funnel requer autenticação por senha.", "Nota");
    authMode = "password";
  }

  let gatewayToken: string | undefined;
  if (authMode === "token") {
    if (flow === "quickstart") {
      gatewayToken = quickstartGateway.token ?? randomToken();
    } else {
      const tokenInput = await prompter.text({
        message: "Token do Gateway (deixe em branco para gerar)",
        placeholder: "Necessário para acesso multi-máquina ou não-loopback",
        initialValue: quickstartGateway.token ?? "",
      });
      gatewayToken = String(tokenInput).trim() || randomToken();
    }
  }

  if (authMode === "password") {
    const password =
      flow === "quickstart" && quickstartGateway.password
        ? quickstartGateway.password
        : await prompter.text({
            message: "Senha do Gateway",
            validate: (value) => (value?.trim() ? undefined : "Obrigatório"),
          });
    nextConfig = {
      ...nextConfig,
      gateway: {
        ...nextConfig.gateway,
        auth: {
          ...nextConfig.gateway?.auth,
          mode: "password",
          password: String(password).trim(),
        },
      },
    };
  } else if (authMode === "token") {
    nextConfig = {
      ...nextConfig,
      gateway: {
        ...nextConfig.gateway,
        auth: {
          ...nextConfig.gateway?.auth,
          mode: "token",
          token: gatewayToken,
        },
      },
    };
  }

  nextConfig = {
    ...nextConfig,
    gateway: {
      ...nextConfig.gateway,
      port,
      bind,
      ...(bind === "custom" && customBindHost ? { customBindHost } : {}),
      tailscale: {
        ...nextConfig.gateway?.tailscale,
        mode: tailscaleMode,
        resetOnExit: tailscaleResetOnExit,
      },
    },
  };

  return {
    nextConfig,
    settings: {
      port,
      bind,
      customBindHost: bind === "custom" ? customBindHost : undefined,
      authMode,
      gatewayToken,
      tailscaleMode,
      tailscaleResetOnExit,
    },
  };
}
