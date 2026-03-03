import { Type } from "@sinclair/typebox";
import { jsonResult, readStringParam, type AnyAgentTool } from "./common.js";
import { createCdpSession } from "../../browser/cdp-client.js";

const CdpBrowserSchema = Type.Object({
  action: Type.String({
    description: "The action to perform: 'navigate', 'snapshot', or 'evaluate'.",
    enum: ["navigate", "snapshot", "evaluate"],
  }),
  debuggerUrl: Type.String({
    description: "The ws:// Chrome DevTools connection URL.",
  }),
  url: Type.Optional(Type.String({ description: "URL to navigate to (required for 'navigate')." })),
  expression: Type.Optional(
    Type.String({ description: "JS expression to evaluate (required for 'evaluate')." }),
  ),
});

export function createCdpBrowserTool(): AnyAgentTool {
  return {
    name: "cdp_browser",
    label: "CDP Browser",
    description:
      "Minimalist Chrome DevTools Protocol (CDP) client. Lightweight alternative to Playwright for simple navigation, snapshotting, and JS evaluation.",
    parameters: CdpBrowserSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const action = readStringParam(params, "action", { required: true });
      const debuggerUrl = readStringParam(params, "debuggerUrl", { required: true });

      let client;
      try {
        client = await createCdpSession(debuggerUrl);
        if (action === "navigate") {
          const url = readStringParam(params, "url", { required: true });
          await client.navigate(url);
          return jsonResult({ status: "navigated", url });
        }
        if (action === "snapshot") {
          const result = await client.snapshot();
          return jsonResult({
            snapshotLength: String(result?.data).length,
            note: "MHTML Snapshot extracted.",
          });
        }
        if (action === "evaluate") {
          const expression = readStringParam(params, "expression", { required: true });
          const result = await client.evaluate(expression);
          return jsonResult({ result });
        }
        return jsonResult({ error: "Unknown action" });
      } catch (err: unknown) {
        return jsonResult({ error: err instanceof Error ? err.message : String(err) });
      } finally {
        if (client) client.close();
      }
    },
  };
}
