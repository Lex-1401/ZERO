import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_AGENTS_FILENAME,
  DEFAULT_IDENTITY_FILENAME,
  DEFAULT_SOUL_FILENAME,
  DEFAULT_USER_FILENAME,
} from "../agents/workspace.js";
import { shortenHomePath } from "../utils.js";

export const MEMORY_SYSTEM_PROMPT = [
  "Sistema de memória não encontrado no workspace.",
  "Cole isto em seu agente:",
  "",
  "Instale o sistema de memória aplicando:",
  "https://github.com/zero/zero/commit/9ffea23f31ca1df5183b25668f8f814bee0fb34e",
  "https://github.com/zero/zero/commit/7d1fee70e76f2f634f1b41fca927ee663914183a",
].join("\n");

export async function shouldSuggestMemorySystem(workspaceDir: string): Promise<boolean> {
  const memoryPaths = [path.join(workspaceDir, "MEMORY.md"), path.join(workspaceDir, "memory.md")];

  for (const memoryPath of memoryPaths) {
    try {
      await fs.promises.access(memoryPath);
      return false;
    } catch {
      // keep scanning
    }
  }

  const agentsPath = path.join(workspaceDir, DEFAULT_AGENTS_FILENAME);
  try {
    const content = await fs.promises.readFile(agentsPath, "utf-8");
    if (/memory\.md/i.test(content)) return false;
  } catch {
    // no AGENTS.md or unreadable; treat as missing memory guidance
  }

  return true;
}

export type LegacyWorkspaceDetection = {
  activeWorkspace: string;
  legacyDirs: string[];
};

function looksLikeWorkspaceDir(dir: string, exists: (value: string) => boolean) {
  const markers = [
    DEFAULT_AGENTS_FILENAME,
    DEFAULT_SOUL_FILENAME,
    DEFAULT_USER_FILENAME,
    DEFAULT_IDENTITY_FILENAME,
  ];
  return markers.some((name) => exists(path.join(dir, name)));
}

export function detectLegacyWorkspaceDirs(params: {
  workspaceDir: string;
  homedir?: () => string;
  exists?: (value: string) => boolean;
}): LegacyWorkspaceDetection {
  const homedir = params.homedir ?? os.homedir;
  const exists = params.exists ?? fs.existsSync;
  const home = homedir();
  const activeWorkspace = path.resolve(params.workspaceDir);
  const candidates = [path.join(home, "zero")];
  const legacyDirs = candidates
    .filter((candidate) => {
      if (!exists(candidate)) return false;
      return path.resolve(candidate) !== activeWorkspace;
    })
    .filter((candidate) => {
      return looksLikeWorkspaceDir(candidate, exists);
    });
  return { activeWorkspace, legacyDirs };
}

export function formatLegacyWorkspaceWarning(detection: LegacyWorkspaceDetection): string {
  return [
    "Diretórios de workspace extras detectados (podem conter arquivos de agentes antigos):",
    ...detection.legacyDirs.map((dir) => `- ${shortenHomePath(dir)}`),
    `Workspace ativo: ${shortenHomePath(detection.activeWorkspace)}`,
    "Se não for utilizado, arquive ou mova para o Lixo (ex: trash ~/zero).",
  ].join("\n");
}
