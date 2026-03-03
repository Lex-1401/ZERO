import type { ZeroPluginApi } from "../../src/plugins/types.js";

import { createVOIDTool } from "./src/void-tool.js";

export default function register(api: ZeroPluginApi) {
  api.registerTool(
    (ctx) => {
      if (ctx.sandboxed) return null;
      return createVOIDTool(api);
    },
    { optional: true },
  );
}
