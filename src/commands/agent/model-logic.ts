// @ts-nocheck

import { loadModelCatalog } from "../../agents/model-catalog.js";
import {
    buildAllowedModelSet,
    isCliProvider,
    modelKey,
} from "../../agents/model-selection.js";
import { applyModelOverrideToSessionEntry } from "../../sessions/model-overrides.js";
import { updateSessionStore, type SessionEntry } from "../../config/sessions.js";
import { ensureAuthProfileStore } from "../../agents/auth-profiles.js";
import { clearSessionAuthProfileOverride } from "../../agents/auth-profiles/session-override.js";
import {
    supportsXHighThinking,
} from "../../auto-reply/thinking.js";
const resolveThinkingDefault = (_v: any) => undefined;
import { formatXHighModelHint } from "../../auto-reply/thinking.js";
import type { Config } from "../../config/config.js";

export async function resolveRunModel(params: {
    cfg: Config;
    sessionEntry: SessionEntry | undefined;
    sessionKey: string | undefined;
    sessionStore: any;
    storePath: string;
    defaultProvider: string;
    defaultModel: string;
    agentCfg: any;
}) {
    const {
        cfg,
        sessionEntry,
        sessionKey,
        sessionStore,
        storePath,
        defaultProvider,
        defaultModel,
        agentCfg,
    } = params;

    let provider = defaultProvider;
    let model = defaultModel;
    const hasAllowlist = agentCfg?.models && Object.keys(agentCfg.models).length > 0;
    const hasStoredOverride = Boolean(
        sessionEntry?.modelOverride || sessionEntry?.providerOverride,
    );
    const needsModelCatalog = hasAllowlist || hasStoredOverride;
    let allowedModelKeys = new Set<string>();
    let allowedModelCatalog: any[] = [];
    let modelCatalog: any[] | null = null;

    if (needsModelCatalog) {
        modelCatalog = await loadModelCatalog({ config: cfg });
        const allowed = buildAllowedModelSet({
            cfg,
            catalog: modelCatalog,
            defaultProvider,
            defaultModel,
        });
        allowedModelKeys = allowed.allowedKeys;
        allowedModelCatalog = allowed.allowedCatalog;
    }

    if (sessionEntry && sessionStore && sessionKey && hasStoredOverride) {
        const entry = sessionEntry;
        const overrideProvider = sessionEntry.providerOverride?.trim() || defaultProvider;
        const overrideModel = sessionEntry.modelOverride?.trim();
        if (overrideModel) {
            const key = modelKey(overrideProvider, overrideModel);
            if (
                !isCliProvider(overrideProvider, cfg) &&
                allowedModelKeys.size > 0 &&
                !allowedModelKeys.has(key)
            ) {
                const { updated } = applyModelOverrideToSessionEntry({
                    entry,
                    selection: { provider: defaultProvider, model: defaultModel, isDefault: true },
                });
                if (updated) {
                    sessionStore[sessionKey] = entry;
                    await updateSessionStore(storePath, (store) => {
                        store[sessionKey] = entry;
                    });
                }
            }
        }
    }

    const storedProviderOverride = sessionEntry?.providerOverride?.trim();
    const storedModelOverride = sessionEntry?.modelOverride?.trim();
    if (storedModelOverride) {
        const candidateProvider = storedProviderOverride || defaultProvider;
        const key = modelKey(candidateProvider, storedModelOverride);
        if (
            isCliProvider(candidateProvider, cfg) ||
            allowedModelKeys.size === 0 ||
            allowedModelKeys.has(key)
        ) {
            provider = candidateProvider;
            model = storedModelOverride;
        }
    }

    if (sessionEntry) {
        const authProfileId = sessionEntry.authProfileOverride;
        if (authProfileId) {
            const entry = sessionEntry;
            const store = ensureAuthProfileStore();
            const profile = store.profiles[authProfileId];
            if (!profile || profile.provider !== provider) {
                if (sessionStore && sessionKey) {
                    await clearSessionAuthProfileOverride({
                        sessionEntry: entry,
                        sessionStore,
                        sessionKey,
                        storePath,
                    });
                }
            }
        }
    }

    return { provider, model, modelCatalog, allowedModelCatalog };
}

export async function resolveFinalThinking(params: {
    cfg: Config;
    provider: string;
    model: string;
    modelCatalog: any[] | null;
    allowedModelCatalog: any[];
    thinkOnce: any;
    thinkOverride: any;
    resolvedThinkLevel: any;
    sessionEntry: SessionEntry | undefined;
    sessionStore: any;
    sessionKey: string | undefined;
    storePath: string;
}) {
    let { resolvedThinkLevel } = params;
    const {
        cfg,
        provider,
        model,
        modelCatalog,
        allowedModelCatalog,
        thinkOnce,
        thinkOverride,
        sessionEntry,
        sessionStore,
        sessionKey,
        storePath,
    } = params;

    if (!resolvedThinkLevel) {
        let catalogForThinking = modelCatalog ?? allowedModelCatalog;
        if (!catalogForThinking || catalogForThinking.length === 0) {
            const cat = await loadModelCatalog({ config: cfg });
            catalogForThinking = cat;
        }
        resolvedThinkLevel = resolveThinkingDefault({
            cfg,
            provider,
            model,
            catalog: catalogForThinking,
        });
    }

    if (resolvedThinkLevel === "xhigh" && !supportsXHighThinking(provider, model)) {
        const explicitThink = Boolean(thinkOnce || thinkOverride);
        if (explicitThink) {
            throw new Error(
                `O nível de pensamento "xhigh" é suportado apenas para ${formatXHighModelHint()}.`,
            );
        }
        resolvedThinkLevel = "high";
        if (sessionEntry && sessionStore && sessionKey && sessionEntry.thinkingLevel === "xhigh") {
            const entry = sessionEntry;
            entry.thinkingLevel = "high";
            entry.updatedAt = Date.now();
            sessionStore[sessionKey] = entry;
            await updateSessionStore(storePath, (store) => {
                store[sessionKey] = entry;
            });
        }
    }

    return resolvedThinkLevel;
}
