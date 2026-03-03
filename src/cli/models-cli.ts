import type { Command } from "commander";

import {
  githubCopilotLoginCommand,
  modelsAliasesAddCommand,
  modelsAliasesListCommand,
  modelsAliasesRemoveCommand,
  modelsAuthAddCommand,
  modelsAuthLoginCommand,
  modelsAuthOrderClearCommand,
  modelsAuthOrderGetCommand,
  modelsAuthOrderSetCommand,
  modelsAuthPasteTokenCommand,
  modelsAuthSetupTokenCommand,
  modelsFallbacksAddCommand,
  modelsFallbacksClearCommand,
  modelsFallbacksListCommand,
  modelsFallbacksRemoveCommand,
  modelsImageFallbacksAddCommand,
  modelsImageFallbacksClearCommand,
  modelsImageFallbacksListCommand,
  modelsImageFallbacksRemoveCommand,
  modelsListCommand,
  modelsScanCommand,
  modelsSetCommand,
  modelsSetImageCommand,
  modelsStatusCommand,
  modelsInstallCommand,
} from "../commands/models.js";
import { defaultRuntime } from "../runtime.js";
import { formatDocsLink } from "../terminal/links.js";
import { theme } from "../terminal/theme.js";
import { runCommandWithRuntime } from "./cli-utils.js";

function runModelsCommand(action: () => Promise<void>) {
  return runCommandWithRuntime(defaultRuntime, action);
}

export function registerModelsCli(program: Command) {
  const models = program
    .command("models")
    .description("Descoberta, escaneamento e configuração de modelos")
    .option("--status-json", "Saída JSON (alias para `models status --json`)", false)
    .option("--status-plain", "Saída simples (alias para `models status --plain`)", false)
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/models", "docs.zero.local/cli/models")}\n`,
    );

  models
    .command("list")
    .description("Listar modelos (configurados por padrão)")
    .option("--all", "Mostrar catálogo completo de modelos", false)
    .option("--local", "Filtrar para modelos locais", false)
    .option("--provider <name>", "Filtrar por provedor")
    .option("--json", "Saída JSON", false)
    .option("--plain", "Saída em linha simples", false)
    .action(async (opts) => {
      await runModelsCommand(async () => {
        await modelsListCommand(opts, defaultRuntime);
      });
    });

  models
    .command("status")
    .description("Mostrar estado dos modelos configurados")
    .option("--json", "Saída JSON", false)
    .option("--plain", "Saída simples", false)
    .option(
      "--check",
      "Sair com erro se a autenticação estiver expirando/expirada (1=expirada/ausente, 2=expirando)",
      false,
    )
    .option("--probe", "Sondar autenticação do provedor (ao vivo)", false)
    .option("--probe-provider <name>", "Sondar apenas um único provedor")
    .option(
      "--probe-profile <id>",
      "Sondar apenas IDs de perfil de autenticação específicos (repetível ou separado por vírgula)",
      (value, previous) => {
        const next = Array.isArray(previous) ? previous : previous ? [previous] : [];
        next.push(value);
        return next;
      },
    )
    .option("--probe-timeout <ms>", "Tempo limite por sonda em ms")
    .option("--probe-concurrency <n>", "Proporção de sondas simultâneas")
    .option("--probe-max-tokens <n>", "Máximo de tokens por sonda (esforço máximo)")
    .action(async (opts) => {
      await runModelsCommand(async () => {
        await modelsStatusCommand(
          {
            json: Boolean(opts.json),
            plain: Boolean(opts.plain),
            check: Boolean(opts.check),
            probe: Boolean(opts.probe),
            probeProvider: opts.probeProvider as string | undefined,
            probeProfile: opts.probeProfile as string | string[] | undefined,
            probeTimeout: opts.probeTimeout as string | undefined,
            probeConcurrency: opts.probeConcurrency as string | undefined,
            probeMaxTokens: opts.probeMaxTokens as string | undefined,
          },
          defaultRuntime,
        );
      });
    });

  models
    .command("install")
    .description("Instalar um modelo local via Ollama")
    .argument("<model>", "Nome do modelo (ex: llama3)")
    .action(async (model: string) => {
      await runModelsCommand(async () => {
        await modelsInstallCommand(model, defaultRuntime);
      });
    });

  models
    .command("set")
    .description("Definir o modelo padrão")
    .argument("<model>", "ID ou alias do modelo")
    .action(async (model: string) => {
      await runModelsCommand(async () => {
        await modelsSetCommand(model, defaultRuntime);
      });
    });

  models
    .command("set-image")
    .description("Definir o modelo de imagem")
    .argument("<model>", "ID ou alias do modelo")
    .action(async (model: string) => {
      await runModelsCommand(async () => {
        await modelsSetImageCommand(model, defaultRuntime);
      });
    });

  const aliases = models.command("aliases").description("Gerenciar aliases de modelos");

  aliases
    .command("list")
    .description("Listar aliases de modelos")
    .option("--json", "Saída JSON", false)
    .option("--plain", "Saída simples", false)
    .action(async (opts) => {
      await runModelsCommand(async () => {
        await modelsAliasesListCommand(opts, defaultRuntime);
      });
    });

  aliases
    .command("add")
    .description("Adicionar ou atualizar um alias de modelo")
    .argument("<alias>", "Nome do alias")
    .argument("<model>", "ID ou alias do modelo")
    .action(async (alias: string, model: string) => {
      await runModelsCommand(async () => {
        await modelsAliasesAddCommand(alias, model, defaultRuntime);
      });
    });

  aliases
    .command("remove")
    .description("Remover um alias de modelo")
    .argument("<alias>", "Nome do alias")
    .action(async (alias: string) => {
      await runModelsCommand(async () => {
        await modelsAliasesRemoveCommand(alias, defaultRuntime);
      });
    });

  const fallbacks = models
    .command("fallbacks")
    .description("Gerenciar lista de fallbacks de modelos");

  fallbacks
    .command("list")
    .description("Listar modelos de fallback")
    .option("--json", "Saída JSON", false)
    .option("--plain", "Saída simples", false)
    .action(async (opts) => {
      await runModelsCommand(async () => {
        await modelsFallbacksListCommand(opts, defaultRuntime);
      });
    });

  fallbacks
    .command("add")
    .description("Adicionar um modelo de fallback")
    .argument("<model>", "ID ou alias do modelo")
    .action(async (model: string) => {
      await runModelsCommand(async () => {
        await modelsFallbacksAddCommand(model, defaultRuntime);
      });
    });

  fallbacks
    .command("remove")
    .description("Remover um modelo de fallback")
    .argument("<model>", "ID ou alias do modelo")
    .action(async (model: string) => {
      await runModelsCommand(async () => {
        await modelsFallbacksRemoveCommand(model, defaultRuntime);
      });
    });

  fallbacks
    .command("clear")
    .description("Limpar todos os modelos de fallback")
    .action(async () => {
      await runModelsCommand(async () => {
        await modelsFallbacksClearCommand(defaultRuntime);
      });
    });

  const imageFallbacks = models
    .command("image-fallbacks")
    .description("Gerenciar lista de fallbacks de modelos de imagem");

  imageFallbacks
    .command("list")
    .description("Listar modelos de fallback de imagem")
    .option("--json", "Saída JSON", false)
    .option("--plain", "Saída simples", false)
    .action(async (opts) => {
      await runModelsCommand(async () => {
        await modelsImageFallbacksListCommand(opts, defaultRuntime);
      });
    });

  imageFallbacks
    .command("add")
    .description("Adicionar um modelo de fallback de imagem")
    .argument("<model>", "ID ou alias do modelo")
    .action(async (model: string) => {
      await runModelsCommand(async () => {
        await modelsImageFallbacksAddCommand(model, defaultRuntime);
      });
    });

  imageFallbacks
    .command("remove")
    .description("Remover um modelo de fallback de imagem")
    .argument("<model>", "ID ou alias do modelo")
    .action(async (model: string) => {
      await runModelsCommand(async () => {
        await modelsImageFallbacksRemoveCommand(model, defaultRuntime);
      });
    });

  imageFallbacks
    .command("clear")
    .description("Limpar todos os modelos de fallback de imagem")
    .action(async () => {
      await runModelsCommand(async () => {
        await modelsImageFallbacksClearCommand(defaultRuntime);
      });
    });

  models
    .command("scan")
    .description("Escanear modelos gratuitos do OpenRouter para ferramentas + imagens")
    .option("--min-params <b>", "Tamanho mínimo de parâmetros (bilhões)")
    .option("--max-age-days <days>", "Pular modelos mais antigos que N dias")
    .option("--provider <name>", "Filtrar por prefixo de provedor")
    .option("--max-candidates <n>", "Máximo de candidatos de fallback", "6")
    .option("--timeout <ms>", "Timeout por sonda em ms")
    .option("--concurrency <n>", "Concorrência de sondas")
    .option("--no-probe", "Pular sondas ao vivo; listar apenas candidatos gratuitos")
    .option("--yes", "Aceitar padrões sem perguntar", false)
    .option("--no-input", "Desabilitar prompts (usar padrões)")
    .option("--set-default", "Definir agents.defaults.model para a primeira seleção", false)
    .option(
      "--set-image",
      "Definir agents.defaults.imageModel para a primeira seleção de imagem",
      false,
    )
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runModelsCommand(async () => {
        await modelsScanCommand(opts, defaultRuntime);
      });
    });

  models.action(async (opts) => {
    await runModelsCommand(async () => {
      await modelsStatusCommand(
        {
          json: Boolean(opts?.statusJson),
          plain: Boolean(opts?.statusPlain),
        },
        defaultRuntime,
      );
    });
  });

  const auth = models.command("auth").description("Gerenciar perfis de autenticação de modelos");

  auth
    .command("add")
    .description("Assistente de autenticação interativo (setup-token ou colar token)")
    .action(async () => {
      await runModelsCommand(async () => {
        await modelsAuthAddCommand({}, defaultRuntime);
      });
    });

  auth
    .command("login")
    .description("Executar fluxo de autenticação de plugin do provedor (OAuth/API key)")
    .option("--provider <id>", "ID do provedor registrado por um plugin")
    .option("--method <id>", "ID do método de autenticação do provedor")
    .option("--set-default", "Aplicar recomendação de modelo padrão do provedor", false)
    .action(async (opts) => {
      await runModelsCommand(async () => {
        await modelsAuthLoginCommand(
          {
            provider: opts.provider as string | undefined,
            method: opts.method as string | undefined,
            setDefault: Boolean(opts.setDefault),
          },
          defaultRuntime,
        );
      });
    });

  auth
    .command("setup-token")
    .description("Executar CLI do provedor para criar/sincronizar um token (TTY necessário)")
    .option("--provider <name>", "ID do provedor (padrão: anthropic)")
    .option("--yes", "Pular confirmação", false)
    .action(async (opts) => {
      await runModelsCommand(async () => {
        await modelsAuthSetupTokenCommand(
          {
            provider: opts.provider as string | undefined,
            yes: Boolean(opts.yes),
          },
          defaultRuntime,
        );
      });
    });

  auth
    .command("paste-token")
    .description("Colar um token no auth-profiles.json e atualizar config")
    .requiredOption("--provider <name>", "ID do provedor (ex: anthropic)")
    .option("--profile-id <id>", "ID do perfil de autenticação (padrão: <provider>:manual)")
    .option(
      "--expires-in <duration>",
      "Duração opcional de expiração (ex: 365d, 12h). Armazenado como expiresAt absoluto.",
    )
    .action(async (opts) => {
      await runModelsCommand(async () => {
        await modelsAuthPasteTokenCommand(
          {
            provider: opts.provider as string | undefined,
            profileId: opts.profileId as string | undefined,
            expiresIn: opts.expiresIn as string | undefined,
          },
          defaultRuntime,
        );
      });
    });

  auth
    .command("login-github-copilot")
    .description("Login no GitHub Copilot via fluxo de dispositivo GitHub (TTY necessário)")
    .option("--profile-id <id>", "ID do perfil de autenticação (padrão: github-copilot:github)")
    .option("--yes", "Sobrescrever perfil existente sem perguntar", false)
    .action(async (opts) => {
      await runModelsCommand(async () => {
        await githubCopilotLoginCommand(
          {
            profileId: opts.profileId as string | undefined,
            yes: Boolean(opts.yes),
          },
          defaultRuntime,
        );
      });
    });

  const order = auth
    .command("order")
    .description("Gerenciar sobreposições de ordem de perfil de autenticação por agente");

  order
    .command("get")
    .description("Mostrar sobreposição de ordem de autenticação por agente (de auth-profiles.json)")
    .requiredOption("--provider <name>", "ID do provedor (ex: anthropic)")
    .option("--agent <id>", "ID do agente (padrão: agente configurado como padrão)")
    .option("--json", "Saída JSON", false)
    .action(async (opts) => {
      await runModelsCommand(async () => {
        await modelsAuthOrderGetCommand(
          {
            provider: opts.provider as string,
            agent: opts.agent as string | undefined,
            json: Boolean(opts.json),
          },
          defaultRuntime,
        );
      });
    });

  order
    .command("set")
    .description(
      "Definir sobreposição de ordem de autenticação por agente (trava a rotação nesta lista)",
    )
    .requiredOption("--provider <name>", "ID do provedor (ex: anthropic)")
    .option("--agent <id>", "ID do agente (padrão: agente configurado como padrão)")
    .argument("<profileIds...>", "IDs de perfis de autenticação (ex: anthropic:claude-cli)")
    .action(async (profileIds: string[], opts) => {
      await runModelsCommand(async () => {
        await modelsAuthOrderSetCommand(
          {
            provider: opts.provider as string,
            agent: opts.agent as string | undefined,
            order: profileIds,
          },
          defaultRuntime,
        );
      });
    });

  order
    .command("clear")
    .description(
      "Limpar sobreposição de ordem de autenticação por agente (voltar para config/round-robin)",
    )
    .requiredOption("--provider <name>", "ID do provedor (ex: anthropic)")
    .option("--agent <id>", "ID do agente (padrão: agente configurado como padrão)")
    .action(async (opts) => {
      await runModelsCommand(async () => {
        await modelsAuthOrderClearCommand(
          {
            provider: opts.provider as string,
            agent: opts.agent as string | undefined,
          },
          defaultRuntime,
        );
      });
    });
}
