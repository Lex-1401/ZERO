import type { AnyAgentTool } from "../agents/pi-tools.types.js";

export interface MultimodalConfig {
  apiKey: string;
  model: string;
  systemInstruction?: string;
  voiceName?: string;
  responseModalities?: ("AUDIO" | "TEXT")[];
}

export interface RealtimeSessionEvents {
  on(event: "open", listener: () => void): void;
  on(event: "close", listener: (code: number, reason: string) => void): void;
  on(event: "error", listener: (err: Error) => void): void;
  on(event: "audio", listener: (chunk: Buffer) => void): void; // Audio output from model
  on(event: "text", listener: (text: string) => void): void; // Text output (transcript)
  on(event: "toolCall", listener: (call: ToolCall) => void): void;
  on(event: "interrupted", listener: () => void): void;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  id: string;
  result: any;
}

export type InputMode = "microphone" | "camera" | "screen";

export interface AudioStream {
  sampleRate: number;
  channels: number;
}
