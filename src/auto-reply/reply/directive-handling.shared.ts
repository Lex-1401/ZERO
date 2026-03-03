import { formatCliCommand } from "../../cli/command-format.js";
import type { ElevatedLevel, ReasoningLevel } from "./directives.js";

export const SYSTEM_MARK = "⚙️";

export const formatDirectiveAck = (text: string): string => {
  if (!text) return text;
  if (text.startsWith(SYSTEM_MARK)) return text;
  return `${SYSTEM_MARK} ${text}`;
};

export const formatOptionsLine = (options: string) => `Options: ${options}.`;
export const withOptions = (line: string, options: string) =>
  `${line}\n${formatOptionsLine(options)}`;

export const formatElevatedRuntimeHint = () =>
  `${SYSTEM_MARK} Runtime is direct; sandbox does not apply.`;

export const formatElevatedEvent = (level: ElevatedLevel) => {
  if (level === "full") {
    return "Elevated FULL — execution occurs on host with auto-approval.";
  }
  if (level === "ask" || level === "on") {
    return "Elevated ASK — execution occurs on host; approvals may still apply.";
  }
  return "Elevated OFF — execution remains in sandbox.";
};

export const formatReasoningEvent = (level: ReasoningLevel) => {
  if (level === "stream") return "Reasoning STREAM — live <think> enabled.";
  if (level === "on") return "Reasoning ON — includes <think>.";
  return "Reasoning OFF — hides <think>.";
};

export function formatElevatedUnavailableText(params: {
  runtimeSandboxed: boolean;
  failures?: Array<{ gate: string; key: string }>;
  sessionKey?: string;
}): string {
  const lines: string[] = [];
  lines.push(
    `elevated mode is currently unavailable (runtime=${params.runtimeSandboxed ? "sandboxed" : "direct"}).`,
  );
  const failures = params.failures ?? [];
  if (failures.length > 0) {
    lines.push(`Failed gates: ${failures.map((f) => `${f.gate} (${f.key})`).join(", ")}`);
  } else {
    lines.push(
      "Correction keys: tools.elevated.enabled, tools.elevated.allowFrom.<provider>, agents.list[].tools.elevated.*",
    );
  }
  if (params.sessionKey) {
    lines.push(`See: ${formatCliCommand(`zero sandbox explain --session ${params.sessionKey}`)}`);
  }
  return lines.join("\n");
}
