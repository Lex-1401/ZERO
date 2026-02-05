/**
 * Voice VAD (Voice Activity Detection) Shim
 * Emulates local VAD processing. ideally this wraps a WASM module like Silero VAD.
 */
export class VoiceVAD {
  private processing = false;

  start() {
    this.processing = true;
    console.log("[Voice] VAD started.");
  }

  stop() {
    this.processing = false;
    console.log("[Voice] VAD stopped.");
  }

  // Simulations for 'speech start' and 'speech end' events
  onSpeechStart(callback: () => void) {
    if (this.processing && Math.random() > 0.8) callback();
  }
}
