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

  if (warnings.length > 0) {
    note(warnings.join("\n"), "Instalação");
  }
}
