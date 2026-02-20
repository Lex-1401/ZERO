import { describe, it, expect } from "vitest";
import { MultimodalSession } from "./session.js";
import { SemanticRouter } from "./semantic-router.js";

describe("MultimodalSession", () => {
  it("should initialize with config", () => {
    const session = new MultimodalSession({
      apiKey: "test-key",
      model: "gemini-2.0-flash-exp",
    });
    expect(session).toBeDefined();
  });
});

describe("SemanticRouter", () => {
  const mockTools: any[] = [
    {
      name: "weather",
      description: "Get weather for a location",
      parameters: { type: "object", properties: { city: { type: "string" } } },
    },
    {
      name: "email",
      description: "Send an email",
      parameters: {
        type: "object",
        properties: { to: { type: "string" }, body: { type: "string" } },
      },
    },
  ];

  it("should generate router tool definition", () => {
    const router = new SemanticRouter(mockTools);
    const def = router.getRouterToolDefinition();
    expect(def.name).toBe("execute");
  });

  it("should route simple tasks", async () => {
    const router = new SemanticRouter(mockTools);
    const route = await router.route("Check weather in NYC");
    expect(route).toBeDefined();
    expect(route?.toolName).toBe("weather");
  });
});
