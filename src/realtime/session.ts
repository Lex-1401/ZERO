import { EventEmitter } from "events";
import WebSocket from "ws";
import type { MultimodalConfig, RealtimeSessionEvents, ToolResult } from "./types.js";

const DEFAULT_MODEL = "models/gemini-2.0-flash-exp";
const WS_URL_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

export class MultimodalSession extends EventEmitter implements RealtimeSessionEvents {
  private ws: WebSocket | null = null;
  private config: MultimodalConfig;
  private isConnected = false;

  constructor(config: MultimodalConfig) {
    super();
    this.config = config;
  }

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

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

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
    if (data instanceof Buffer) {
      // Unexpected raw binary, usually it's JSON text
      data = data.toString();
    }

    try {
      const msg = JSON.parse(data as string);

      if (msg.serverContent) {
        if (msg.serverContent.modelTurn) {
          const parts = msg.serverContent.modelTurn.parts;
          for (const part of parts) {
            if (part.text) {
              this.emit("text", part.text);
            }
            if (part.inlineData) {
              // Audio output
              const buffer = Buffer.from(part.inlineData.data, "base64");
              this.emit("audio", buffer);
            }
          }
        }

        if (msg.serverContent.turnComplete) {
          // Turn finished
        }

        if (msg.serverContent.interrupted) {
          this.emit("interrupted");
        }
      }

      if (msg.toolCall) {
        const calls = msg.toolCall.functionCalls;
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
    } catch (e) {
      console.error("Error parsing WS message", e);
    }
  }
}
