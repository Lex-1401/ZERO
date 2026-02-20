import type { AnyAgentTool } from "../agents/pi-tools.types.js";

export class SemanticRouter {
  private tools: Map<string, AnyAgentTool>;

  constructor(tools: AnyAgentTool[]) {
    this.tools = new Map(tools.map((t) => [t.name, t]));
  }

  // Returns the single "execute" tool definition that receives natural language tasks
  public getRouterToolDefinition() {
    return {
      name: "execute",
      description:
        "Intelligent router that can execute ANY task using available tools. Describe what you want to do in natural language.",
      parameters: {
        type: "object",
        properties: {
          task: {
            type: "string",
            description:
              "A detailed description of the action to perform (e.g., 'Search for the weather in Tokyo').",
          },
        },
        required: ["task"],
      },
    };
  }

  // Routes the task to the most appropriate tool
  // In a real implementation, this would use embeddings/similarity search.
  // Here we use a keyword matching heuristic for the MVP.
  public async route(task: string): Promise<{ toolName: string; args: any } | null> {
    const taskLower = task.toLowerCase();

    // Heuristic 1: Check if task starts with a tool name
    for (const [name] of this.tools) {
      if (taskLower.includes(name.toLowerCase())) {
        return { toolName: name, args: { /* Stub: extracting args is complex */ query: task } };
      }
    }

    // Default fallback: assume it is a search or chat
    if (this.tools.has("google_search")) {
      return { toolName: "google_search", args: { query: task } };
    }

    return null;
  }

  public async execute(task: string): Promise<string> {
    const plan = await this.route(task);
    if (!plan) {
      return "I don't know how to perform that task with the available tools.";
    }

    // In a real system, we'd invoke the tool here.
    // For this MVP, we return the plan so the session can invoke it or the agent system can handle it.
    return `Routed to ${plan.toolName} with args ${JSON.stringify(plan.args)}`;
  }
}
