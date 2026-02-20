import type { Command } from "commander";
import type { MessageCliHelpers } from "./helpers.js";

export function registerMessageThreadCommands(message: Command, helpers: MessageCliHelpers) {
  const thread = message.command("thread").description("Ações de thread");

  helpers
    .withMessageBase(
      helpers.withRequiredMessageTarget(
        thread
          .command("create")
          .description("Criar uma thread")
          .requiredOption("--thread-name <name>", "Nome da thread"),
      ),
    )
    .option("--message-id <id>", "ID da mensagem (opcional)")
    .option("--auto-archive-min <n>", "Minutos para auto-arquivamento da thread")
    .action(async (opts) => {
      await helpers.runMessageAction("thread-create", opts);
    });

  helpers
    .withMessageBase(
      thread
        .command("list")
        .description("Listar threads")
        .requiredOption("--guild-id <id>", "ID do servidor (guild)"),
    )
    .option("--channel-id <id>", "ID do canal")
    .option("--include-archived", "Incluir threads arquivadas", false)
    .option("--before <id>", "Ler/pesquisar antes do ID")
    .option("--limit <n>", "Limite de resultados")
    .action(async (opts) => {
      await helpers.runMessageAction("thread-list", opts);
    });

  helpers
    .withMessageBase(
      helpers.withRequiredMessageTarget(
        thread
          .command("reply")
          .description("Responder em uma thread")
          .requiredOption("-m, --message <text>", "Corpo da mensagem"),
      ),
    )
    .option(
      "--media <path-or-url>",
      "Anexar mídia (imagem/áudio/vídeo/documento). Aceita caminhos locais ou URLs.",
    )
    .option("--reply-to <id>", "ID da mensagem para responder")
    .action(async (opts) => {
      await helpers.runMessageAction("thread-reply", opts);
    });
}
