import { spawn } from "node:child_process";

/**
 * Represents a physical or virtual camera device.
 */
export interface CameraDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  captureFrame(): Promise<Buffer>; // JPEG Frame
}

/**
 * Represents a microphone device capable of reading raw audio blocks.
 */
export interface MicrophoneDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  readAudio(): Promise<Buffer>; // PCM Chunk
}

/**
 * Represents a speaker device capable of playing raw audio blocks.
 */
export interface SpeakerDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  playAudio(chunk: Buffer): Promise<void>;
}

/**
 * Mock implementation of a Camera Device for virtual environments.
 */
export class VirtualCamera implements CameraDevice {
  async open(): Promise<void> {}
  async close(): Promise<void> {}
  async captureFrame(): Promise<Buffer> {
    // Return blank frame or last known frame
    return Buffer.alloc(0);
  }
}

/**
 * System level microphone proxy utilizing ffmpeg underneath.
 * Extracts PCM audio streams for the framework.
 */
export class SystemMicrophone implements MicrophoneDevice {
  private ffProcess: any = null;
  private audioQueue: Buffer[] = [];

  constructor(private mode: "mic-only" | "meeting" = "mic-only") {}

  async open(): Promise<void> {
    // Ported from Synthotic App: High-performance mixing for meetings
    // On macOS, we use 'avfoundation'. On Windows it would be 'dshow'.
    const isMac = process.platform === "darwin";
    const inputDevice = isMac ? ":0" : "audio=default";

    const args = isMac
      ? ["-f", "avfoundation", "-i", inputDevice, "-ar", "16000", "-ac", "1", "-f", "s16le", "-"]
      : ["-f", "dshow", "-i", inputDevice, "-ar", "16000", "-ac", "1", "-f", "s16le", "-"];

    // MEETING MODE: Mix system loopback
    if (this.mode === "meeting") {
      const loopbackInput = isMac ? "1" : "audio=Stereo Mix";
      args.splice(2, 0, "-f", isMac ? "avfoundation" : "dshow", "-i", loopbackInput);
      args.push(
        "-filter_complex",
        "[0:a]volume=1.0[a0];[1:a]volume=1.2[a1];[a0][a1]amerge=inputs=2,pan=mono|c0=c0+c1[out]",
        "-map",
        "[out]",
      );
    }

    if (this.ffProcess) {
      this.ffProcess.kill();
    }

    this.ffProcess = spawn("ffmpeg", args);

    this.ffProcess.on("error", (_err: Error) => {
      this.ffProcess = null;
      // SILENT FAIL: Virtual peripherals should not crash the main thread
    });

    this.ffProcess.stdout.on("data", (chunk: Buffer) => {
      this.audioQueue.push(chunk);
      if (this.audioQueue.length > 100) this.audioQueue.shift();
    });

    this.ffProcess.stderr.on("data", (_data: Buffer) => {
      // Debug log hidden to avoid cluttering but available for troubleshooting
    });
  }

  async close(): Promise<void> {
    if (this.ffProcess) {
      this.ffProcess.kill();
      this.ffProcess = null;
    }
  }

  async readAudio(): Promise<Buffer> {
    if (this.audioQueue.length === 0) {
      return Buffer.alloc(1024);
    }
    return this.audioQueue.shift()!;
  }
}

/**
 * Mock implementation for virtual microphones.
 */
export class VirtualMicrophone extends SystemMicrophone {}

/**
 * Mock implementation for virtual speakers.
 */
export class VirtualSpeaker implements SpeakerDevice {
  async open(): Promise<void> {}
  async close(): Promise<void> {}
  async playAudio(_chunk: Buffer): Promise<void> {
    // Playback logic would go here
  }
}
