import type { Command } from "commander";
import { collectOption } from "../helpers.js";
import type { MessageCliHelpers } from "./helpers.js";

export function registerMessagePollCommand(message: Command, helpers: MessageCliHelpers) {
  helpers
    .withMessageBase(
      helpers.withRequiredMessageTarget(message.command("poll").description("Enviar uma enquete")),
    )
    .requiredOption("--poll-question <text>", "Pergunta da enquete")
    .option(
      "--poll-option <choice>",
      "Opção da enquete (repetir 2 a 12 vezes)",
      collectOption,
      [] as string[],
    )
    .option("--poll-multi", "Permitir múltiplas seleções", false)
    .option("--poll-duration-hours <n>", "Duração da enquete em horas (Discord)")
    .option("-m, --message <text>", "Corpo da mensagem opcional")
    .action(async (opts) => {
      await helpers.runMessageAction("poll", opts);
    });
}
