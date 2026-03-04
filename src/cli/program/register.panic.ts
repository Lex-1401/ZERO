import type { Command } from "commander";
import { panicCommand } from "../../commands/panic.js";

export function registerPanicCommand(program: Command) {
  program
    .command("panic")
    .description("CORTAR TUDO: Aciona o modo de emergência para bloquear dados e rede.")
    .option("--reset", "Reiniciar o sistema após um pânico (requer autorização).")
    .action(async (opts) => {
      await panicCommand(opts);
    });
}
