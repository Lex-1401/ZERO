
import crypto from "node:crypto";
import fs from "node:fs";
import {
    resolveAgentIdFromSessionKey,
    resolveSessionFilePath,
    resolveSessionTranscriptPath,
    type SessionEntry,
    updateSessionStore,
} from "../../../config/sessions.js";
import { defaultRuntime } from "../../../runtime.js";

export type SessionResetOptions = {
    failureLabel: string;
    buildLogMessage: (nextSessionId: string) => string;
    cleanupTranscripts?: boolean;
};

export async function resetSession(params: {
    sessionKey: string | undefined;
    activeSessionStore: Record<string, SessionEntry> | undefined;
    activeSessionEntry: SessionEntry | undefined;
    storePath: string | undefined;
    sessionCtx: any;
    followupRun: any;
    options: SessionResetOptions;
}) {
    const {
        sessionKey,
        activeSessionStore,
        activeSessionEntry,
        storePath,
        sessionCtx,
        followupRun,
        options,
    } = params;
    const { failureLabel, buildLogMessage, cleanupTranscripts } = options;

    if (!sessionKey || !activeSessionStore || !storePath) return null;
    const prevEntry = activeSessionStore[sessionKey] ?? activeSessionEntry;
    if (!prevEntry) return null;

    const prevSessionId = cleanupTranscripts ? prevEntry.sessionId : undefined;
    const nextSessionId = crypto.randomUUID();
    const nextEntry: SessionEntry = {
        ...prevEntry,
        sessionId: nextSessionId,
        updatedAt: Date.now(),
        systemSent: false,
        abortedLastRun: false,
    };
    const agentId = resolveAgentIdFromSessionKey(sessionKey);
    const nextSessionFile = resolveSessionTranscriptPath(
        nextSessionId,
        agentId,
        sessionCtx.MessageThreadId,
    );
    nextEntry.sessionFile = nextSessionFile;
    activeSessionStore[sessionKey] = nextEntry;

    try {
        await updateSessionStore(storePath, (store) => {
            store[sessionKey] = nextEntry;
        });
    } catch (err) {
        defaultRuntime.error(
            `Failed to persist session reset after ${failureLabel} (${sessionKey}): ${String(err)}`,
        );
    }

    followupRun.run.sessionId = nextSessionId;
    followupRun.run.sessionFile = nextSessionFile;
    defaultRuntime.error(buildLogMessage(nextSessionId));

    if (cleanupTranscripts && prevSessionId) {
        const transcriptCandidates = new Set<string>();
        const resolved = resolveSessionFilePath(prevSessionId, prevEntry, { agentId });
        if (resolved) transcriptCandidates.add(resolved);
        transcriptCandidates.add(resolveSessionTranscriptPath(prevSessionId, agentId));
        for (const candidate of transcriptCandidates) {
            try {
                fs.unlinkSync(candidate);
            } catch {
                // Best-effort cleanup.
            }
        }
    }

    return { nextEntry, nextSessionId };
}
