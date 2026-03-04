
import fs from "node:fs/promises";
import { resolveConfigPath } from "../test-helpers.mocks.js";

export async function readConfigFileSnapshot() {
    const configPath = resolveConfigPath();
    try {
        const raw = await fs.readFile(configPath, "utf-8");
        return { ok: true, raw, parsed: JSON.parse(raw) as Record<string, unknown> };
    } catch (err) {
        if ((err as any).code === "ENOENT") {
            return { ok: true, raw: null, parsed: null };
        }
        return { ok: false, error: String(err) };
    }
}
