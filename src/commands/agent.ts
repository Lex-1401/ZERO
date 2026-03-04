
import {
  listAgentIds,
  resolveAgentDir,
  resolveAgentWorkspaceDir,
} from "../agents/agent-scope.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "../agents/defaults.js";
import {
  resolveConfiguredModelRef,
} from "../agents/model-selection.js";
import { buildWorkspaceSkillSnapshot } from "../agents/skills.js";
import { getSkillsSnapshotVersion } from "../agents/skills/refresh.js";
import { resolveAgentTimeoutMs } from "../agents/timeout.js";
import { ensureAgentWorkspace } from "../agents/workspace.js";
import {
  formatThinkingLevels,
  normalizeThinkLevel,
  normalizeVerboseLevel,
} from "../auto-reply/thinking.js";
import { type CliDeps, createDefaultDeps } from "../cli/deps.js";
import { loadConfig } from "../config/config.js";
import {
  resolveAgentIdFromSessionKey,
  resolveSessionFilePath,
  type SessionEntry,
  updateSessionStore,
} from "../config/sessions.js";
import {
  clearAgentRunContext,
  registerAgentRunContext,
} from "../infra/agent-events.js";
import { getRemoteSkillEligibility } from "../infra/skills-remote.js";
import { defaultRuntime, type RuntimeEnv } from "../runtime.js";
import { formatCliCommand } from "../cli/command-format.js";
import { applyVerboseOverride } from "../sessions/level-overrides.js";
import { resolveSendPolicy } from "../sessions/send-policy.js";
import { deliverAgentCommandResult } from "./agent/delivery.js";
import { resolveSession } from "./agent/session.js";
import { updateSessionStoreAfterAgentRun } from "./agent/session-store.js";
import type { AgentCommandOpts } from "./agent/types.js";
import { normalizeAgentId } from "../routing/session-key.js";
import { resolveRunModel, resolveFinalThinking } from "./agent/model-logic.js";
import { runAgentExecution } from "./agent/executor.js";

export async function agentCommand(
  opts: AgentCommandOpts,
  runtime: RuntimeEnv = defaultRuntime,
  deps: CliDeps = createDefaultDeps(),
) {
  const body = (opts.message ?? "").trim();
  if (!body) throw new Error("A mensagem (--message) é obrigatória");
  if (!opts.to && !opts.sessionId && !opts.sessionKey && !opts.agentId) {
    throw new Error("Passe --to <E.164>, --session-id ou --agent para escolher uma sessão");
  }

  const cfg = loadConfig();
  const agentIdOverrideRaw = opts.agentId?.trim();
  const agentIdOverride = agentIdOverrideRaw ? normalizeAgentId(agentIdOverrideRaw) : undefined;
  if (agentIdOverride) {
    const knownAgents = listAgentIds(cfg);
    if (!knownAgents.includes(agentIdOverride)) {
      throw new Error(
        `ID de agente desconhecido "${agentIdOverrideRaw}". Use "${formatCliCommand("zero agents list")}" para ver os agentes configurados.`,
      );
    }
  }
  if (agentIdOverride && opts.sessionKey) {
    const sessionAgentId = resolveAgentIdFromSessionKey(opts.sessionKey);
    if (sessionAgentId !== agentIdOverride) {
      throw new Error(
        `O ID do agente "${agentIdOverrideRaw}" não coincide com o agente da chave de sessão "${sessionAgentId}".`,
      );
    }
  }
  const agentCfg = cfg.agents?.defaults;
  const sessionAgentId = agentIdOverride ?? resolveAgentIdFromSessionKey(opts.sessionKey?.trim());
  const workspaceDirRaw = resolveAgentWorkspaceDir(cfg, sessionAgentId);
  const _agentDir = resolveAgentDir(cfg, sessionAgentId);
  const workspace = await ensureAgentWorkspace({
    dir: workspaceDirRaw,
    ensureBootstrapFiles: !agentCfg?.skipBootstrap,
  });
  const workspaceDir = workspace.dir;
  const configuredModel = resolveConfiguredModelRef({
    cfg,
    defaultProvider: DEFAULT_PROVIDER,
    defaultModel: DEFAULT_MODEL,
  });
  const thinkingLevelsHint = formatThinkingLevels(configuredModel.provider, configuredModel.model);

  const thinkOverride = normalizeThinkLevel(opts.thinking);
  const thinkOnce = normalizeThinkLevel(opts.thinkingOnce);
  if (opts.thinking && !thinkOverride) {
    throw new Error(`Nível de pensamento inválido. Use um de: ${thinkingLevelsHint}.`);
  }
  if (opts.thinkingOnce && !thinkOnce) {
    throw new Error(
      `Nível de pensamento único (one-shot) inválido. Use um de: ${thinkingLevelsHint}.`,
    );
  }

  const verboseOverride = normalizeVerboseLevel(opts.verbose);
  if (opts.verbose && !verboseOverride) {
    throw new Error('Nível de verbosidade inválido. Use "on", "full" ou "off".');
  }

  const timeoutSecondsRaw =
    opts.timeout !== undefined ? Number.parseInt(String(opts.timeout), 10) : undefined;
  if (
    timeoutSecondsRaw !== undefined &&
    (Number.isNaN(timeoutSecondsRaw) || timeoutSecondsRaw <= 0)
  ) {
    throw new Error("--timeout deve ser um número inteiro positivo (segundos)");
  }
  const timeoutMs = resolveAgentTimeoutMs({
    cfg,
    overrideSeconds: timeoutSecondsRaw,
  });

  const sessionResolution = resolveSession({
    cfg,
    to: opts.to,
    sessionId: opts.sessionId,
    sessionKey: opts.sessionKey,
    agentId: agentIdOverride,
  });

  const {
    sessionId,
    sessionKey,
    sessionEntry: resolvedSessionEntry,
    sessionStore,
    storePath,
    isNewSession,
    persistedThinking,
    persistedVerbose,
  } = sessionResolution;
  let sessionEntry = resolvedSessionEntry;
  const runId = opts.runId?.trim() || sessionId;

  try {
    if (opts.deliver === true) {
      const sendPolicy = resolveSendPolicy({
        cfg,
        entry: sessionEntry,
        sessionKey,
        channel: sessionEntry?.channel,
        chatType: sessionEntry?.chatType,
      });
      if (sendPolicy === "deny") {
        throw new Error("envio bloqueado pela política da sessão");
      }
    }

    let resolvedThinkLevel =
      thinkOnce ??
      thinkOverride ??
      persistedThinking ??
      (agentCfg?.thinkingDefault);
    const resolvedVerboseLevel =
      verboseOverride ?? persistedVerbose ?? (agentCfg?.verboseDefault);

    if (sessionKey) {
      registerAgentRunContext(runId, {
        sessionKey,
        verboseLevel: resolvedVerboseLevel,
      });
    }

    const needsSkillsSnapshot = isNewSession || !sessionEntry?.skillsSnapshot;
    const skillsSnapshotVersion = getSkillsSnapshotVersion(workspaceDir);
    const skillsSnapshot = needsSkillsSnapshot
      ? buildWorkspaceSkillSnapshot(workspaceDir, {
        config: cfg,
        eligibility: { remote: getRemoteSkillEligibility() },
        snapshotVersion: skillsSnapshotVersion,
      })
      : sessionEntry?.skillsSnapshot;

    if (skillsSnapshot && sessionStore && sessionKey && needsSkillsSnapshot) {
      const next: SessionEntry = {
        ...(sessionEntry ?? { sessionId, updatedAt: Date.now() }),
        sessionId,
        updatedAt: Date.now(),
        skillsSnapshot,
      };
      sessionStore[sessionKey] = next;
      await updateSessionStore(storePath, (store) => {
        store[sessionKey] = next;
      });
      sessionEntry = next;
    }

    if (sessionStore && sessionKey) {
      const entry = sessionStore[sessionKey] ?? sessionEntry ?? { sessionId, updatedAt: Date.now() };
      const next: SessionEntry = { ...entry, sessionId, updatedAt: Date.now() };
      if (thinkOverride) {
        if (thinkOverride === "off") delete next.thinkingLevel;
        else next.thinkingLevel = thinkOverride;
      }
      applyVerboseOverride(next, verboseOverride);
      sessionStore[sessionKey] = next;
      await updateSessionStore(storePath, (store) => {
        store[sessionKey] = next;
      });
    }

    const { provider, model, modelCatalog, allowedModelCatalog } = await resolveRunModel({
      cfg, sessionEntry, sessionKey, sessionStore, storePath,
      defaultProvider: DEFAULT_PROVIDER, defaultModel: DEFAULT_MODEL, agentCfg
    });

    resolvedThinkLevel = await resolveFinalThinking({
      cfg, provider, model, modelCatalog, allowedModelCatalog,
      thinkOnce, thinkOverride, resolvedThinkLevel,
      sessionEntry, sessionStore, sessionKey, storePath
    });

    const sessionFile = resolveSessionFilePath(sessionId, sessionEntry, {
      agentId: sessionAgentId,
    });

    const { result, fallbackProvider, fallbackModel } = await runAgentExecution({
      cfg, sessionAgentId, sessionId, sessionKey, sessionEntry, workspaceDir,
      skillsSnapshot, body, resolvedThinkLevel, resolvedVerboseLevel,
      timeoutMs, runId, provider, model, opts, sessionFile
    } as any);

    if (sessionStore && sessionKey) {
      await updateSessionStoreAfterAgentRun({
        cfg,
        contextTokensOverride: agentCfg?.contextTokens,
        sessionId,
        sessionKey,
        storePath,
        sessionStore,
        defaultProvider: provider,
        defaultModel: model,
        fallbackProvider,
        fallbackModel,
        result,
      });
    }

    return await deliverAgentCommandResult({
      cfg, deps, runtime, opts, sessionEntry, result,
      payloads: result.payloads ?? [],
    });
  } finally {
    clearAgentRunContext(runId);
  }
}
