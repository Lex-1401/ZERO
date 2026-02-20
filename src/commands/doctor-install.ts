import fs from "node:fs";
import path from "node:path";

import { note } from "../terminal/note.js";

export function noteSourceInstallIssues(root: string | null) {
  if (!root) return;

  const workspaceMarker = path.join(root, "pnpm-workspace.yaml");
  if (!fs.existsSync(workspaceMarker)) return;

  const warnings: string[] = [];
  const nodeModules = path.join(root, "node_modules");
  const pnpmStore = path.join(nodeModules, ".pnpm");
  const tsxBin = path.join(nodeModules, ".bin", "tsx");
  const srcEntry = path.join(root, "src", "entry.ts");

  if (fs.existsSync(nodeModules) && !fs.existsSync(pnpmStore)) {
    warnings.push(
      "- node_modules não foi instalado pelo pnpm (faltando node_modules/.pnpm). Execute: pnpm install",
    );
  }

  if (fs.existsSync(path.join(root, "package-lock.json"))) {
    warnings.push(
      "- package-lock.json presente em um workspace pnpm. Se você executou npm install, remova-o e reinstale com pnpm.",
    );
  }

  if (fs.existsSync(srcEntry) && !fs.existsSync(tsxBin)) {
    warnings.push(
      "- O binário tsx está ausente para execuções de código-fonte. Execute: pnpm install",
    );
  }

  // Verificar GIT (Nova Robustez Integrada)
  const gitDir = path.join(root, ".git");
  if (!fs.existsSync(gitDir)) {
    warnings.push(
      "- Repositório GIT não inicializado ou ausente. Isso impede atualizações inteligentes e controle de versão.",
      "  Ação Corretiva: Execute 'git init' ou clone o repositório corretamente.",
    );
  }

  // Verificar módulo nativo (RATCHET)
  const rustCoreDir = path.join(root, "rust-core");
  const ratchetFiles = fs.existsSync(rustCoreDir)
    ? fs.readdirSync(rustCoreDir).filter((f) => f.startsWith("ratchet") && f.endsWith(".node"))
    : [];

  const hasAnyRatchet = ratchetFiles.length > 0;

  if (fs.existsSync(rustCoreDir) && !hasAnyRatchet) {
    warnings.push(
      "- Núcleo Nativo (rust-core) NÃO compilado. O sistema sofrerá falha crítica de runtime.",
      "  Ação Necessária: pnpm build:rust",
    );
  } else if (hasAnyRatchet) {
    // Auditoria de Arquitetura: Verifica se o binário corresponde ao ambiente
    const currentPlatform = `${process.platform}-${process.arch}`;
    const matchingBinary = ratchetFiles.find((f) => f.includes(currentPlatform));

    if (!matchingBinary && !fs.existsSync(path.join(rustCoreDir, "ratchet.node"))) {
      warnings.push(
        `- Inconsistência de Arquitetura: Binário nativo não compatível com (${currentPlatform}).`,
        "  Cenário: Migração de ambiente ou build corrompido.",
        "  Ação Necessária: pnpm build:rust",
      );
    }
  }

  if (warnings.length > 0) {
    note(warnings.join("\n"), "Shield Doctor: Diagnóstico de Instalação");
  }
}
