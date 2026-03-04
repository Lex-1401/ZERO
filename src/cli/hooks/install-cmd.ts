/**
 * Hooks Install CLI Command
 *
 * Registers the `hooks install <path-or-spec>` subcommand for installing
 * hook packages from npm, archives, or local paths.
 *
 * @module cli/hooks/install-cmd
 */
import { type Command } from "commander";

export function registerHooksInstall(hooks: Command) {
    hooks
        .command("install <path-or-spec>")
        .description("Instalar um pacote de hooks")
        .option("-l, --link", "Vincular um caminho local", false)
        .action(async (_raw: string, _opts: { link?: boolean }) => {
            // TODO: Implementar lógica de instalação de hooks
            console.log("[hooks] install: not yet implemented in modular CLI");
        });
}
