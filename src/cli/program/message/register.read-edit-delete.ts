import type { Command } from "commander";
import type { MessageCliHelpers } from "./helpers.js";

export function registerMessageReadEditDeleteCommands(
  message: Command,
  helpers: MessageCliHelpers,
) {
  helpers
    .withMessageBase(
      helpers.withRequiredMessageTarget(
        message.command("read").description("Ler mensagens recentes"),
      ),
    )
    .option("--limit <n>", "Limite de resultados")
    .option("--before <id>", "Ler/pesquisar antes do ID")
    .option("--after <id>", "Ler/pesquisar depois do ID")
    .option("--around <id>", "Ler em torno do ID")
    .option("--include-thread", "Incluir respostas de thread (Discord)", false)
    .action(async (opts) => {
      await helpers.runMessageAction("read", opts);
    });

  helpers
    .withMessageBase(
      helpers.withRequiredMessageTarget(
        message
          .command("edit")
          .description("Editar uma mensagem")
          .requiredOption("--message-id <id>", "ID da mensagem")
          .requiredOption("-m, --message <text>", "Corpo da mensagem"),
      ),
    )
    .option("--thread-id <id>", "ID da thread (fórum do Telegram)")
    .action(async (opts) => {
      await helpers.runMessageAction("edit", opts);
    });

  helpers
    .withMessageBase(
      helpers.withRequiredMessageTarget(
        message
          .command("delete")
          .description("Deletar uma mensagem")
          .requiredOption("--message-id <id>", "ID da mensagem"),
      ),
    )
    .action(async (opts) => {
      await helpers.runMessageAction("delete", opts);
    });
}
