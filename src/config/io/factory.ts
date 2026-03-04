
import fs from "node:fs";
import path from "node:path";
import JSON5 from "json5";
import { type ConfigIoDeps, type ParseConfigJson5Result } from "./types.js";
import { type ZEROConfig } from "../types.js";
import { resolveConfigPath } from "../paths.js";
import { validateConfigObjectWithPlugins } from "../validation.js";
import { findLegacyConfigIssues } from "../legacy.js";

/**
 * Factory for Configuration I/O
 *
 * Provides methods to load and save the platform configuration.
 */
export function createConfigIO(overrides: ConfigIoDeps = {}) {
    const env = overrides.env ?? process.env;
    const configPathOverride = overrides.configPath;

    return {
        loadConfig: () => {
            const configPath = configPathOverride ?? resolveConfigPath(env);
            try {
                if (!fs.existsSync(configPath)) return {} as ZEROConfig;
                const raw = fs.readFileSync(configPath, "utf-8");
                const parsed = JSON5.parse(raw);
                const validated = validateConfigObjectWithPlugins(parsed);
                if (!validated.ok) {
                    const msg = (validated as any).issues?.[0]?.message || "Invalid config";
                    console.error(`[config] validation failed for ${configPath}: ${msg}`);
                    throw new Error(msg);
                }
                const config = validated.config;
                // Apply env vars from config
                const envVars = (config as any).env?.vars ?? (config as any).env ?? {};
                if (envVars && typeof envVars === "object") {
                    for (const [key, value] of Object.entries(envVars)) {
                        if (typeof key === "string" && typeof value === "string" && key !== "shellEnv" && key !== "vars") {
                            if (process.env[key] === undefined) {
                                process.env[key] = value;
                            }
                        }
                    }
                    if (envVars.vars && typeof envVars.vars === "object") {
                        for (const [key, value] of Object.entries(envVars.vars)) {
                            if (typeof key === "string" && typeof value === "string") {
                                if (process.env[key] === undefined) {
                                    process.env[key] = value;
                                }
                            }
                        }
                    }
                }
                return config;
            } catch (err: any) {
                if (err.message.includes("Duplicate agentDir")) throw err;
                return {} as ZEROConfig;
            }
        },
        readConfigFileSnapshot: async () => {
            const configPath = configPathOverride ?? resolveConfigPath(env);
            const exists = fs.existsSync(configPath);
            if (!exists) {
                const validated = validateConfigObjectWithPlugins({});
                return {
                    ok: true,
                    exists: false,
                    valid: true,
                    path: configPath,
                    config: (validated as any).config || {},
                    parsed: null,
                    issues: [],
                    legacyIssues: [],
                    warnings: [],
                };
            }
            try {
                const raw = fs.readFileSync(configPath, "utf-8");
                let parsed: any;
                try {
                    parsed = JSON5.parse(raw);
                } catch (err) {
                    return {
                        ok: false,
                        exists: true,
                        valid: false,
                        path: configPath,
                        error: String(err),
                        issues: [{ path: "", message: String(err) }],
                        legacyIssues: [],
                        warnings: [],
                    };
                }
                const legacyIssues = findLegacyConfigIssues(parsed);
                const validated = validateConfigObjectWithPlugins(parsed);
                return {
                    ok: true,
                    exists: true,
                    valid: validated.ok,
                    path: configPath,
                    config: validated.ok ? validated.config : ({} as ZEROConfig),
                    parsed,
                    issues: validated.ok ? [] : (validated as any).issues,
                    legacyIssues,
                    warnings: (validated as any).warnings || [],
                };
            } catch (err) {
                return {
                    ok: false,
                    exists: true,
                    valid: false,
                    path: configPath,
                    error: String(err),
                    issues: [{ path: "", message: String(err) }],
                    legacyIssues: [],
                    warnings: [],
                };
            }
        },
        writeConfigFile: async (cfg: ZEROConfig) => {
            const configPath = configPathOverride ?? resolveConfigPath(env);
            const dir = path.dirname(configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Rotate backups (5-deep ring)
            if (fs.existsSync(configPath)) {
                const MAX_BACKUPS = 5;
                // Remove oldest backup
                const oldest = `${configPath}.bak.${MAX_BACKUPS - 1}`;
                if (fs.existsSync(oldest)) fs.unlinkSync(oldest);
                // Shift existing backups
                for (let i = MAX_BACKUPS - 2; i >= 1; i--) {
                    const from = `${configPath}.bak.${i}`;
                    const to = `${configPath}.bak.${i + 1}`;
                    if (fs.existsSync(from)) fs.renameSync(from, to);
                }
                // Move .bak to .bak.1
                const bak = `${configPath}.bak`;
                if (fs.existsSync(bak)) fs.renameSync(bak, `${configPath}.bak.1`);
                // Move current to .bak
                fs.renameSync(configPath, bak);
            }
            const raw = JSON.stringify(cfg, null, 2);
            fs.writeFileSync(configPath, raw, "utf-8");
        },
    } as any;
}

export function parseConfigJson5(raw: string): ParseConfigJson5Result {
    try {
        return { ok: true, parsed: JSON5.parse(raw) };
    } catch (err) {
        return { ok: false, error: String(err) };
    }
}
