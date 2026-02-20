import { spawn, ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import path from "node:path";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface WhisperResult {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export class WhisperEngine extends EventEmitter {
  private process: ChildProcess | null = null;
  private isReady = false;

  constructor() {
    super();
    this.init();
  }

  private init() {
    const pythonPath = process.env.PYTHON_PATH || "python3";
    const scriptPath = path.join(__dirname, "whisper-worker.py");

    console.log(`[WhisperEngine] Starting offline worker: ${scriptPath}`);

    this.process = spawn(pythonPath, [scriptPath], {
      stdio: ["pipe", "pipe", "inherit"],
    });

    this.process.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.status === "ready") {
            this.isReady = true;
            this.emit("ready");
            console.log("[WhisperEngine] Hybrid Neural Model loaded and ready (Offline Mode).");
          } else if (msg.type === "transcription") {
            this.emit("transcription", msg as WhisperResult);
          } else if (msg.type === "end_of_audio") {
            this.emit("end_of_audio");
          } else if (msg.error) {
            console.error(`[WhisperEngine] Worker Error: ${msg.error}`);
          }
        } catch {
          // Fragmented JSON, should handle buffering in production
        }
      }
    });

    this.process.on("exit", (code) => {
      console.log(`[WhisperEngine] Worker exited with code ${code}`);
      this.isReady = false;
      this.process = null;
    });
  }

  public async transcribe(audio: Buffer): Promise<void> {
    if (!this.isReady || !this.process) {
      console.warn("[WhisperEngine] Process not ready, skipping transcription.");
      return;
    }

    const header =
      JSON.stringify({
        command: "transcribe",
        length: audio.length,
        timestamp: Date.now(),
      }) + "\n";

    this.process.stdin?.write(header);
    this.process.stdin?.write(audio);
  }

  public shutdown() {
    if (this.process) {
      this.process.stdin?.write(JSON.stringify({ command: "exit" }) + "\n");
      this.process.kill();
    }
  }
}

// Singleton Instance for the Platform
export const whisperEngine = new WhisperEngine();
