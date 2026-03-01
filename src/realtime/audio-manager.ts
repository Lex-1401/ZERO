import { EventEmitter } from "events";

/**
 * Manages buffering, chunking, and playback tracking for real-time
 * multimodal audio streams in a sequential manner.
 */
export class AudioSessionManager extends EventEmitter {
  private isPlaying = false;
  private audioQueue: Buffer[] = [];

  // Audio configuration for echo cancellation
  // In a real browser implementation, this would use AudioContext and MediaStream
  // On the server, this manages state.

  constructor() {
    super();
  }

  /**
   * Pushes a new raw audio chunk to the playback queue.
   */
  public pushToQueue(chunk: Buffer) {
    if (this.isPlaying) {
      // If we receive new audio while playing, we might append or drop depending on latency strategy
      this.audioQueue.push(chunk);
    } else {
      this.isPlaying = true;
      this.emit("play", chunk);
      // Simulate playback time based on buffer size
      setTimeout(() => this.finishPlayback(), 100);
    }
  }

  /**
   * Instantly halts active playback and flushes the remaining audio queue.
   */
  public interrupt() {
    // Clear queue and stop playback
    this.audioQueue = [];
    this.isPlaying = false;
    this.emit("stop");
  }

  private finishPlayback() {
    if (this.audioQueue.length > 0) {
      const next = this.audioQueue.shift();
      this.emit("play", next);
      setTimeout(() => this.finishPlayback(), 100);
    } else {
      this.isPlaying = false;
    }
  }
}
