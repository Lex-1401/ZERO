
import {
    buildSkillsSection,
    buildMemorySection,
    buildUserIdentitySection,
    buildTimeSection,
    buildReplyTagsSection
} from "./sections.js";

export function buildAgentSystemPrompt(params: any): string {
    const isMinimal = params.mode === "minimal";
    const sections: string[] = [];

    sections.push(buildUserIdentitySection(params.ownerLine, isMinimal));
    sections.push(buildTimeSection({ userTimezone: params.userTimezone }));
    sections.push(buildReplyTagsSection(isMinimal));
    sections.push(buildSkillsSection({
        skillsPrompt: params.extraSystemPrompt,
        isMinimal,
        readToolName: "read_file"
    }));
    sections.push(buildMemorySection({ isMinimal, availableTools: new Set(params.toolNames), memoryPreferences: params.memoryPreferences }));

    return sections.filter(Boolean).join("\n\n");
}
