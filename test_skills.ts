import { loadConfig } from "./src/config/config.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "./src/agents/agent-scope.js";
import { loadWorkspaceSkillEntries } from "./src/agents/skills.js";

const cfg = loadConfig();
const workspaceDir = resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg));
const entries = loadWorkspaceSkillEntries(workspaceDir, { config: cfg });

console.log(`Found ${entries.length} skills`);
for (const entry of entries) {
    console.log(`- ${entry.skill.name}: ${entry.skill.description}`);
}
