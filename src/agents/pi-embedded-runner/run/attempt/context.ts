// @ts-nocheck

import { type EmbeddedRunAttemptParams } from "../types.js";
import { resolveSandboxContext } from "../../../sandbox.js";
import { loadWorkspaceSkillEntries, resolveSkillsPromptForRun } from "../../../skills.js";
import { resolveBootstrapContextForRun, makeBootstrapWarn } from "../../../bootstrap-files.js";
import { log } from "../logger.js";
import { DEFAULT_BOOTSTRAP_FILENAME } from "../../../workspace.js";

export async function resolveRunContext(params: EmbeddedRunAttemptParams, effectiveWorkspace: string) {
    const sandboxSessionKey = params.sessionKey?.trim() || params.sessionId;
    const sandbox = await resolveSandboxContext({
        config: params.config,
        sessionKey: sandboxSessionKey,
        workspaceDir: params.workspaceDir, // Use original here as sandbox will decide
    });

    const shouldLoadSkillEntries = !params.skillsSnapshot || !params.skillsSnapshot.resolvedSkills;
    const skillEntries = shouldLoadSkillEntries
        ? loadWorkspaceSkillEntries(effectiveWorkspace)
        : [];

    const skillsPrompt = resolveSkillsPromptForRun({
        skillsSnapshot: params.skillsSnapshot,
        entries: shouldLoadSkillEntries ? skillEntries : undefined,
        config: params.config,
        workspaceDir: effectiveWorkspace,
    });

    const sessionLabel = params.sessionKey ?? params.sessionId;
    const { bootstrapFiles, contextFiles } = await resolveBootstrapContextForRun({
        workspaceDir: effectiveWorkspace,
        config: params.config,
        sessionKey: params.sessionKey,
        sessionId: params.sessionId,
        warn: makeBootstrapWarn({ sessionLabel, warn: (message) => log.warn(message) }),
    });

    const workspaceNotes = bootstrapFiles.some(
        (file) => file.name === DEFAULT_BOOTSTRAP_FILENAME && !file.missing,
    )
        ? ["Reminder: commit your changes in this workspace after edits."]
        : undefined;

    return {
        sandbox,
        skillEntries,
        skillsPrompt,
        bootstrapFiles,
        contextFiles,
        workspaceNotes,
    };
}
