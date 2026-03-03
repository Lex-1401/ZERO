import type { Command } from "commander";
import type { MessageCliHelpers } from "./helpers.js";

export function registerMessageSendCommand(message: Command, helpers: MessageCliHelpers) {
  helpers
    .withMessageBase(
      helpers
        .withRequiredMessageTarget(
          message
            .command("send")
            .description("Enviar uma mensagem")
            .option(
              "-m, --message <text>",
              "Corpo da mensagem (obrigatório a menos que --media esteja definido)",
            ),
        )
        .option(
          "--media <path-or-url>",
          "Anexar mídia (imagem/áudio/vídeo/documento). Aceita caminhos locais ou URLs.",
        )
        .option(
          "--buttons <json>",
          "Botões de teclado inline do Telegram como JSON (array de linhas de botões)",
        )
        .option("--card <json>", "Objeto JSON de Cartão Adaptativo (quando suportado pelo canal)")
        .option("--reply-to <id>", "ID da mensagem para responder")
        .option("--thread-id <id>", "ID da thread (fórum do Telegram)")
        .option(
          "--gif-playback",
          "Tratar mídia de vídeo como reprodução de GIF (apenas WhatsApp).",
          false,
        ),
    )
    .action(async (opts) => {
      await helpers.runMessageAction("send", opts);
    });
}
