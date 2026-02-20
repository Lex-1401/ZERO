import type { Command } from "commander";
import { CHANNEL_TARGETS_DESCRIPTION } from "../../../infra/outbound/channel-target.js";
import type { MessageCliHelpers } from "./helpers.js";

export function registerMessageBroadcastCommand(message: Command, helpers: MessageCliHelpers) {
  helpers
    .withMessageBase(
      message.command("broadcast").description("Transmitir uma mensagem para múltiplos alvos"),
    )
    .requiredOption("--targets <target...>", CHANNEL_TARGETS_DESCRIPTION)
    .option("--message <text>", "Mensagem para enviar")
    .option("--media <url>", "URL da mídia")
    .action(async (options: Record<string, unknown>) => {
      await helpers.runMessageAction("broadcast", options);
    });
}
