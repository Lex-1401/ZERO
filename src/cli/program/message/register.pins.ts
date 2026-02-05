import type { Command } from "commander";
import type { MessageCliHelpers } from "./helpers.js";

export function registerMessagePinCommands(message: Command, helpers: MessageCliHelpers) {
  const pins = [
    helpers
      .withMessageBase(
        helpers.withRequiredMessageTarget(message.command("pin").description("Fixar uma mensagem")),
      )
      .requiredOption("--message-id <id>", "ID da mensagem")
      .action(async (opts) => {
        await helpers.runMessageAction("pin", opts);
      }),
    helpers
      .withMessageBase(
        helpers.withRequiredMessageTarget(
          message.command("unpin").description("Desafixar uma mensagem"),
        ),
      )
      .requiredOption("--message-id <id>", "ID da mensagem")
      .action(async (opts) => {
        await helpers.runMessageAction("unpin", opts);
      }),
    helpers
      .withMessageBase(
        helpers.withRequiredMessageTarget(
          message.command("pins").description("Listar mensagens fixadas"),
        ),
      )
      .option("--limit <n>", "Limite de resultados")
      .action(async (opts) => {
        await helpers.runMessageAction("list-pins", opts);
      }),
  ] as const;

  void pins;
}
