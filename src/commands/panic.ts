import { executePanic, isPanicMode, resetPanic } from "../infra/panic.js";
import { theme } from "../terminal/theme.js";

export async function panicCommand(opts: { reset?: boolean }) {
  if (opts.reset) {
    resetPanic();
    console.log(theme.success("Panic mode reset. System operational."));
    return;
  }

  if (isPanicMode()) {
    console.log(theme.error("System is already in PANIC mode."));
    return;
  }

  const success = await executePanic();
  if (success) {
    console.log("");
    console.log(theme.error("ALERTA: Modo Pânico Ativado."));
    console.log(
      theme.muted("Todas as conexões de rede e acessos à Cripta de Dados foram bloqueados."),
    );
  }
}
