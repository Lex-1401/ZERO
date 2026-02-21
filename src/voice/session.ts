import { Buffer } from "node:buffer";
import { EventEmitter } from "node:events";
import { VadEngine, BackchannelEngine } from "@zero/ratchet";
import { whisperEngine } from "./whisper-engine.js";
import { speak } from "./tts-service.js"; // Import speak for reactions

export type AudioConfig = {
  sampleRate: number;
  encoding: "pcm_16" | "opus";
  channels: number;
};

export type VoiceEvent =
  | { type: "speech_started"; ts: number }
  | { type: "speech_ended"; ts: number }
  | { type: "transcription_delta"; text: string; id: string }
  | { type: "transcription_final"; text: string; id: string }
  | { type: "barge_in"; ts: number };

export type AudioEngineConfig = {
  provider: "edge-tts" | "xtts" | "native-rust";
  cloningEnabled: boolean;
  targetLatencyMs: number;
};

export class VoiceSession extends EventEmitter {
  private vad: VadEngine;
  private backchannel: BackchannelEngine;
  private buffer: Buffer[] = [];
  private engineConfig: AudioEngineConfig;
  private lastBackchannelTs: number = 0;

  constructor(
    public readonly connId: string,
    private readonly config: AudioConfig,
    private readonly sendMessage: (msg: unknown) => void,
  ) {
    super();
    // Native High-Performance VAD Initialization
    this.vad = new VadEngine(500, 800);
    // Backchannel Heuristics: 10 samples history, 3 seconds cooldown
    this.backchannel = new BackchannelEngine(10, 3000);
    this.engineConfig = {
      provider: "edge-tts",
      cloningEnabled: true,
      targetLatencyMs: 80,
    };
  }

  handleAudio(chunk: Buffer) {
    if (this.config.encoding !== "pcm_16") return;

    try {
      const status = this.vad.processChunk(chunk);
      this.handleVadStatus(status);

      // Heurísticas de Backchannel
      const rms = (this.vad as any).lastRms ?? 0;
      if (this.backchannel.processEnergy(rms)) {
        this.triggerBackchannelReaction();
      }
    } catch (err) {
      // Silently ignore audio processing errors to keep the gateway alive
    }

    this.processSignal(chunk);
  }

  private handleVadStatus(status: string) {
    switch (status) {
      case "speech_start":
        this.handleSpeechStart();
        break;
      case "speech_end":
        this.handleSpeechEnd();
        break;
      case "panic":
        this.handleSystemPanic();
        break;
    }
  }

  private handleSpeechStart() {
    this.emit("barge_in");
    this.sendMessage({
      type: "voice.barge_in",
      ts: Date.now(),
      signal: "INTERRUPT_CORE",
    });
    console.log(`[VoiceSession:${this.connId}] Speech started (Native VAD Pulse)`);
  }

  private handleSpeechEnd() {
    console.log(`[VoiceSession:${this.connId}] Speech ended (Native VAD Pulse)`);
    this.dispatchTranscriptionPulse().catch((err) => {
      console.error(`[VoiceSession:${this.connId}] Transcription pulse failed:`, err);
    });
  }

  private handleSystemPanic() {
    console.error(`[VoiceSession:${this.connId}] System in PANIC mode. Emergency Halt.`);
    this.sendMessage({ type: "system.panic", code: "VAD_SATURATION" });
  }

  private processSignal(chunk: Buffer) {
    // High-performance rolling buffer for real-time inference window
    this.buffer.push(chunk);
    if (this.buffer.length > 500) this.buffer.shift();
  }

  /**
   * @Cortex_Protocol: Dispatching event-driven transcription pulse.
   * Integrating faster-whisper (Offline) for high-privacy contexts.
   */
  private async dispatchTranscriptionPulse() {
    // Concatenate bits of the rolling buffer for a coherent context
    const fullAudio = Buffer.concat(this.buffer);

    // Clear buffer after dispatch
    this.buffer = [];

    whisperEngine.once("transcription", (result: any) => {
      this.sendMessage({
        type: "voice.transcription",
        state: "final",
        text: result.text,
        ts: Date.now(),
        metrics: {
          engineLatency: this.engineConfig.targetLatencyMs,
          confidence: result.confidence,
        },
      });
      this.emit("transcription", result.text);
    });

    whisperEngine.transcribe(fullAudio).catch((err) => {
      console.error(`[VoiceSession:${this.connId}] Whisper transcription failed:`, err);
    });
  }

  private triggerBackchannelReaction() {
    // Reações rítmicas curtas para simular escuta ativa
    const reactions = ["hum", "ok", "entendi", "sim"];
    const text = reactions[Math.floor(Math.random() * reactions.length)];

    console.log(`[VoiceSession:${this.connId}] Backchannel reaction: ${text}`);

    // Disparar síntese sem interromper fluxo principal
    // Nota: speak() já lida com o playAudio reativo
    speak(text).catch(() => {});

    this.sendMessage({
      type: "voice.backchannel",
      text,
      ts: Date.now(),
    });
  }
}

const activeSessions = new Map<string, VoiceSession>();

export function getOrCreateVoiceSession(
  connId: string,
  send: (msg: unknown) => void,
): VoiceSession {
  let session = activeSessions.get(connId);
  if (!session) {
    session = new VoiceSession(
      connId,
      { sampleRate: 16000, encoding: "pcm_16", channels: 1 },
      send,
    );
    activeSessions.set(connId, session);
    console.log(`[CORE:Voice] Neural session established for ${connId}`);
  }
  return session;
}

export function closeVoiceSession(connId: string) {
  if (activeSessions.has(connId)) {
    activeSessions.delete(connId);
    console.log(`[CORE:Voice] Neural session terminated for ${connId}`);
  }
}
