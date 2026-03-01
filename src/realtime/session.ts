import { EventEmitter } from "events";
import WebSocket from "ws";
import type { MultimodalConfig, RealtimeSessionEvents, ToolResult } from "./types.js";

const DEFAULT_MODEL = "models/gemini-2.0-flash-exp";
const WS_URL_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

/**
 * Manages a realtime multimodal session with the model provider over WebSockets.
 * Handles audio/video input and receives text, audio, and tool calls.
 * Implements RealtimeSessionEvents.
 */
export class MultimodalSession extends EventEmitter implements RealtimeSessionEvents {
  private ws: WebSocket | null = null;
  private config: MultimodalConfig;
  private isConnected = false;

  constructor(config: MultimodalConfig) {
    super();
    this.config = config;
  }

  /**
   * Connects to the model provider's WebSocket endpoint.
   */
  public async connect(): Promise<void> {
    if (this.ws) return;

    const url = `${WS_URL_BASE}?key=${this.config.apiKey}`;
    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      this.isConnected = true;
      this.emit("open");
      this.sendSetupMessage(); // Send initial configuration
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      this.handleMessage(data);
    });

    this.ws.on("close", (code, reason) => {
      this.isConnected = false;
      this.ws = null;
      this.emit("close", code, reason.toString());
    });

    this.ws.on("error", (err) => {
      this.emit("error", err);
    });
  }

  /**
   * Disconnects the current session.
   */
  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Sends an audio chunk (PCM 16kHz) to the model.
   */
  public sendAudio(chunk: Buffer) {
    if (!this.isConnected || !this.ws) return;

    const msg = {
      realtime_input: {
        media_chunks: [
          {
            mime_type: "audio/pcm;rate=16000",
            data: chunk.toString("base64"),
          },
        ],
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  /**
   * Sends a video frame (JPEG) to the model.
   */
  public sendVideo(frame: Buffer, mimeType: "image/jpeg" = "image/jpeg") {
    if (!this.isConnected || !this.ws) return;

    const msg = {
      realtime_input: {
        media_chunks: [
          {
            mime_type: mimeType,
            data: frame.toString("base64"),
          },
        ],
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  /**
   * Sends a tool execution result back to the model.
   */
  public sendToolResponse(result: ToolResult) {
    if (!this.isConnected || !this.ws) return;

    const msg = {
      tool_response: {
        function_responses: [
          {
            id: result.id,
            name: "execute", // Assuming single routed tool for now
            response: { result: result.result },
          },
        ],
      },
    };
    this.ws.send(JSON.stringify(msg));
  }

  private sendSetupMessage() {
    if (!this.ws) return;

    const setup = {
      setup: {
        model: this.config.model || DEFAULT_MODEL,
        generation_config: {
          response_modalities: this.config.responseModalities || ["AUDIO"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: this.config.voiceName || "Puck",
              },
            },
          },
        },
        system_instruction: {
          parts: [{ text: this.config.systemInstruction || "You are a helpful assistant." }],
        },
        tools: this.config.tools ? [{ function_declarations: this.config.tools }] : undefined,
      },
    };

    this.ws.send(JSON.stringify(setup));
  }

  private handleMessage(data: WebSocket.Data) {
    let text = data instanceof Buffer ? data.toString() : (data as string);

    try {
      const msg = JSON.parse(text);
      if (msg.serverContent) this.handleServerContent(msg.serverContent);
      if (msg.toolCall) this.handleToolCall(msg.toolCall);
    } catch (e) {
      console.error("Error parsing WS message", e);
      this.emit("error", e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * Processes server content messages (text, audio, turn status).
   */
  private handleServerContent(content: any) {
    if (content.modelTurn) {
      const parts = content.modelTurn.parts;
      for (const part of parts) {
        if (part.text) this.emit("text", part.text);
        if (part.inlineData) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          this.emit("audio", buffer);
        }
      }
    }
    if (content.interrupted) this.emit("interrupted");
  }

  /**
   * Processes tool call requests from the model.
   */
  private handleToolCall(toolCall: any) {
    const calls = toolCall.functionCalls;
    if (calls) {
      for (const call of calls) {
        this.emit("toolCall", {
          id: call.id,
          name: call.name,
          arguments: call.args,
        });
      }
    }
  }
}
