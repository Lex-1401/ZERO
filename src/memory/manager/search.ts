
import { type MemorySearchResult } from "../manager.types.js";

export async function searchMemory(_params: {
    query: string;
    maxResults?: number;
    minScore?: number;
}): Promise<MemorySearchResult[]> {
    // Logic for vector and keyword search merge.
    return [];
}
