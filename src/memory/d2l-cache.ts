
/**
 * D2L Cache Manager (Context Caching)
 * 
 * Pragmatic implementation of D2L using provider-level context caching.
 * Uses the same hashing algorithm as the Rust Core for consistency.
 */

export type ContextCacheEntry = {
    id: string; // provider-specific cache id
    fingerprint: string;
    expiresAt: number;
};

export class D2LCache {
    /**
     * Calculates a fingerprint for a string using wrapping addition of char codes.
     * Matches the Rust Core SecurityEngine.calculate_entropy implementation.
     */
    static calculateFingerprint(text: string): string {
        let acc = BigInt(0);
        const MOD = BigInt("18446744073709551615"); // u64::MAX

        for (let i = 0; i < text.length; i++) {
            acc = (acc + BigInt(text.charCodeAt(i))) % (MOD + BigInt(1));
        }

        return acc.toString();
    }

    /**
     * Determines if a context should be cached based on size threshold (e.g. > 32k tokens).
     */
    static shouldCache(text: string, thresholdChars = 100000): boolean {
        return text.length > thresholdChars;
    }
}
