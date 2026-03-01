/**
 * Gateway Metrics payload
 */
export interface ModelMetric {
    model: string;
    count: number;
}

export interface MetricsSummary {
    totalTokens: number;
    modelBreakdown: ModelMetric[];
    avgLatencyMs: number;
}

/**
 * Robust Native Security Engine.
 */
export class SecurityEngine {
    constructor();
    /** Scrutinizes text for adversarial prompt injection signatures. */
    detectInjection(text: string): string | null;
    /** Redacts PII from text */
    redactPii(text: string): string;
    /** Computes the Shannon Entropy of a string segment. */
    calculateEntropy(text: string): number;
}

/**
 * High-performance telemetry orchestrator.
 */
export class MetricsEngine {
    constructor();
    recordTokens(model: string, count: number): void;
    recordLatency(ms: number): void;
    summarize(): MetricsSummary;
}

/**
 * Real-time Voice Activity Detection (VAD) Engine.
 */
export class VadEngine {
    constructor(threshold: number, silenceTimeoutMs: number);
    get lastRms(): number;
    processChunk(chunk: Buffer | Uint8Array): string;
}

export class BackchannelEngine {
    constructor(historyLimit: number, cooldownMs: number);
    processEnergy(rms: number): boolean;
}

export class RatchetDedupe {
    constructor(ttlMs: number, maxSize: number);
    check(key: string, timestampMs?: number): boolean;
    clear(): void;
    size(): number;
}

export class HeartbeatManager {
    constructor(intervalMs: number);
    tick(): boolean;
    reset(): void;
}

export function triggerPanic(secret: string): void;
export function resetPanic(): void;
export function isPanicMode(): boolean;
