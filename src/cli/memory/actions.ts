
import { type Command } from "commander";
import { type MemoryCommandOptions } from "./types.js";

export async function runMemoryStatus(_opts: MemoryCommandOptions) {
    // Logic to display memory status and reindex if requested.
    // Omitted for brevity in this stage, will be copied from original.
}

export function registerMemoryCli(program: Command) {
    program
        .command("memory")
        .option("-a, --agent <id>", "Agent ID")
        .option("--json", "JSON output")
        .action(runMemoryStatus);
}
