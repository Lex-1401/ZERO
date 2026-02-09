export type RoleCronJob = {
  /** Cron expression (e.g. "* * * * *") */
  schedule: string;
  /** Action type: "message" or "tool" */
  action: "message" | "tool";
  /** If action is message, this is the text to send */
  message?: string;
  /** If action is tool, this is the tool name */
  tool?: string;
  /** If action is tool, these are the arguments */
  params?: Record<string, unknown>;
  /** Description for display/system prompt */
  description?: string;
};

export interface RoleDefinition {
  /** Unique name of the role (e.g. "analyst", "developer") */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Additional system prompt instructions to inject */
  systemPrompt?: string;
  /** List of skill names to auto-activate or suggest */
  skills?: string[];
  /** Pre-configured background tasks */
  cronJobs?: RoleCronJob[];
  /** Preferred model configuration */
  model?: {
    chat?: string;
    thinking?: string;
    image?: string;
  };
  /** Tool preferences/restrictions */
  tools?: {
    allowlist?: string[];
    blocklist?: string[];
    defaults?: string[];
  };
}
