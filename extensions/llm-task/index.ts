import type { ZeroPluginApi } from "../../src/plugins/types.js";

import { createLlmTaskTool } from "./src/llm-task-tool.js";

export default function register(api: ZeroPluginApi) {
  api.registerTool(createLlmTaskTool(api), { optional: true });
}
