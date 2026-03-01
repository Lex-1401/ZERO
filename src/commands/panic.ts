import { executePanic, isPanicMode, resetPanic } from "../infra/panic.js";
import { theme } from "../terminal/theme.js";

export async function panicCommand(opts: { reset?: boolean }) {
  if (opts.reset) {
    resetPanic();

    return;
  }

  if (isPanicMode()) {
    return;
  }

  const success = await executePanic();
  if (success) {
    console.log(
      theme.muted("Todas as conexões de rede e acessos à Cripta de Dados foram bloqueados."),
    );
  }
}
