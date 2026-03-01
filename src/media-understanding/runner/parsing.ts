export function extractLastJsonObject(raw: string): unknown {
    const trimmed = raw.trim();
    const start = trimmed.lastIndexOf("{");
    if (start === -1) return null;
    const slice = trimmed.slice(start);
    try {
        return JSON.parse(slice);
    } catch {
        return null;
    }
}

export function extractGeminiResponse(raw: string): string | null {
    const payload = extractLastJsonObject(raw);
    if (!payload || typeof payload !== "object") return null;
    const response = (payload as { response?: unknown }).response;
    if (typeof response !== "string") return null;
    const trimmed = response.trim();
    return trimmed || null;
}

export function extractSherpaOnnxText(raw: string): string | null {
    const tryParse = (value: string): string | null => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const head = trimmed[0];
        if (head !== "{" && head !== '"') return null;
        try {
            const parsed = JSON.parse(trimmed) as unknown;
            if (typeof parsed === "string") {
                return tryParse(parsed);
            }
            if (parsed && typeof parsed === "object") {
                const text = (parsed as { text?: unknown }).text;
                if (typeof text === "string" && text.trim()) {
                    return text.trim();
                }
            }
        } catch { }
        return null;
    };

    const direct = tryParse(raw);
    if (direct) return direct;

    const lines = raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
        const parsed = tryParse(lines[i] ?? "");
        if (parsed) return parsed;
    }
    return null;
}
