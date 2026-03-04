
import { type HealthSummary } from "./types.js";

export function formatDurationParts(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
}

export function styleHealthChannelLine(line: string): string {
    // Logic to apply colors to health status lines
    return line;
}

export function formatHealthChannelLines(_summary: HealthSummary): string[] {
    const lines: string[] = [];
    // Logic to format rows for the health table
    return lines;
}
