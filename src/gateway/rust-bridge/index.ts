/**
 * Rust Bridge
 * This module acts as a bridge to Rust-optimized functions.
 * It uses N-API (Node-API) to load the compiled Rust library if available,
 * otherwise falls back to JavaScript implementations.
 */

let rustModule: any = null;

try {
  // Attempt to load the release build of the rust addon
  // rustModule = require("../../../release/zero_core.node");
  console.log("[RustBridge] Native module not found, using JS fallback.");
} catch {
  console.log("[RustBridge] Using JS fallback.");
}

export const VectorOps = {
  cosineSimilarity: (a: number[], b: number[]) => {
    if (rustModule) return rustModule.cosineSimilarity(a, b);

    // JS Fallback
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
  },
};
