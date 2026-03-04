
export function buildSkillsSection(params: {
    skillsPrompt?: string;
    isMinimal: boolean;
    readToolName: string;
}): string {
    if (params.isMinimal) return "Use tools to find skills.";
    return params.skillsPrompt || "No skills defined.";
}

export function buildMemorySection(params: { isMinimal: boolean; availableTools: Set<string>; memoryPreferences?: string }): string {
    if (params.isMinimal) return "Memory: minimalist mode.";
    let base = "Memory: full mode.";
    if (params.memoryPreferences) {
        base += `\n\nCORE USER PREFERENCES (MEMORY.md):\n${params.memoryPreferences}\n`;
    }
    return base;
}

export function buildUserIdentitySection(ownerLine: string | undefined, isMinimal: boolean): string {
    if (isMinimal) return "";
    return ownerLine || "";
}

export function buildTimeSection(params: { userTimezone?: string }): string {
    return `Current time in ${params.userTimezone || "UTC"}: ${new Date().toISOString()}`;
}

export function buildReplyTagsSection(isMinimal: boolean): string {
    if (isMinimal) return "";
    return "Use <reply> tags.";
}
