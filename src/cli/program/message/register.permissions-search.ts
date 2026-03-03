import type { Command } from "commander";
import { collectOption } from "../helpers.js";
import type { MessageCliHelpers } from "./helpers.js";

export function registerMessagePermissionsCommand(message: Command, helpers: MessageCliHelpers) {
  helpers
    .withMessageBase(
      helpers.withRequiredMessageTarget(
        message.command("permissions").description("Buscar permissões do canal"),
      ),
    )
    .action(async (opts) => {
      await helpers.runMessageAction("permissions", opts);
    });
}

export function registerMessageSearchCommand(message: Command, helpers: MessageCliHelpers) {
  helpers
    .withMessageBase(message.command("search").description("Pesquisar mensagens do Discord"))
    .requiredOption("--guild-id <id>", "ID do servidor (guild)")
    .requiredOption("--query <text>", "Consulta de pesquisa")
    .option("--channel-id <id>", "ID do canal")
    .option("--channel-ids <id>", "ID do canal (repetível)", collectOption, [] as string[])
    .option("--author-id <id>", "ID do autor")
    .option("--author-ids <id>", "ID do autor (repetível)", collectOption, [] as string[])
    .option("--limit <n>", "Limite de resultados")
    .action(async (opts) => {
      await helpers.runMessageAction("search", opts);
    });
}
