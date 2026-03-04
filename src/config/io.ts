
/**
 * Configuration I/O
 *
 * Implements loading, saving, and monitoring for the platform configuration.
 * Delegated to src/config/io/ for maintainability and Atomic Modularity.
 */

import { type ZEROConfig } from "./config.js";
import { type ConfigIoDeps, type ParseConfigJson5Result } from "./io/types.js";
import { createConfigIO as create, parseConfigJson5 as parse } from "./io/factory.js";

export type { ConfigIoDeps, ParseConfigJson5Result };

export function createConfigIO(overrides: ConfigIoDeps = {}) {
  return create(overrides);
}

export function parseConfigJson5(raw: string): ParseConfigJson5Result {
  return parse(raw);
}

export function loadConfig(): ZEROConfig {
  const io = create();
  return io.loadConfig();
}

export async function readConfigFileSnapshot(): Promise<any> {
  const io = create();
  return await io.readConfigFileSnapshot();
}

export async function writeConfigFile(cfg: ZEROConfig): Promise<void> {
  const io = create();
  await io.writeConfigFile(cfg);
}

export function hashConfigRaw(raw: string | null): string {
  return raw || ""; // Simplified
}
