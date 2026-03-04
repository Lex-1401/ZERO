// @ts-nocheck

import { HookStatusReport, HookStatusEntry } from "./types.js";
import { type ZEROConfig } from "../../config/zod-schema.js";
import { saveConfig } from "../../config/io.js";

export function buildHooksReport(config: ZEROConfig): HookStatusReport {
    const entries: HookStatusEntry[] = [];
    const hooks = config.hooks ?? {};
    for (const [name, hook] of Object.entries(hooks)) {
        entries.push({
            name,
            source: "config",
            enabled: hook.enabled ?? false,
            active: hook.enabled ?? false, // simplified for this extraction
            description: "N/A",
        });
    }

    const summary = {
        total: entries.length,
        enabled: entries.filter((e) => e.enabled).length,
        active: entries.filter((e) => e.active).length,
        error: 0,
    };

    return { entries, summary };
}

export async function enableHook(hookName: string, config: ZEROConfig): Promise<void> {
    if (!config.hooks) config.hooks = {};
    if (!config.hooks[hookName]) {
        config.hooks[hookName] = { enabled: true };
    } else {
        config.hooks[hookName].enabled = true;
    }
    await saveConfig(config);
}

export async function disableHook(hookName: string, config: ZEROConfig): Promise<void> {
    if (config.hooks?.[hookName]) {
        config.hooks[hookName].enabled = false;
        await saveConfig(config);
    }
}
