/**
 * @zero/ratchet — Native Rust bindings for ZERO security and inference engines.
 *
 * This file is auto-generated from the napi-rs build output.
 * Do not edit manually; run `pnpm build` inside `rust-core/` to regenerate.
 */

/** LLM01 / LLM06: Security Engine — Prompt injection detection and PII redaction. */
export declare class SecurityEngine {
    constructor();
    /** Detects prompt injection attempts. Returns a description string if detected, null otherwise. */
    detectInjection(text: string): string | null;
    /** Redacts PII and sensitive data from the given text. */
    redactPii(text: string): string;
    /** Calculates Shannon entropy of a string (used for high-entropy secret detection). */
    calculateEntropy(text: string): number;
}

/** Voice Activity Detection engine powered by high-performance native Rust core. */
export declare class VadEngine {
    /**
     * @param threshold        - Energy threshold for speech detection (default 500).
     * @param silenceTimeoutMs - Silence duration before declaring end-of-speech (default 800).
     */
    constructor(threshold?: number, silenceTimeoutMs?: number);
    /**
     * Samples a chunk of PCM 16-bit audio and returns the activity status.
     * @returns 'speech' | 'silent' | 'speech_start' | 'speech_end' | 'panic'
     */
    processChunk(chunk: Buffer): string;
    /** Last computed RMS energy level (used for backchannel heuristics). */
    readonly lastRms: number;
}

/** Backchannel VAD engine (alternate voice activity model). */
export declare class BackchannelEngine {
    constructor(threshold?: number, silenceTimeoutMs?: number);
    processChunk(chunk: Buffer): string;
    /**
     * Processes RMS energy level for backchannel heuristics.
     * @returns true if a backchannel reaction should be triggered.
     */
    processEnergy(rms: number): boolean;
}

/** High-performance token / latency metrics engine. */
export declare class MetricsEngine {
    constructor();
    recordTokens(model: string, count: number): void;
    recordLatency(ms: number): void;
    /** Returns a structured summary of collected metrics. */
    summarize(): MetricsSummary;
}

/** Deduplification cache backed by a Rust hash-map with TTL eviction. */
export declare class RatchetDedupe {
    constructor(ttlMs: number, maxSize: number);
    /** Returns true if the key was seen within the TTL window (performs upsert). */
    check(key: string, now?: number): boolean;
    /** Clears all cached entries. */
    clear(): void;
    /** Returns the current number of cached entries. */
    size(): number;
}

/** Opaque token metric entry (used internally by MetricsEngine). */
export declare class ModelMetric {
    readonly model: string;
    readonly tokens: number;
}

/** Structured summary returned by MetricsEngine.summarize(). */
export declare class MetricsSummary {
    readonly totalTokens: number;
    readonly avgLatencyMs: number;
    readonly models: ModelMetric[];
}

/** Triggers a global Rust-level panic / emergency lockdown. */
export declare function triggerPanic(reason: string): void;

/** Resets the global panic flag (admin / test use). */
export declare function resetPanic(): void;

/** Returns true if the system is currently in panic / emergency lockdown mode. */
export declare function isPanicMode(): boolean;
