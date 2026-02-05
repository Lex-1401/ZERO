import type { Command } from "commander";
import type { MessageCliHelpers } from "./helpers.js";

export function registerMessageReactionsCommands(message: Command, helpers: MessageCliHelpers) {
  helpers
    .withMessageBase(
      helpers.withRequiredMessageTarget(
        message.command("react").description("Adicionar ou remover uma reação"),
      ),
    )
    .requiredOption("--message-id <id>", "ID da mensagem")
    .option("--emoji <emoji>", "Emoji para reações")
    .option("--remove", "Remover reação", false)
    .option("--participant <id>", "Participante da reação no WhatsApp")
    .option("--from-me", "Reação vinda de mim no WhatsApp", false)
    .option("--target-author <id>", "Autor alvo da reação no Signal (uuid ou telefone)")
    .option("--target-author-uuid <uuid>", "UUID do autor alvo da reação no Signal")
    .action(async (opts) => {
      await helpers.runMessageAction("react", opts);
    });

  helpers
    .withMessageBase(
      helpers.withRequiredMessageTarget(
        message.command("reactions").description("Listar reações em uma mensagem"),
      ),
    )
    .requiredOption("--message-id <id>", "ID da mensagem")
    .option("--limit <n>", "Limite de resultados")
    .action(async (opts) => {
      await helpers.runMessageAction("reactions", opts);
    });
}
