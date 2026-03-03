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
  private childProcess: ChildProcess | null = null;
  private isReady = false;

  constructor() {
    super();
    this.init();
  }

  private init() {
    const pythonPath = process.env.PYTHON_PATH || "python3";
    const scriptPath = path.join(__dirname, "whisper-worker.py");

    this.childProcess = spawn(pythonPath, [scriptPath], {
      stdio: ["pipe", "pipe", "inherit"],
    });

    this.childProcess.stdout?.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.status === "ready") {
            this.isReady = true;
            this.emit("ready");
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

    this.childProcess.on("exit", (_code) => {
      this.isReady = false;
      this.childProcess = null;
    });
  }

  public async transcribe(audio: Buffer): Promise<void> {
    if (!this.isReady || !this.childProcess) {
      console.warn("[WhisperEngine] Process not ready, skipping transcription.");
      return;
    }

    const header =
      JSON.stringify({
        command: "transcribe",
        length: audio.length,
        timestamp: Date.now(),
      }) + "\n";

    this.childProcess.stdin?.write(header);
    this.childProcess.stdin?.write(audio);
  }

  public shutdown() {
    if (this.childProcess) {
      this.childProcess.stdin?.write(JSON.stringify({ command: "exit" }) + "\n");
      this.childProcess.kill();
    }
  }
}

// Singleton Instance for the Platform
export const whisperEngine = new WhisperEngine();
