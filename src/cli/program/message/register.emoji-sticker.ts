import type { Command } from "commander";
import { collectOption } from "../helpers.js";
import type { MessageCliHelpers } from "./helpers.js";

export function registerMessageEmojiCommands(message: Command, helpers: MessageCliHelpers) {
  const emoji = message.command("emoji").description("Ações de emoji");

  helpers
    .withMessageBase(emoji.command("list").description("Listar emojis"))
    .option("--guild-id <id>", "ID do servidor (Discord)")
    .action(async (opts) => {
      await helpers.runMessageAction("emoji-list", opts);
    });

  helpers
    .withMessageBase(
      emoji
        .command("upload")
        .description("Fazer upload de um emoji")
        .requiredOption("--guild-id <id>", "ID do servidor (guild)"),
    )
    .requiredOption("--emoji-name <name>", "Nome do emoji")
    .requiredOption("--media <path-or-url>", "Mídia do emoji (caminho ou URL)")
    .option("--role-ids <id>", "ID do cargo (repetível)", collectOption, [] as string[])
    .action(async (opts) => {
      await helpers.runMessageAction("emoji-upload", opts);
    });
}

export function registerMessageStickerCommands(message: Command, helpers: MessageCliHelpers) {
  const sticker = message.command("sticker").description("Ações de figurinha (sticker)");

  helpers
    .withMessageBase(
      helpers.withRequiredMessageTarget(sticker.command("send").description("Enviar figurinhas")),
    )
    .requiredOption("--sticker-id <id>", "ID da figurinha (repetível)", collectOption)
    .option("-m, --message <text>", "Corpo da mensagem opcional")
    .action(async (opts) => {
      await helpers.runMessageAction("sticker", opts);
    });

  helpers
    .withMessageBase(
      sticker
        .command("upload")
        .description("Fazer upload de uma figurinha")
        .requiredOption("--guild-id <id>", "ID do servidor (guild)"),
    )
    .requiredOption("--sticker-name <name>", "Nome da figurinha")
    .requiredOption("--sticker-desc <text>", "Descrição da figurinha")
    .requiredOption("--sticker-tags <tags>", "Tags da figurinha")
    .requiredOption("--media <path-or-url>", "Mídia da figurinha (caminho ou URL)")
    .action(async (opts) => {
      await helpers.runMessageAction("sticker-upload", opts);
    });
}
