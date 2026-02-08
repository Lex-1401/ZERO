import { Type, type Static } from "@sinclair/typebox";
import { saveBrowserMemory, retrieveRelevantExperience } from "../aci/memory.js";
import type { ExperienceMemory } from "../aci/types.js";
import { type AnyAgentTool, jsonResult } from "./common.js";

const AciRecallSchema = Type.Object({
  taskDescription: Type.String({
    description:
      "What are you trying to do? e.g., 'login to google', 'download statement from bank'",
  }),
});

type AciRecallParams = Static<typeof AciRecallSchema>;

const AciRememberSchema = Type.Object({
  taskId: Type.String({ description: "Unique ID for this task (e.g., 'google-login-v1')" }),
  description: Type.String({ description: "Human readable description of the task" }),
  url: Type.String({ description: "URL where this happened" }),
  success: Type.Boolean(),
  steps: Type.Array(
    Type.Object({
      action: Type.String(),
      targetElementId: Type.Optional(Type.Number()),
      parameters: Type.Optional(Type.Any()),
    }),
    { description: "List of steps (action, targetId) that led to success" },
  ),
  tags: Type.Optional(Type.Array(Type.String())),
});

type AciRememberParams = Static<typeof AciRememberSchema>;

export function createBrowserACIMemoryTools(): AnyAgentTool[] {
  return [
    {
      name: "aci_recall",
      label: "ACI Recall",
      description:
        "Search the Agent's procedural memory for how to perform a specific browser task. Use this BEFORE starting a complex navigation task.",
      parameters: AciRecallSchema,
      execute: async (_id, args) => {
        const { taskDescription } = args as AciRecallParams;
        const experience = await retrieveRelevantExperience(taskDescription);

        if (!experience) {
          return jsonResult({ found: false, message: "No relevant experience found." });
        }

        return jsonResult({
          found: true,
          description: experience.description,
          trajectory: experience.outcome.trajectory,
        });
      },
    },
    {
      name: "aci_remember",
      label: "ACI Remember",
      description:
        "Save a successful browser interaction sequence to memory for future use. Call this after completing a complex task successfully.",
      parameters: AciRememberSchema,
      execute: async (_id, args) => {
        const params = args as AciRememberParams;

        const memory: ExperienceMemory = {
          taskId: params.taskId,
          description: params.description,
          tags: params.tags || [],
          outcome: {
            success: params.success,
            outcomeSummary: `Performed on ${params.url}`,
            trajectory: params.steps,
          },
        };

        await saveBrowserMemory(memory);
        return jsonResult({ success: true, message: "Experience stored." });
      },
    },
  ];
}
