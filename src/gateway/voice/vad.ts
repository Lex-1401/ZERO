import { VadEngine } from "@zero/ratchet";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("gateway/voice/vad");

/**
 * Voice VAD (Voice Activity Detection)
 * Powered by high-performance native Rust core.
 */
export class VoiceVAD {
  private engine: VadEngine | null = null;
  private processing = false;

  constructor(threshold = 500, silenceTimeoutMs = 800) {
    try {
      this.engine = new VadEngine(threshold, silenceTimeoutMs);
    } catch (err) {
      log.warn("Failed to initialize native VAD engine:", { error: String(err) });
    }
  }

  start() {
    this.processing = true;
    log.info("VAD started.");
  }

  stop() {
    this.processing = false;
    log.info("VAD stopped.");
  }

  /**
   * Samples a chunk of audio and returns the activity status.
   * @param chunk - PCM 16-bit audio buffer.
   */
  processChunk(chunk: Buffer): string {
    if (!this.processing || !this.engine) return "silent";
    try {
      return this.engine.processChunk(chunk);
    } catch (err) {
      log.error("VAD processing error:", { error: String(err) });
      return "silent";
    }
  }

  // Legacy shim simulation (kept for minimal API compatibility)
  onSpeechStart(callback: () => void) {
    if (this.processing && !this.engine) {
      if (Math.random() > 0.8) callback();
    }
  }
}
