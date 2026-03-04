
import {
    normalizeProviderId,
    modelKey,
    type ModelAliasIndex,
} from "../../agents/model-selection.js";

const FUZZY_VARIANT_TOKENS = [
    "lightning",
    "preview",
    "mini",
    "fast",
    "turbo",
    "lite",
    "beta",
    "small",
    "nano",
];

export function boundedLevenshteinDistance(a: string, b: string, maxDistance: number): number | null {
    if (a === b) return 0;
    if (!a || !b) return null;
    const aLen = a.length;
    const bLen = b.length;
    if (Math.abs(aLen - bLen) > maxDistance) return null;

    const prev = Array.from({ length: bLen + 1 }, (_, idx) => idx);
    const curr = Array.from({ length: bLen + 1 }, () => 0);

    for (let i = 1; i <= aLen; i++) {
        curr[0] = i;
        let rowMin = curr[0];
        const aChar = a.charCodeAt(i - 1);
        for (let j = 1; j <= bLen; j++) {
            const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
            if (curr[j] < rowMin) rowMin = curr[j]!;
        }
        if (rowMin > maxDistance) return null;
        for (let j = 0; j <= bLen; j++) prev[j] = curr[j] ?? 0;
    }

    const dist = prev[bLen] ?? null;
    if (dist == null || dist > maxDistance) return null;
    return dist;
}

export function scoreFuzzyMatch(params: {
    provider: string;
    model: string;
    fragment: string;
    aliasIndex: ModelAliasIndex;
    defaultProvider: string;
    defaultModel: string;
}) {
    const provider = normalizeProviderId(params.provider);
    const model = params.model;
    const fragment = params.fragment.trim().toLowerCase();
    const providerLower = provider.toLowerCase();
    const modelLower = model.toLowerCase();
    const haystack = `${providerLower}/${modelLower}`;
    const key = modelKey(provider, model);

    const scoreFragment = (
        value: string,
        weights: { exact: number; starts: number; includes: number },
    ) => {
        if (!fragment) return 0;
        let score = 0;
        if (value === fragment) score = Math.max(score, weights.exact);
        if (value.startsWith(fragment)) score = Math.max(score, weights.starts);
        if (value.includes(fragment)) score = Math.max(score, weights.includes);
        return score;
    };

    let score = 0;
    score += scoreFragment(haystack, { exact: 220, starts: 140, includes: 110 });
    score += scoreFragment(providerLower, { exact: 180, starts: 120, includes: 90 });
    score += scoreFragment(modelLower, { exact: 160, starts: 110, includes: 80 });

    const distModel = boundedLevenshteinDistance(fragment, modelLower, 3);
    if (distModel != null) score += (3 - distModel) * 70;

    const aliases = params.aliasIndex.byKey.get(key) ?? [];
    for (const alias of aliases) {
        score += scoreFragment(alias.toLowerCase(), { exact: 140, starts: 90, includes: 60 });
    }

    if (modelLower.startsWith(providerLower)) score += 30;

    const fragmentVariants = FUZZY_VARIANT_TOKENS.filter((token) => fragment.includes(token));
    const modelVariants = FUZZY_VARIANT_TOKENS.filter((token) => modelLower.includes(token));
    const variantMatchCount = fragmentVariants.filter((token) => modelLower.includes(token)).length;
    const variantCount = modelVariants.length;
    if (fragmentVariants.length === 0 && variantCount > 0) {
        score -= variantCount * 30;
    } else if (fragmentVariants.length > 0) {
        if (variantMatchCount > 0) score += variantMatchCount * 40;
        if (variantMatchCount === 0) score -= 20;
    }

    const defaultProvider = normalizeProviderId(params.defaultProvider);
    const isDefault = provider === defaultProvider && model === params.defaultModel;
    if (isDefault) score += 20;

    return {
        score, isDefault, variantCount, variantMatchCount,
        modelLength: modelLower.length, key
    };
}
