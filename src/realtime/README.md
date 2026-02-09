
# Realtime Multimodal Agents (ZERO Realtime)

Based on the architecture of **VisionClaw** (https://github.com/sseanliu/VisionClaw), this module enables low-latency, bidirectional streaming interaction with multimodal models like Gemini Live.

## Key Components

### 1. MultimodalSession (`session.ts`)
Manages the persistent WebSocket connection to the model provider (e.g., Google Gemini Bidi API).
- Handles setup handshake.
- Streams audio (PCM) and video (JPEG) chunks in real-time.
- Emits events for model output (audio, text, tool calls).
- Handles interruption (barge-in).

### 2. Semantic Router (`semantic-router.ts`)
Simplifies tool usage for the model by exposing a single "execute" tool that accepts natural language instructions.
- Reduces context window usage.
- Decouples LLM reasoning from specific tool signatures.
- Allows scaling to thousands of tools via embedding search (future).

### 3. Hardware Abstraction (`hardware.ts`)
Standardizes input/output for "Agent OS" capabilities.
- `CameraDevice`: Captures video frames.
- `MicrophoneDevice`: Captures audio streams.
- `SpeakerDevice`: Plays back audio responses.
- Supports virtual devices for testing and server-side execution.

### 4. Audio Manager (`audio-manager.ts`)
Handles audio playback queues and echo cancellation strategies (interruption handling).

## Usage Example

```typescript
import { MultimodalSession, SemanticRouter, VirtualCamera } from "./index.js";

const config = {
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.0-flash-exp",
  tools: [/* router tool definition */]
};

const session = new MultimodalSession(config);

session.on("audio", (chunk) => {
  // Play audio chunk
});

session.on("toolCall", async (call) => {
  // Execute tool
  const result = await myToolExecutor(call);
  session.sendToolResponse(result);
});

await session.connect();
// Start streaming...
```

## Inspiration
This implementation adopts the "streaming first" philosophy of VisionClaw, moving away from request/response cycles for perception tasks.
