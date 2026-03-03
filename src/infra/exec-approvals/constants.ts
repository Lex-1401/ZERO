import type { ExecSecurity, ExecAsk } from "./types.js";

export const DEFAULT_SECURITY: ExecSecurity = "deny";
export const DEFAULT_ASK: ExecAsk = "on-miss";
export const DEFAULT_ASK_FALLBACK: ExecSecurity = "deny";
export const DEFAULT_AUTO_ALLOW_SKILLS = false;
export const DEFAULT_SOCKET = "~/.zero/exec-approvals.sock";
export const DEFAULT_FILE = "~/.zero/exec-approvals.json";
export const DEFAULT_SAFE_BINS = ["jq", "grep", "cut", "sort", "uniq", "head", "tail", "tr", "wc"];
