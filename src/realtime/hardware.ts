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

export class VirtualMicrophone implements MicrophoneDevice {
  async open(): Promise<void> {
    console.log("[VirtualMicrophone] Opened");
  }
  async close(): Promise<void> {
    console.log("[VirtualMicrophone] Closed");
  }
  async readAudio(): Promise<Buffer> {
    // Return silence
    return Buffer.alloc(1024);
  }
}
