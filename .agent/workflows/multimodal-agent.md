
---

description: Create and run a realtime multimodal agent session
---

1. Ensure you have the `src/realtime` module available.
2. Initialize the session configuration:

   ```typescript
   import { MultimodalSession, SemanticRouter } from "../../src/realtime";
   
   const config = {
       apiKey: process.env.GEMINI_API_KEY,
       model: "gemini-2.0-flash-exp",
       tools: [new SemanticRouter([]).getRouterToolDefinition()]
   };
   ```

3. Instantiate the session and wire up audio IO:

   ```typescript
   const session = new MultimodalSession(config);
   
   // Handle audio output from the model (e.g., play to speakers)
   session.on("audio", (chunk) => {
       // audioSystem.play(chunk);
   });
   
   // Handle text output for UI/Logs
   session.on("text", (text) => {
       console.log("Agent:", text);
   });
   ```

4. Handle the "execute" tool call:

   ```typescript
   session.on("toolCall", async (call) => {
       if (call.name === "execute") {
           // Use the router to identify the actual tool
           const realTool = await router.route(call.arguments.task);
           // Execute the real tool...
           const output = "Result of: " + realTool.toolName;
           
           // Send response back to the model
           session.sendToolResponse({ id: call.id, result: output });
       }
   });
   ```

5. Connect and start streaming inputs:

   ```typescript
   await session.connect();
   
   // In a loop or event handler:
   // session.sendAudio(micBuffer);
   // session.sendVideo(cameraFrame);
   ```
