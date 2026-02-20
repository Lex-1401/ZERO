import type { Command } from "commander";
import type { MessageCliHelpers } from "./helpers.js";

export function registerMessageDiscordAdminCommands(message: Command, helpers: MessageCliHelpers) {
  const role = message.command("role").description("Ações de cargo (role)");
  helpers
    .withMessageBase(
      role
        .command("info")
        .description("Listar cargos")
        .requiredOption("--guild-id <id>", "ID do servidor (guild)"),
    )
    .action(async (opts) => {
      await helpers.runMessageAction("role-info", opts);
    });

  helpers
    .withMessageBase(
      role
        .command("add")
        .description("Adicionar cargo a um membro")
        .requiredOption("--guild-id <id>", "ID do servidor (guild)")
        .requiredOption("--user-id <id>", "ID do usuário")
        .requiredOption("--role-id <id>", "ID do cargo"),
    )
    .action(async (opts) => {
      await helpers.runMessageAction("role-add", opts);
    });

  helpers
    .withMessageBase(
      role
        .command("remove")
        .description("Remover cargo de um membro")
        .requiredOption("--guild-id <id>", "ID do servidor (guild)")
        .requiredOption("--user-id <id>", "ID do usuário")
        .requiredOption("--role-id <id>", "ID do cargo"),
    )
    .action(async (opts) => {
      await helpers.runMessageAction("role-remove", opts);
    });

  const channel = message.command("channel").description("Ações de canal");
  helpers
    .withMessageBase(
      helpers.withRequiredMessageTarget(
        channel.command("info").description("Buscar informações do canal"),
      ),
    )
    .action(async (opts) => {
      await helpers.runMessageAction("channel-info", opts);
    });

  helpers
    .withMessageBase(
      channel
        .command("list")
        .description("Listar canais")
        .requiredOption("--guild-id <id>", "ID do servidor (guild)"),
    )
    .action(async (opts) => {
      await helpers.runMessageAction("channel-list", opts);
    });

  const member = message.command("member").description("Ações de membro");
  helpers
    .withMessageBase(
      member
        .command("info")
        .description("Buscar informações do membro")
        .requiredOption("--user-id <id>", "ID do usuário"),
    )
    .option("--guild-id <id>", "ID do servidor (Discord)")
    .action(async (opts) => {
      await helpers.runMessageAction("member-info", opts);
    });

  const voice = message.command("voice").description("Ações de voz");
  helpers
    .withMessageBase(
      voice
        .command("status")
        .description("Buscar status de voz")
        .requiredOption("--guild-id <id>", "ID do servidor (guild)")
        .requiredOption("--user-id <id>", "ID do usuário"),
    )
    .action(async (opts) => {
      await helpers.runMessageAction("voice-status", opts);
    });

  const event = message.command("event").description("Ações de evento");
  helpers
    .withMessageBase(
      event
        .command("list")
        .description("Listar eventos agendados")
        .requiredOption("--guild-id <id>", "ID do servidor (guild)"),
    )
    .action(async (opts) => {
      await helpers.runMessageAction("event-list", opts);
    });

  helpers
    .withMessageBase(
      event
        .command("create")
        .description("Criar um evento agendado")
        .requiredOption("--guild-id <id>", "ID do servidor (guild)")
        .requiredOption("--event-name <name>", "Nome do evento")
        .requiredOption("--start-time <iso>", "Horário de início do evento"),
    )
    .option("--end-time <iso>", "Horário de término do evento")
    .option("--desc <text>", "Descrição do evento")
    .option("--channel-id <id>", "ID do canal")
    .option("--location <text>", "Localização do evento")
    .option("--event-type <stage|external|voice>", "Tipo de evento")
    .action(async (opts) => {
      await helpers.runMessageAction("event-create", opts);
    });

  helpers
    .withMessageBase(
      message
        .command("timeout")
        .description("Aplicar timeout a um membro")
        .requiredOption("--guild-id <id>", "ID do servidor (guild)")
        .requiredOption("--user-id <id>", "ID do usuário"),
    )
    .option("--duration-min <n>", "Duração do timeout em minutos")
    .option("--until <iso>", "Timeout até")
    .option("--reason <text>", "Motivo da moderação")
    .action(async (opts) => {
      await helpers.runMessageAction("timeout", opts);
    });

  helpers
    .withMessageBase(
      message
        .command("kick")
        .description("Kickar um membro")
        .requiredOption("--guild-id <id>", "ID do servidor (guild)")
        .requiredOption("--user-id <id>", "ID do usuário"),
    )
    .option("--reason <text>", "Motivo da moderação")
    .action(async (opts) => {
      await helpers.runMessageAction("kick", opts);
    });

  helpers
    .withMessageBase(
      message
        .command("ban")
        .description("Banir um membro")
        .requiredOption("--guild-id <id>", "ID do servidor (guild)")
        .requiredOption("--user-id <id>", "ID do usuário"),
    )
    .option("--reason <text>", "Motivo da moderação")
    .option("--delete-days <n>", "Dias de mensagens para deletar no banimento")
    .action(async (opts) => {
      await helpers.runMessageAction("ban", opts);
    });
}
