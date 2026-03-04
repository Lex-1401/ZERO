
/**
 * Execution Approval Analysis
 *
 * Implements safety checks and allowlist evaluation for agent command executions.
 * Delegated to src/infra/exec-approvals/ for maintainability and Atomic Modularity.
 */

import {
  type ExecCommandAnalysis,
  type ExecAllowlistEntry,
  type ExecAllowlistAnalysis,
  type ExecCommandSegment,
} from "./types.js";
import { splitShellPipeline, iterateQuoteAware, globToRegExp } from "./utils.js";
import { evaluateExecAllowlist, isSafeBinUsage } from "./evaluator.js";

export { splitShellPipeline, iterateQuoteAware, globToRegExp, evaluateExecAllowlist, isSafeBinUsage };

export function analyzeShellCommand(params: {
  command: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}): ExecCommandAnalysis {
  // Logic to split and tokenize shell commands
  const pipeline = splitShellPipeline(params.command);
  const segments: ExecCommandSegment[] = pipeline.ok
    ? pipeline.segments.map((s) => ({
      raw: s,
      argv: s.split(" "),
      resolution: null,
    }))
    : [];
  return {
    ok: pipeline.ok,
    segments,
    reason: pipeline.ok ? undefined : "Failed to parse pipeline",
  };
}

export function evaluateShellAllowlist(params: {
  command: string;
  allowlist: ExecAllowlistEntry[];
  safeBins: Set<string>;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}): ExecAllowlistAnalysis {
  const analysis = analyzeShellCommand({
    command: params.command,
    cwd: params.cwd,
    env: params.env,
  });
  const evalResult = evaluateExecAllowlist({
    analysis,
    allowlist: params.allowlist,
    safeBins: params.safeBins,
    cwd: params.cwd,
  });
  return {
    analysisOk: analysis.ok,
    allowlistSatisfied: evalResult.allowlistSatisfied,
    allowlistMatches: evalResult.allowlistMatches,
    segments: analysis.segments,
  };
}
