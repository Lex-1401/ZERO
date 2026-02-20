import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import type { ZEROConfig } from "../config/config.js";
import { resolveOAuthDir, resolveStateDir } from "../config/paths.js";
import {
  loadSessionStore,
  resolveMainSessionKey,
  resolveSessionFilePath,
  resolveSessionTranscriptsDirForAgent,
  resolveStorePath,
} from "../config/sessions.js";
import { note } from "../terminal/note.js";
import { shortenHomePath } from "../utils.js";

type DoctorPrompterLike = {
  confirmSkipInNonInteractive: (params: {
    message: string;
    initialValue?: boolean;
  }) => Promise<boolean>;
};

function existsDir(dir: string): boolean {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

function existsFile(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function canWriteDir(dir: string): boolean {
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(dir: string): { ok: boolean; error?: string } {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function dirPermissionHint(dir: string): string | null {
  const uid = typeof process.getuid === "function" ? process.getuid() : null;
  const gid = typeof process.getgid === "function" ? process.getgid() : null;
  try {
    const stat = fs.statSync(dir);
    if (uid !== null && stat.uid !== uid) {
      return `Divergência de proprietário (uid ${stat.uid}). Execute: sudo chown -R $USER "${dir}"`;
    }
    if (gid !== null && stat.gid !== gid) {
      return `Divergência de grupo (gid ${stat.gid}). Se o acesso falhar, execute: sudo chown -R $USER "${dir}"`;
    }
  } catch {
    return null;
  }
  return null;
}

function addUserRwx(mode: number): number {
  const perms = mode & 0o777;
  return perms | 0o700;
}

function countJsonlLines(filePath: string): number {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw) return 0;
    let count = 0;
    for (let i = 0; i < raw.length; i += 1) {
      if (raw[i] === "\n") count += 1;
    }
    if (!raw.endsWith("\n")) count += 1;
    return count;
  } catch {
    return 0;
  }
}

function findOtherStateDirs(stateDir: string): string[] {
  const resolvedState = path.resolve(stateDir);
  const roots =
    process.platform === "darwin" ? ["/Users"] : process.platform === "linux" ? ["/home"] : [];
  const found: string[] = [];
  for (const root of roots) {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".")) continue;
      const candidate = path.resolve(root, entry.name, ".zero");
      if (candidate === resolvedState) continue;
      if (existsDir(candidate)) found.push(candidate);
    }
  }
  return found;
}

export async function noteStateIntegrity(
  cfg: ZEROConfig,
  prompter: DoctorPrompterLike,
  configPath?: string,
) {
  const warnings: string[] = [];
  const changes: string[] = [];
  const env = process.env;
  const homedir = os.homedir;
  const stateDir = resolveStateDir(env, homedir);
  const defaultStateDir = path.join(homedir(), ".zero");
  const oauthDir = resolveOAuthDir(env, stateDir);
  const agentId = resolveDefaultAgentId(cfg);
  const sessionsDir = resolveSessionTranscriptsDirForAgent(agentId, env, homedir);
  const storePath = resolveStorePath(cfg.session?.store, { agentId });
  const storeDir = path.dirname(storePath);
  const displayStateDir = shortenHomePath(stateDir);
  const displayOauthDir = shortenHomePath(oauthDir);
  const displaySessionsDir = shortenHomePath(sessionsDir);
  const displayStoreDir = shortenHomePath(storeDir);
  const displayConfigPath = configPath ? shortenHomePath(configPath as string) : undefined;

  let stateDirExists = existsDir(stateDir);
  if (!stateDirExists) {
    warnings.push(
      `- CRÍTICO: diretório de estado ausente (${displayStateDir}). Sessões, credenciais, logs e configuração são armazenados lá.`,
    );
    if (cfg.gateway?.mode === "remote") {
      warnings.push(
        "- O Gateway está no modo remoto; execute o doctor no host remoto onde o gateway está em execução.",
      );
    }
    const create = await prompter.confirmSkipInNonInteractive({
      message: `Criar ${displayStateDir} agora?`,
      initialValue: false,
    });
    if (create) {
      const created = ensureDir(stateDir);
      if (created.ok) {
        changes.push(`- Criado ${displayStateDir}`);
        stateDirExists = true;
      } else {
        warnings.push(`- Falha ao criar ${displayStateDir}: ${created.error}`);
      }
    }
  }

  if (stateDirExists && !canWriteDir(stateDir)) {
    warnings.push(`- Diretório de estado não permite escrita (${displayStateDir}).`);
    const hint = dirPermissionHint(stateDir);
    if (hint) warnings.push(`  ${hint}`);
    const repair = await prompter.confirmSkipInNonInteractive({
      message: `Reparar permissões em ${displayStateDir}?`,
      initialValue: true,
    });
    if (repair) {
      try {
        const stat = fs.statSync(stateDir);
        const target = addUserRwx(stat.mode);
        fs.chmodSync(stateDir, target);
        changes.push(`- Permissões reparadas em ${displayStateDir}`);
      } catch (err) {
        warnings.push(`- Falha ao reparar ${displayStateDir}: ${String(err)}`);
      }
    }
  }
  if (stateDirExists && process.platform !== "win32") {
    try {
      const stat = fs.statSync(stateDir);
      if ((stat.mode & 0o077) !== 0) {
        warnings.push(
          `- As permissões do diretório de estado estão muito abertas (${displayStateDir}). Recomendado chmod 700.`,
        );
        const tighten = await prompter.confirmSkipInNonInteractive({
          message: `Restringir permissões em ${displayStateDir} para 700?`,
          initialValue: true,
        });
        if (tighten) {
          fs.chmodSync(stateDir, 0o700);
          changes.push(`- Permissões restringidas em ${displayStateDir} para 700`);
        }
      }
    } catch (err) {
      warnings.push(`- Falha ao ler permissões de ${displayStateDir}: ${String(err)}`);
    }
  }

  if (configPath && existsFile(configPath as string) && process.platform !== "win32") {
    try {
      const stat = fs.statSync(configPath as string);
      if ((stat.mode & 0o077) !== 0) {
        warnings.push(
          `- O arquivo de configuração pode ser lido pelo grupo/mundo (${displayConfigPath ?? configPath}). Recomendado chmod 600.`,
        );
        const tighten = await prompter.confirmSkipInNonInteractive({
          message: `Restringir permissões em ${displayConfigPath ?? (configPath as string)} para 600?`,
          initialValue: true,
        });
        if (tighten) {
          fs.chmodSync(configPath as string, 0o600);
          changes.push(
            `- Permissões restringidas em ${displayConfigPath ?? (configPath as string)} para 600`,
          );
        }
      }
    } catch (err) {
      warnings.push(
        `- Falha ao ler permissões da configuração (${displayConfigPath ?? (configPath as string)}): ${String(err)}`,
      );
    }
  }

  if (stateDirExists) {
    const dirCandidates = new Map<string, string>();
    dirCandidates.set(sessionsDir, "Diretório de sessões");
    dirCandidates.set(storeDir, "Diretório do armazenamento de sessões");
    dirCandidates.set(oauthDir, "Diretório OAuth");
    const displayDirFor = (dir: string) => {
      if (dir === sessionsDir) return displaySessionsDir;
      if (dir === storeDir) return displayStoreDir;
      if (dir === oauthDir) return displayOauthDir;
      return shortenHomePath(dir);
    };

    for (const [dir, label] of dirCandidates) {
      const displayDir = displayDirFor(dir);
      if (!existsDir(dir)) {
        warnings.push(`- CRÍTICO: ${label} ausente (${displayDir}).`);
        const create = await prompter.confirmSkipInNonInteractive({
          message: `Criar ${label} em ${displayDir}?`,
          initialValue: true,
        });
        if (create) {
          const created = ensureDir(dir);
          if (created.ok) {
            changes.push(`- Criado ${label}: ${displayDir}`);
          } else {
            warnings.push(`- Falha ao criar ${displayDir}: ${created.error}`);
          }
        }
        continue;
      }
      if (!canWriteDir(dir)) {
        warnings.push(`- ${label} não permite escrita (${displayDir}).`);
        const hint = dirPermissionHint(dir);
        if (hint) warnings.push(`  ${hint}`);
        const repair = await prompter.confirmSkipInNonInteractive({
          message: `Reparar permissões em ${label}?`,
          initialValue: true,
        });
        if (repair) {
          try {
            const stat = fs.statSync(dir);
            const target = addUserRwx(stat.mode);
            fs.chmodSync(dir, target);
            changes.push(`- Permissões reparadas em ${label}: ${displayDir}`);
          } catch (err) {
            warnings.push(`- Falha ao reparar ${displayDir}: ${String(err)}`);
          }
        }
      }
    }
  }

  const extraStateDirs = new Set<string>();
  if (path.resolve(stateDir) !== path.resolve(defaultStateDir)) {
    if (existsDir(defaultStateDir)) extraStateDirs.add(defaultStateDir);
  }
  for (const other of findOtherStateDirs(stateDir)) {
    extraStateDirs.add(other);
  }
  if (extraStateDirs.size > 0) {
    warnings.push(
      [
        "- Múltiplos diretórios de estado detectados. Isso pode dividir o histórico de sessões.",
        ...Array.from(extraStateDirs).map((dir) => `  - ${shortenHomePath(dir)}`),
        `  Diretório de estado ativo: ${displayStateDir}`,
      ].join("\n"),
    );
  }

  const store = loadSessionStore(storePath);
  const entries = Object.entries(store).filter(([, entry]) => entry && typeof entry === "object");
  if (entries.length > 0) {
    const recent = entries
      .slice()
      .sort((a, b) => {
        const aUpdated = typeof a[1].updatedAt === "number" ? a[1].updatedAt : 0;
        const bUpdated = typeof b[1].updatedAt === "number" ? b[1].updatedAt : 0;
        return bUpdated - aUpdated;
      })
      .slice(0, 5);
    const missing = recent.filter(([, entry]) => {
      const sessionId = entry.sessionId;
      if (!sessionId) return false;
      const transcriptPath = resolveSessionFilePath(sessionId, entry, {
        agentId,
      });
      return !existsFile(transcriptPath);
    });
    if (missing.length > 0) {
      warnings.push(
        `- ${missing.length}/${recent.length} sessões recentes estão sem transcrições. Verifique se há arquivos de sessão excluídos ou diretórios de estado divididos.`,
      );

      const shouldRepair = await prompter.confirmSkipInNonInteractive({
        message: "Remover registros de sessões corrompidas (arquivos ausentes)?",
        initialValue: true,
      });

      if (shouldRepair) {
        let repairedCount = 0;
        for (const [key] of missing) {
          if (store[key]) {
            delete store[key];
            repairedCount++;
          }
        }
        if (repairedCount > 0) {
          try {
            fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf-8");
            changes.push(
              `- Removidos ${repairedCount} registros de sessão inválidos (sem transcrição).`,
            );
          } catch (err) {
            warnings.push(`- Falha ao salvar reparos no store de sessão: ${String(err)}`);
          }
        }
      }
    }

    const mainKey = resolveMainSessionKey(cfg);
    const mainEntry = store[mainKey];
    if (mainEntry?.sessionId) {
      const transcriptPath = resolveSessionFilePath(mainEntry.sessionId, mainEntry, { agentId });
      if (!existsFile(transcriptPath)) {
        warnings.push(
          `- Transcrição da sessão principal ausente (${shortenHomePath(transcriptPath)}). O histórico parecerá ter sido resetado.`,
        );
      } else {
        const lineCount = countJsonlLines(transcriptPath);
        if (lineCount <= 1) {
          warnings.push(
            `- A transcrição da sessão principal tem apenas ${lineCount} linha. O histórico da sessão pode não estar sendo anexado.`,
          );
        }
      }
    }
  }

  if (warnings.length > 0) {
    note(warnings.join("\n"), "Integridade do estado");
  }
  if (changes.length > 0) {
    note(changes.join("\n"), "Alterações do Doctor");
  }
}

export function noteWorkspaceBackupTip(workspaceDir: string) {
  if (!existsDir(workspaceDir)) return;
  const gitMarker = path.join(workspaceDir, ".git");
  if (fs.existsSync(gitMarker)) return;
  note(
    [
      "- Dica: faça backup do workspace em um repositório git privado (GitHub ou GitLab).",
      "- Mantenha ~/.zero fora do git; ele contém credenciais e histórico de sessões.",
      "- Detalhes: /concepts/agent-workspace#git-backup-recommended",
    ].join("\n"),
    "Workspace",
  );
}
