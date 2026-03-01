export const OUTPUT_CAP = 200_000;
export const OUTPUT_EVENT_TAIL = 20_000;
export const DEFAULT_NODE_PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";
export const BROWSER_PROXY_MAX_FILE_BYTES = 10 * 1024 * 1024;

export const blockedEnvKeys = new Set([
    "NODE_OPTIONS",
    "PYTHONHOME",
    "PYTHONPATH",
    "PERL5LIB",
    "PERL5OPT",
    "RUBYOPT",
]);

export const blockedEnvPrefixes = ["DYLD_", "LD_"];
