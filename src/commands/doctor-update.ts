import { runGatewayUpdate } from "../infra/update-runner.js";
import { isTruthyEnvValue } from "../infra/env.js";
import { runCommandWithTimeout } from "../process/exec.js";
import type { RuntimeEnv } from "../runtime.js";
import { note } from "../terminal/note.js";
import { formatCliCommand } from "../cli/command-format.js";
import type { DoctorOptions } from "./doctor-prompter.js";

async function detectZEROGitCheckout(root: string): Promise<"git" | "not-git" | "unknown"> {
  const res = await runCommandWithTimeout(["git", "-C", root, "rev-parse", "--show-toplevel"], {
    timeoutMs: 5000,
  }).catch(() => null);
  if (!res) return "unknown";
  if (res.code !== 0) {
    // Avoid noisy "Update via package manager" notes when git is missing/broken,
    // but do show it when this is clearly not a git checkout.
    if (res.stderr.toLowerCase().includes("not a git repository")) {
      return "not-git";
    }
    return "unknown";
  }
  return res.stdout.trim() === root ? "git" : "not-git";
}

export async function maybeOfferUpdateBeforeDoctor(params: {
  runtime: RuntimeEnv;
  options: DoctorOptions;
  root: string | null;
  confirm: (p: { message: string; initialValue: boolean }) => Promise<boolean>;
  outro: (message: string) => void;
}) {
  const updateInProgress = isTruthyEnvValue(process.env.ZERO_UPDATE_IN_PROGRESS);
  const canOfferUpdate =
    !updateInProgress &&
    params.options.nonInteractive !== true &&
    params.options.yes !== true &&
    params.options.repair !== true &&
    Boolean(process.stdin.isTTY);
  if (!canOfferUpdate || !params.root) return { updated: false };

  const git = await detectZEROGitCheckout(params.root);
  if (git === "git") {
    const shouldUpdate = await params.confirm({
      message: "Atualizar o ZERO via git antes de executar o doctor?",
      initialValue: true,
    });
    if (!shouldUpdate) return { updated: false };
    note("Executando atualização (fetch/rebase/build/ui:build/doctor)…", "Atualização");
    const result = await runGatewayUpdate({
      cwd: params.root,
      argv1: process.argv[1],
    });
    note(
      [
        `Status: ${result.status}`,
        `Modo: ${result.mode}`,
        result.root ? `Raiz: ${result.root}` : null,
        result.reason ? `Motivo: ${result.reason}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      "Resultado da atualização",
    );
    if (result.status === "ok") {
      params.outro("Atualização concluída (o doctor já foi executado como parte da atualização).");
      return { updated: true, handled: true };
    }
    return { updated: true, handled: false };
  }

  if (git === "not-git") {
    note(
      [
        "Esta instalação não é um checkout do git.",
        `Execute \`${formatCliCommand("zero update")}\` para atualizar através do seu gerenciador de pacotes (npm/pnpm) e, em seguida, execute o doctor novamente.`,
      ].join("\n"),
      "Atualização",
    );
  }

  return { updated: false };
}
