
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../../agents/agent-scope.js";
import { type ZEROConfig } from "../../config/config.js";
import {
    buildWorkspaceHookStatus,
    type HookStatusReport,
} from "../../hooks/hooks-status.js";
import { type HookEntry } from "../../hooks/types.js";
import { loadWorkspaceHookEntries } from "../../hooks/workspace.js";
import { buildPluginStatusReport } from "../../plugins/status.js";
import { loadConfig, writeConfigFile } from "../../config/io.js";
import { theme } from "../../terminal/theme.js";
import { defaultRuntime } from "../../runtime.js";

function mergeHookEntries(pluginEntries: HookEntry[], workspaceEntries: HookEntry[]): HookEntry[] {
    const merged = new Map<string, HookEntry>();
    for (const entry of pluginEntries) merged.set(entry.hook.name, entry);
    for (const entry of workspaceEntries) merged.set(entry.hook.name, entry);
    return Array.from(merged.values());
}

export function buildHooksReport(config: ZEROConfig): HookStatusReport {
    const workspaceDir = resolveAgentWorkspaceDir(config, resolveDefaultAgentId(config));
    const workspaceEntries = loadWorkspaceHookEntries(workspaceDir, { config });
    const pluginReport = buildPluginStatusReport({ config, workspaceDir });
    const pluginEntries = pluginReport.hooks.map((hook) => hook.entry);
    const entries = mergeHookEntries(pluginEntries, workspaceEntries);
    return buildWorkspaceHookStatus(workspaceDir, { config, entries });
}

export async function enableHook(hookName: string): Promise<void> {
    const config = loadConfig();
    const report = buildHooksReport(config);
    const hook = report.hooks.find((h) => h.name === hookName);
    if (!hook) throw new Error(`Hook "${hookName}" não encontrado`);
    if (hook.managedByPlugin) throw new Error("Gerenciado por plugin.");
    if (!hook.eligible) throw new Error("Requisitos ausentes.");

    const entries = { ...config.hooks?.internal?.entries };
    entries[hookName] = { ...entries[hookName], enabled: true };
    const nextConfig = { ...config, hooks: { ...config.hooks, internal: { ...config.hooks?.internal, enabled: true, entries } } };
    await writeConfigFile(nextConfig);
    defaultRuntime.log(`${theme.success("✓")} Hook ativado: ${hook.emoji ?? "🔗"} ${theme.command(hookName)}`);
}

export async function disableHook(hookName: string): Promise<void> {
    const config = loadConfig();
    const report = buildHooksReport(config);
    const hook = report.hooks.find((h) => h.name === hookName);
    if (!hook) throw new Error(`Hook "${hookName}" não encontrado`);

    const entries = { ...config.hooks?.internal?.entries };
    entries[hookName] = { ...entries[hookName], enabled: false };
    const nextConfig = { ...config, hooks: { ...config.hooks, internal: { ...config.hooks?.internal, entries } } };
    await writeConfigFile(nextConfig);
    defaultRuntime.log(`${theme.warn("⏸")} Hook desativado: ${hook.emoji ?? "🔗"} ${theme.command(hookName)}`);
}
