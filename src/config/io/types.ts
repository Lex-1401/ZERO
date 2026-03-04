
import fs from "node:fs";

export interface ConfigIoDeps {
    fs?: typeof fs;
    json5?: any;
    env?: NodeJS.ProcessEnv;
    homedir?: () => string;
    configPath?: string;
    logger?: any;
}

export type ParseConfigJson5Result =
    | { ok: true; parsed: unknown }
    | { ok: false; error: string };
