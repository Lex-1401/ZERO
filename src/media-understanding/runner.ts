import {
  findModelInCatalog,
  loadModelCatalog,
  modelSupportsVision,
} from "../agents/model-catalog.js";
import type { MsgContext } from "../auto-reply/templating.js";
import { logVerbose, shouldLogVerbose } from "../globals.js";
import { resolveModelEntries, resolveScopeDecision } from "./resolve.js";
import type {
  MediaAttachment,
  MediaUnderstandingCapability,
  MediaUnderstandingDecision,
  MediaUnderstandingOutput,
  MediaUnderstandingProvider,
} from "./types.js";
import { buildMediaUnderstandingRegistry } from "./providers/index.js";
import { MediaAttachmentCache, normalizeAttachments, selectAttachments } from "./attachments.js";

import type { ZEROConfig } from "../config/config.js";
import type { ActiveMediaModel, ProviderRegistry, RunCapabilityResult } from "./runner/types.js";
import { resolveAutoEntries } from "./runner/resolvers.js";
import { runAttachmentEntries } from "./runner/execution.js";
function formatDecisionSummary(decision: any) { return JSON.stringify(decision); }

export type { ActiveMediaModel, RunCapabilityResult };

export function buildProviderRegistry(
  overrides?: Record<string, MediaUnderstandingProvider>,
): ProviderRegistry {
  return buildMediaUnderstandingRegistry(overrides) as any;
}

export function normalizeMediaAttachments(ctx: MsgContext): MediaAttachment[] {
  return normalizeAttachments(ctx);
}

export function createMediaAttachmentCache(attachments: MediaAttachment[]): MediaAttachmentCache {
  return new MediaAttachmentCache(attachments);
}

export async function runCapability(params: {
  capability: MediaUnderstandingCapability;
  cfg: ZEROConfig;
  ctx: MsgContext;
  attachments: MediaAttachmentCache;
  media: MediaAttachment[];
  agentDir?: string;
  providerRegistry: ProviderRegistry;
  config?: any; // MediaUnderstandingConfig
  activeModel?: ActiveMediaModel;
}): Promise<RunCapabilityResult> {
  const { capability, cfg, ctx } = params;
  const config = params.config ?? cfg.tools?.media?.[capability];
  if (config?.enabled === false) {
    return {
      outputs: [],
      decision: { capability, outcome: "disabled", attachments: [] },
    };
  }

  const attachmentPolicy = config?.attachments;
  const selected = selectAttachments({
    capability,
    attachments: params.media,
    policy: attachmentPolicy,
  });
  if (selected.length === 0) {
    return {
      outputs: [],
      decision: { capability, outcome: "no-attachment", attachments: [] },
    };
  }

  const scopeDecision = resolveScopeDecision({ scope: config?.scope, ctx });
  if (scopeDecision === "deny") {
    if (shouldLogVerbose()) {
      logVerbose(`${capability} understanding disabled by scope policy.`);
    }
    return {
      outputs: [],
      decision: {
        capability,
        outcome: "scope-deny",
        attachments: selected.map((item) => ({ attachmentIndex: item.index!, attempts: [] })),
      },
    };
  }

  const activeProvider = params.activeModel?.provider?.trim();
  if (capability === "image" && activeProvider) {
    const catalog = await loadModelCatalog({ config: cfg });
    const entry = findModelInCatalog(catalog, activeProvider, params.activeModel?.model ?? "");
    if (modelSupportsVision(entry)) {
      if (shouldLogVerbose()) {
        logVerbose("Skipping image understanding: primary model supports vision natively");
      }
      const model = params.activeModel?.model?.trim();
      const reason = "primary model supports vision natively";
      const attempt = {
        type: "provider" as const,
        provider: activeProvider,
        model: model || undefined,
        outcome: "skipped" as const,
        reason,
      };
      return {
        outputs: [],
        decision: {
          capability,
          outcome: "skipped",
          attachments: selected.map((item) => {
            return {
              attachmentIndex: item.index!,
              attempts: [attempt],
              chosen: attempt,
            };
          }),
        },
      };
    }
  }

  let resolvedEntries = resolveModelEntries({
    cfg,
    capability,
    config,
    providerRegistry: params.providerRegistry as any,
  });

  if (resolvedEntries.length === 0) {
    resolvedEntries = await resolveAutoEntries({
      cfg,
      agentDir: params.agentDir,
      providerRegistry: params.providerRegistry,
      capability,
      activeModel: params.activeModel,
    });
  }
  if (resolvedEntries.length === 0) {
    return {
      outputs: [],
      decision: {
        capability,
        outcome: "skipped",
        attachments: selected.map((item) => ({ attachmentIndex: item.index!, attempts: [] })),
      },
    };
  }

  const outputs: MediaUnderstandingOutput[] = [];
  const attachmentDecisions: MediaUnderstandingDecision["attachments"] = [];
  for (const attachment of selected) {
    const { output, attempts } = await runAttachmentEntries({
      capability,
      cfg,
      ctx,
      attachmentIndex: attachment.index!,
      agentDir: params.agentDir,
      providerRegistry: params.providerRegistry as any,
      cache: params.attachments,
      entries: resolvedEntries,
      config,
    });
    if (output) outputs.push(output);
    attachmentDecisions.push({
      attachmentIndex: attachment.index!,
      attempts,
      chosen: attempts.find((attempt) => attempt.outcome === "success"),
    });
  }
  const decision: MediaUnderstandingDecision = {
    capability,
    outcome: outputs.length > 0 ? "success" : "skipped",
    attachments: attachmentDecisions,
  };
  if (shouldLogVerbose()) {
    logVerbose(`Media understanding ${formatDecisionSummary(decision)}`);
  }
  if (outputs.length > 0) {
    console.log(`DEBUG: outputs for ${capability}:`, JSON.stringify(outputs, null, 2));
  }
  return {
    outputs,
    decision,
  };
}
