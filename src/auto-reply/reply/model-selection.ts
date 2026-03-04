
import { lookupContextTokens } from "../../agents/context.js";
import { DEFAULT_CONTEXT_TOKENS } from "../../agents/defaults.js";
import { loadModelCatalog } from "../../agents/model-catalog.js";
import {
  buildAllowedModelSet,
  type ModelAliasIndex,
  modelKey,
  normalizeProviderId,
  resolveModelRefFromString,
  resolveThinkingDefault,
} from "../../agents/model-selection.js";
import type { ZEROConfig } from "../../config/config.js";
import { type SessionEntry, updateSessionStore } from "../../config/sessions.js";
import { clearSessionAuthProfileOverride } from "../../agents/auth-profiles/session-override.js";
import { applyModelOverrideToSessionEntry } from "../../sessions/model-overrides.js";
import { resolveThreadParentSessionKey } from "../../sessions/session-key-utils.js";
import type { ThinkLevel } from "./directives.js";
import { scoreFuzzyMatch } from "./model-selection-fuzzy.js";

export type ModelDirectiveSelection = {
  provider: string;
  model: string;
  isDefault: boolean;
  alias?: string;
};

type ModelCatalog = Awaited<ReturnType<typeof loadModelCatalog>>;

type ModelSelectionState = {
  provider: string;
  model: string;
  allowedModelKeys: Set<string>;
  allowedModelCatalog: ModelCatalog;
  resetModelOverride: boolean;
  resolveDefaultThinkingLevel: () => Promise<ThinkLevel>;
  needsModelCatalog: boolean;
};

type StoredModelOverride = {
  provider?: string;
  model: string;
  source: "session" | "parent";
};

function resolveModelOverrideFromEntry(entry?: SessionEntry): { provider?: string; model: string } | null {
  const model = entry?.modelOverride?.trim();
  if (!model) return null;
  return { provider: entry?.providerOverride?.trim() || undefined, model };
}

function resolveParentSessionKeyCandidate(params: {
  sessionKey?: string;
  parentSessionKey?: string;
}): string | null {
  const explicit = params.parentSessionKey?.trim();
  if (explicit && explicit !== params.sessionKey) return explicit;
  const derived = resolveThreadParentSessionKey(params.sessionKey);
  if (derived && derived !== params.sessionKey) return derived;
  return null;
}

function resolveStoredModelOverride(params: {
  sessionEntry?: SessionEntry;
  sessionStore?: Record<string, SessionEntry>;
  sessionKey?: string;
  parentSessionKey?: string;
}): StoredModelOverride | null {
  const direct = resolveModelOverrideFromEntry(params.sessionEntry);
  if (direct) return { ...direct, source: "session" };
  const parentKey = resolveParentSessionKeyCandidate({
    sessionKey: params.sessionKey,
    parentSessionKey: params.parentSessionKey,
  });
  if (!parentKey || !params.sessionStore) return null;
  const parentOverride = resolveModelOverrideFromEntry(params.sessionStore[parentKey]);
  if (!parentOverride) return null;
  return { ...parentOverride, source: "parent" };
}

export async function createModelSelectionState(params: {
  cfg: ZEROConfig;
  agentCfg: NonNullable<NonNullable<ZEROConfig["agents"]>["defaults"]> | undefined;
  sessionEntry?: SessionEntry;
  sessionStore?: Record<string, SessionEntry>;
  sessionKey?: string;
  parentSessionKey?: string;
  storePath?: string;
  defaultProvider: string;
  defaultModel: string;
  provider: string;
  model: string;
  hasModelDirective: boolean;
}): Promise<ModelSelectionState> {
  const { cfg, agentCfg, sessionEntry, sessionStore, sessionKey, parentSessionKey, storePath, defaultProvider, defaultModel } = params;
  let { provider, model } = params;

  const hasAllowlist = agentCfg?.models && Object.keys(agentCfg.models).length > 0;
  const initialStoredOverride = resolveStoredModelOverride({ sessionEntry, sessionStore, sessionKey, parentSessionKey });
  const needsModelCatalog = params.hasModelDirective || hasAllowlist || Boolean(initialStoredOverride);

  let allowedModelKeys = new Set<string>();
  let allowedModelCatalog: ModelCatalog = [];
  let modelCatalog: ModelCatalog | null = null;
  let resetModelOverride = false;

  if (needsModelCatalog) {
    modelCatalog = await loadModelCatalog({ config: cfg });
    const allowed = buildAllowedModelSet({ cfg, catalog: modelCatalog, defaultProvider, defaultModel });
    allowedModelCatalog = allowed.allowedCatalog;
    allowedModelKeys = allowed.allowedKeys;
  }

  if (sessionEntry && sessionStore && sessionKey && initialStoredOverride) {
    const overrideProvider = sessionEntry.providerOverride?.trim() || defaultProvider;
    const overrideModel = sessionEntry.modelOverride?.trim();
    if (overrideModel) {
      const key = modelKey(overrideProvider, overrideModel);
      if (allowedModelKeys.size > 0 && !allowedModelKeys.has(key)) {
        const { updated } = applyModelOverrideToSessionEntry({ entry: sessionEntry, selection: { provider: defaultProvider, model: defaultModel, isDefault: true } });
        if (updated) {
          sessionStore[sessionKey] = sessionEntry;
          if (storePath) await updateSessionStore(storePath, (store) => { store[sessionKey] = sessionEntry; });
        }
        resetModelOverride = updated;
      }
    }
  }

  const storedOverride = resolveStoredModelOverride({ sessionEntry, sessionStore, sessionKey, parentSessionKey });
  if (storedOverride?.model) {
    const candidateProvider = storedOverride.provider || defaultProvider;
    const key = modelKey(candidateProvider, storedOverride.model);
    if (allowedModelKeys.size === 0 || allowedModelKeys.has(key)) {
      provider = candidateProvider;
      model = storedOverride.model;
    }
  }

  if (sessionEntry && sessionStore && sessionKey && sessionEntry.authProfileOverride) {
    const { ensureAuthProfileStore } = await import("../../agents/auth-profiles.js");
    const store = ensureAuthProfileStore(undefined, { allowKeychainPrompt: false });
    const profile = store.profiles[sessionEntry.authProfileOverride];
    if (!profile || normalizeProviderId(profile.provider) !== normalizeProviderId(provider)) {
      await clearSessionAuthProfileOverride({ sessionEntry, sessionStore, sessionKey, storePath });
    }
  }

  let defaultThinkingLevel: ThinkLevel | undefined;
  const resolveDefaultThinkingLevel = async () => {
    if (defaultThinkingLevel) return defaultThinkingLevel;
    let catalogForThinking = modelCatalog ?? allowedModelCatalog;
    if (!catalogForThinking || catalogForThinking.length === 0) {
      modelCatalog = await loadModelCatalog({ config: cfg });
      catalogForThinking = modelCatalog;
    }
    const resolved = resolveThinkingDefault({ cfg, provider, model, catalog: catalogForThinking });
    defaultThinkingLevel = resolved ?? (agentCfg?.thinkingDefault as ThinkLevel | undefined) ?? "off";
    return defaultThinkingLevel;
  };

  return { provider, model, allowedModelKeys, allowedModelCatalog, resetModelOverride, resolveDefaultThinkingLevel, needsModelCatalog };
}

export function resolveModelDirectiveSelection(params: {
  raw: string;
  defaultProvider: string;
  defaultModel: string;
  aliasIndex: ModelAliasIndex;
  allowedModelKeys: Set<string>;
}): { selection?: ModelDirectiveSelection; error?: string } {
  const { raw, defaultProvider, defaultModel, aliasIndex, allowedModelKeys } = params;
  const rawTrimmed = raw.trim();

  const buildSelection = (provider: string, model: string): ModelDirectiveSelection => ({
    provider, model,
    isDefault: provider === defaultProvider && model === defaultModel,
    alias: aliasIndex.byKey.get(modelKey(provider, model))?.[0],
  });

  const resolveFuzzy = (p: { provider?: string; fragment: string }): { selection?: ModelDirectiveSelection; error?: string } => {
    const fragment = p.fragment.trim().toLowerCase();
    if (!fragment) return {};
    const providerFilter = p.provider ? normalizeProviderId(p.provider) : undefined;
    const candidates: Array<{ provider: string; model: string }> = [];
    for (const key of allowedModelKeys) {
      const slash = key.indexOf("/");
      if (slash <= 0) continue;
      const provider = normalizeProviderId(key.slice(0, slash));
      if (providerFilter && provider !== providerFilter) continue;
      candidates.push({ provider, model: key.slice(slash + 1) });
    }
    if (!p.provider) {
      for (const [aliasKey, entry] of aliasIndex.byAlias.entries()) {
        if (!aliasKey.includes(fragment)) continue;
        if (allowedModelKeys.has(modelKey(entry.ref.provider, entry.ref.model)) && !candidates.some(c => c.provider === entry.ref.provider && c.model === entry.ref.model)) {
          candidates.push({ provider: entry.ref.provider, model: entry.ref.model });
        }
      }
    }
    if (candidates.length === 0) return {};
    const scored = candidates.map(c => ({ candidate: c, ...scoreFuzzyMatch({ provider: c.provider, model: c.model, fragment, aliasIndex, defaultProvider, defaultModel }) }))
      .sort((a, b) => b.score - a.score || (a.isDefault ? -1 : 1) || b.variantMatchCount - a.variantMatchCount || a.variantCount - b.variantCount || a.modelLength - b.modelLength || a.key.localeCompare(b.key));
    const best = scored[0];
    if (!best || best.score < (providerFilter ? 90 : 120)) return {};
    return { selection: buildSelection(best.candidate.provider, best.candidate.model) };
  };

  const resolved = resolveModelRefFromString({ raw: rawTrimmed, defaultProvider, aliasIndex });
  if (!resolved) {
    const fuzzy = resolveFuzzy({ fragment: rawTrimmed });
    return fuzzy.selection || fuzzy.error ? fuzzy : { error: `Unrecognized model "${rawTrimmed}". Use /models to list providers, or /models <provider> to list models.` };
  }
  const resolvedKey = modelKey(resolved.ref.provider, resolved.ref.model);
  if (allowedModelKeys.size === 0 || allowedModelKeys.has(resolvedKey)) {
    return { selection: { provider: resolved.ref.provider, model: resolved.ref.model, isDefault: resolved.ref.provider === defaultProvider && resolved.ref.model === defaultModel, alias: resolved.alias } };
  }
  if (rawTrimmed.toLowerCase().includes("/")) {
    const slash = rawTrimmed.indexOf("/");
    const fuzzy = resolveFuzzy({ provider: normalizeProviderId(rawTrimmed.slice(0, slash).trim()), fragment: rawTrimmed.slice(slash + 1).trim() });
    if (fuzzy.selection || fuzzy.error) return fuzzy;
  }
  const fuzzy = resolveFuzzy({ fragment: rawTrimmed });
  return fuzzy.selection || fuzzy.error ? fuzzy : { error: `Model "${resolved.ref.provider}/${resolved.ref.model}" is not allowed. Use /models to list providers, or /models <provider> to list models.` };
}

export function resolveContextTokens(params: {
  agentCfg: NonNullable<NonNullable<ZEROConfig["agents"]>["defaults"]> | undefined;
  model: string;
}): number {
  return params.agentCfg?.contextTokens ?? lookupContextTokens(params.model) ?? DEFAULT_CONTEXT_TOKENS;
}
