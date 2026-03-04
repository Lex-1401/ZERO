import type { Command } from "commander";
import { formatDocsLink } from "../../terminal/links.js";
import { theme } from "../../terminal/theme.js";
import { formatHelpExamples } from "../help-format.js";
import type { ProgramContext } from "./context.js";
import { createMessageCliHelpers } from "./message/helpers.js";
import { registerMessageDiscordAdminCommands } from "./message/register.discord-admin.js";
import {
  registerMessageEmojiCommands,
  registerMessageStickerCommands,
} from "./message/register.emoji-sticker.js";
import {
  registerMessagePermissionsCommand,
  registerMessageSearchCommand,
} from "./message/register.permissions-search.js";
import { registerMessagePinCommands } from "./message/register.pins.js";
import { registerMessagePollCommand } from "./message/register.poll.js";
import { registerMessageReactionsCommands } from "./message/register.reactions.js";
import { registerMessageReadEditDeleteCommands } from "./message/register.read-edit-delete.js";
import { registerMessageSendCommand } from "./message/register.send.js";
import { registerMessageThreadCommands } from "./message/register.thread.js";
import { registerMessageBroadcastCommand } from "./message/register.broadcast.js";

export function registerMessageCommands(program: Command, ctx: ProgramContext) {
  const message = program
    .command("message")
    .description("Enviar mensagens e ações de canal")
    .addHelpText(
      "after",
      () =>
        `
${theme.heading("Exemplos:")}
${formatHelpExamples([
  ['zero message send --target +15555550123 --message "Oi"', "Enviar uma mensagem de texto."],
  [
    'zero message send --target +15555550123 --message "Oi" --media photo.jpg',
    "Enviar uma mensagem com mídia.",
  ],
  [
    'zero message poll --channel discord --target channel:123 --poll-question "Lanche?" --poll-option Pizza --poll-option Sushi',
    "Criar uma enquete no Discord.",
  ],
  [
    'zero message react --channel discord --target 123 --message-id 456 --emoji "✅"',
    "Reagir a uma mensagem.",
  ],
])}

${theme.muted("Docs:")} ${formatDocsLink("/cli/message", "docs.zero.local/cli/message")}`,
    )
    .action(() => {
      message.help({ error: true });
    });

  const helpers = createMessageCliHelpers(message, ctx.messageChannelOptions);
  registerMessageSendCommand(message, helpers);
  registerMessageBroadcastCommand(message, helpers);
  registerMessagePollCommand(message, helpers);
  registerMessageReactionsCommands(message, helpers);
  registerMessageReadEditDeleteCommands(message, helpers);
  registerMessagePinCommands(message, helpers);
  registerMessagePermissionsCommand(message, helpers);
  registerMessageSearchCommand(message, helpers);
  registerMessageThreadCommands(message, helpers);
  registerMessageEmojiCommands(message, helpers);
  registerMessageStickerCommands(message, helpers);
  registerMessageDiscordAdminCommands(message, helpers);
}
