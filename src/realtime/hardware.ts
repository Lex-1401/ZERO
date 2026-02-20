import { spawn } from "node:child_process";

export interface CameraDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  captureFrame(): Promise<Buffer>; // JPEG Frame
}

export interface MicrophoneDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  readAudio(): Promise<Buffer>; // PCM Chunk
}

export interface SpeakerDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  playAudio(chunk: Buffer): Promise<void>;
}

export class VirtualCamera implements CameraDevice {
  async open(): Promise<void> {
    console.log("[VirtualCamera] Opened");
  }
  async close(): Promise<void> {
    console.log("[VirtualCamera] Closed");
  }
  async captureFrame(): Promise<Buffer> {
    // Return blank frame or last known frame
    return Buffer.alloc(0);
  }
}

export class SystemMicrophone implements MicrophoneDevice {
  private ffProcess: any = null;
  private audioQueue: Buffer[] = [];

  constructor(private mode: "mic-only" | "meeting" = "mic-only") {}

  async open(): Promise<void> {
    console.log(`[Hardware] Opening Microphone in ${this.mode} mode...`);

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

    this.ffProcess = spawn("ffmpeg", args);

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
    console.log("[Hardware] Microphone closed.");
  }

  async readAudio(): Promise<Buffer> {
    if (this.audioQueue.length === 0) {
      return Buffer.alloc(1024);
    }
    return this.audioQueue.shift()!;
  }
}

export class VirtualMicrophone extends SystemMicrophone {}

export class VirtualSpeaker implements SpeakerDevice {
  async open(): Promise<void> {
    console.log("[VirtualSpeaker] Opened");
  }
  async close(): Promise<void> {
    console.log("[VirtualSpeaker] Closed");
  }
  async playAudio(_chunk: Buffer): Promise<void> {
    // Playback logic would go here
  }
}
