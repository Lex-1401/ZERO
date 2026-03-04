
/**
 * Hooks CLI Monitor
 *
 * Implements CLI commands for managing internal hooks in the ZERO Gateway.
 * Delegated to src/cli/hooks/ for maintainability and Atomic Modularity.
 */

import { type Command } from "commander";
import { registerHooksSubcommands } from "./hooks/register.js";
import { registerHooksInstall } from "./hooks/install-cmd.js";
import { theme } from "../terminal/theme.js";
import { formatDocsLink } from "../terminal/links.js";

export function registerHooksCli(program: Command): void {
  const hooks = program
    .command("hooks")
    .description("Gerenciar hooks internos do agente")
    .addHelpText(
      "after",
      () => `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/hooks", "docs.zero.local/cli/hooks")}\n`,
    );

  registerHooksSubcommands(hooks);
  registerHooksInstall(hooks);

  // Default action
  hooks.action(async () => {
    hooks.help();
  });
}
