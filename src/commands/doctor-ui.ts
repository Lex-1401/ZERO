import fs from "node:fs/promises";
import path from "node:path";
import { resolveZEROPackageRoot } from "../infra/zero-root.js";
import { runCommandWithTimeout } from "../process/exec.js";
import type { RuntimeEnv } from "../runtime.js";
import { note } from "../terminal/note.js";
import type { DoctorPrompter } from "./doctor-prompter.js";

export async function maybeRepairUiProtocolFreshness(
  _runtime: RuntimeEnv,
  prompter: DoctorPrompter,
) {
  const root = await resolveZEROPackageRoot({
    moduleUrl: import.meta.url,
    argv1: process.argv[1],
    cwd: process.cwd(),
  });

  if (!root) return;

  const schemaPath = path.join(root, "src/gateway/protocol/schema.ts");
  const uiIndexPath = path.join(root, "dist/control-ui/index.html");

  try {
    const [schemaStats, uiStats] = await Promise.all([
      fs.stat(schemaPath).catch(() => null),
      fs.stat(uiIndexPath).catch(() => null),
    ]);

    if (schemaStats && !uiStats) {
      note(
        [
          "- Os arquivos da interface de controle (Control UI) estão ausentes.",
          "- Execute: pnpm ui:build",
        ].join("\n"),
        "UI",
      );

      // In slim/docker environments we may not have the UI source tree. Trying
      // to build would fail (and spam logs), so skip the interactive repair.
      const uiSourcesPath = path.join(root, "ui/package.json");
      const uiSourcesExist = await fs.stat(uiSourcesPath).catch(() => null);
      if (!uiSourcesExist) {
        note("Pulando a compilação da UI: fontes da pasta ui/ não presentes.", "UI");
        return;
      }

      const shouldRepair = await prompter.confirmRepair({
        message: "Compilar os arquivos da interface de controle (Control UI) agora?",
        initialValue: true,
      });

      if (shouldRepair) {
        note(
          "Compilando arquivos da interface de controle (Control UI)... (isso pode levar um momento)",
          "UI",
        );
        const uiScriptPath = path.join(root, "scripts/ui.js");
        const buildResult = await runCommandWithTimeout([process.execPath, uiScriptPath, "build"], {
          cwd: root,
          timeoutMs: 120_000,
          env: { ...process.env, FORCE_COLOR: "1" },
        });
        if (buildResult.code === 0) {
          note("Compilação da UI concluída.", "UI");
        } else {
          const details = [
            `A compilação da UI falhou (saída ${buildResult.code ?? "desconhecida"}).`,
            buildResult.stderr.trim() ? buildResult.stderr.trim() : null,
          ]
            .filter(Boolean)
            .join("\n");
          note(details, "UI");
        }
      }
      return;
    }

    if (!schemaStats || !uiStats) return;

    if (schemaStats.mtime > uiStats.mtime) {
      const uiMtimeIso = uiStats.mtime.toISOString();
      // Find changes since the UI build
      const gitLog = await runCommandWithTimeout(
        [
          "git",
          "-C",
          root,
          "log",
          `--since=${uiMtimeIso}`,
          "--format=%h %s",
          "src/gateway/protocol/schema.ts",
        ],
        { timeoutMs: 5000 },
      ).catch(() => null);

      if (gitLog && gitLog.code === 0 && gitLog.stdout.trim()) {
        note(
          `Os arquivos da UI são mais antigos que o esquema do protocolo.\nAlterações funcionais desde a última compilação:\n${gitLog.stdout
            .trim()
            .split("\n")
            .map((l) => `- ${l}`)
            .join("\n")}`,
          "Atualização da UI",
        );

        const shouldRepair = await prompter.confirmAggressive({
          message:
            "Recompilar a UI agora? (Detectada divergência de protocolo exigindo atualização)",
          initialValue: true,
        });

        if (shouldRepair) {
          const uiSourcesPath = path.join(root, "ui/package.json");
          const uiSourcesExist = await fs.stat(uiSourcesPath).catch(() => null);
          if (!uiSourcesExist) {
            note("Pulando a recompilação da UI: fontes da pasta ui/ não presentes.", "UI");
            return;
          }

          note("Recompilando arquivos de UI obsoletos... (isso pode levar um momento)", "UI");
          // Use scripts/ui.js to build, assuming node is available as we are running in it.
          // We use the same node executable to run the script.
          const uiScriptPath = path.join(root, "scripts/ui.js");
          const buildResult = await runCommandWithTimeout(
            [process.execPath, uiScriptPath, "build"],
            {
              cwd: root,
              timeoutMs: 120_000,
              env: { ...process.env, FORCE_COLOR: "1" },
            },
          );
          if (buildResult.code === 0) {
            note("Recompilação da UI concluída.", "UI");
          } else {
            const details = [
              `A recompilação da UI falhou (saída ${buildResult.code ?? "desconhecida"}).`,
              buildResult.stderr.trim() ? buildResult.stderr.trim() : null,
            ]
              .filter(Boolean)
              .join("\n");
            note(details, "UI");
          }
        }
      }
    }
  } catch {
    // If files don't exist, we can't check.
    // If git fails, we silently skip.
    // runtime.debug(`UI freshness check failed: ${String(err)}`);
  }
}
