import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const LOG_FILE = "/private/tmp/zero/zero-2026-02-11.log";

console.log(`[Sentinela] Monitorando logs em: ${LOG_FILE}`);

if (!fs.existsSync(LOG_FILE)) {
    console.log("[Sentinela] Aguardando criação do arquivo de log...");
}

function startTail() {
    const stream = fs.createReadStream(LOG_FILE, { flags: "r", start: fs.statSync(LOG_FILE).size });
    const rl = readline.createInterface({
        input: stream,
        terminal: false
    });

    rl.on("line", (line) => {
        try {
            const parsed = JSON.parse(line);
            const message = parsed["0"] || parsed.message || "";
            const level = parsed.logLevelName || parsed.level || "INFO";

            if (level === "WARN" || level === "ERROR" || level === "FATAL" || message.includes("blocked") || message.includes("Injection")) {
                console.log(`\x1b[31m[ ALERT ]\x1b[0m ${new Date().toLocaleTimeString()} | ${level} | ${message}`);
            }
        } catch (e) {
            // Not JSON or parse error
        }
    });

    fs.watchFile(LOG_FILE, (curr, prev) => {
        if (curr.size > prev.size) {
            // More data added? Redo tailing if stream closed or just rely on append?
            // Actually for simplicity, let's just use tail -f via run_command later
        }
    });
}

// Since I have access to run_command, I'll just use a robust grep loop instead of this complex script.
