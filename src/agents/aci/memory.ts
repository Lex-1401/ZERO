
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExperienceMemory } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORY_FILE_PATH = path.join(__dirname, "browser-memory.json");

/**
 * Loads the Browser Memory from disk.
 * If file does not exist, returns an empty array.
 */
export async function loadBrowserMemory(): Promise<ExperienceMemory[]> {
    try {
        const data = await fs.readFile(MEMORY_FILE_PATH, "utf-8");
        return JSON.parse(data) as ExperienceMemory[];
    } catch (error: any) {
        if (error.code === "ENOENT") {
            return [];
        }
        throw error;
    }
}

/**
 * Stores a new experience memory entry.
 * Overwrites existing entry if taskId matches exactly.
 */
export async function saveBrowserMemory(memory: ExperienceMemory): Promise<void> {
    const allMemories = await loadBrowserMemory();
    const index = allMemories.findIndex((m) => m.taskId === memory.taskId);

    if (index >= 0) {
        allMemories[index] = memory;
    } else {
        allMemories.push(memory);
    }

    await fs.writeFile(MEMORY_FILE_PATH, JSON.stringify(allMemories, null, 2), "utf-8");
}

/**
 * Searches for a relevant experience based on description keywords.
 */
export async function retrieveRelevantExperience(query: string): Promise<ExperienceMemory | null> {
    const allMemories = await loadBrowserMemory();
    const keywords = query.toLowerCase().split(" ").filter((w) => w.length > 3);

    // Simple keyword matching score
    let bestMatch: ExperienceMemory | null = null;
    let maxScore = 0;

    for (const memory of allMemories) {
        let score = 0;
        const desc = memory.description.toLowerCase();

        for (const kw of keywords) {
            if (desc.includes(kw)) score++;
            if (memory.tags.some((tag) => tag.toLowerCase().includes(kw))) score += 2;
        }

        if (score > maxScore && score > 0) {
            maxScore = score;
            bestMatch = memory;
        }
    }

    return bestMatch;
}
