
/**
 * Discord Native Command Monitor
 *
 * Implements native Discord slash commands for the ZERO Gateway.
 * Delegated to src/discord/monitor/native-command/ for maintainability.
 */

import { ButtonInteraction, type ComponentData } from "@buape/carbon";
import { type DiscordCommandArgContext } from "./native-command/types.js";
import { handleDiscordCommandArgInteraction, createDiscordNativeCommand } from "./native-command/handler.js";

export { createDiscordNativeCommand };

export class DiscordCommandArgFallbackButton {
  private ctx: DiscordCommandArgContext;
  constructor(ctx: DiscordCommandArgContext) { this.ctx = ctx; }
  async run(interaction: ButtonInteraction, data: ComponentData) {
    await handleDiscordCommandArgInteraction(interaction, data, this.ctx);
  }
}

export function createDiscordCommandArgFallbackButton(params: DiscordCommandArgContext) {
  return new DiscordCommandArgFallbackButton(params);
}
