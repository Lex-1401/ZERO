// @ts-nocheck

import fs from "node:fs/promises";
import path from "node:path";
import { log } from "../logger.js";

export async function loadSpeculativeContext(prompt: string, effectiveWorkspace: string) {
    let speculativeContext = "";
    if (prompt && prompt.length > 5) {
        const fileMatches = prompt.match(/[a-zA-Z0-9_\-./]+\.(ts|js|sh|md|json|css|tsx|jsx)/g);
        if (fileMatches && fileMatches.length > 0) {
            const uniqueMatches = Array.from(new Set(fileMatches));
            for (const fileRelPath of uniqueMatches.slice(0, 5)) {
                try {
                    const absPath = path.resolve(effectiveWorkspace, fileRelPath);
                    if (absPath.startsWith(effectiveWorkspace)) {
                        const stats = await fs.stat(absPath);
                        if (stats.isFile() && stats.size < 100_000) {
                            const content = await fs.readFile(absPath, "utf-8");
                            speculativeContext += `\n### Speculative Context: ${fileRelPath}\n${content.substring(0, 8000)}\n`;
                            log.debug(`IA Pre-warming: Injected context for ${fileRelPath}`);
                        }
                    }
                } catch {
                    // Speculative lookup: ignore errors
                }
            }
        }
    }
    return speculativeContext;
}
