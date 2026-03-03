import type { ZEROConfig } from "../../config/config.js";
import { loadAuthProfileStore } from "../auth-profiles/store.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam } from "./common.js";
import { HttpClientSchema } from "./http-tool/types.js";

export function createHttpTool(options?: {
  config?: ZEROConfig;
  agentSessionKey?: string;
}): AnyAgentTool {
  return {
    label: "HTTP Client",
    name: "http_client",
    description:
      "Make HTTP requests with secure auth profiles. Use this to interact with external APIs natively without leaking your context keys.",
    parameters: HttpClientSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const urlStr = readStringParam(params, "url", { required: true });
      const method = (readStringParam(params, "method") || "GET").toUpperCase();
      const body = readStringParam(params, "body");
      const authProfile = readStringParam(params, "auth");

      const headers = (params.headers as Record<string, string>) || {};

      if (authProfile) {
        const store = loadAuthProfileStore();
        const cred = store?.profiles?.[authProfile];
        if (!cred) {
          return jsonResult({ error: `Auth profile '${authProfile}' not found in the vault.` });
        }

        if (cred.type === "api_key") {
          headers["Authorization"] = `Bearer ${cred.key}`; // Naive fallback, customize per API if needed
        } else if (cred.type === "token") {
          headers["Authorization"] = `Bearer ${cred.token}`;
        } else if (cred.type === "oauth") {
          const oauthCred = cred as any;
          const token =
            oauthCred.accessToken ??
            oauthCred.access_token ??
            oauthCred.idToken ??
            oauthCred.id_token;
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
        }
      }

      const timeoutMs = typeof params.timeout === "number" ? params.timeout * 1000 : 30000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(urlStr, {
          method,
          headers,
          body: body ? String(body) : undefined,
          signal: controller.signal,
        });

        const originalLength = parseInt(response.headers.get("content-length") || "0", 10) || 0;
        let outBody = await response.text();
        const bodyLen = outBody.length;
        if (bodyLen > 50000) {
          outBody = outBody.substring(0, 50000) + `\n... [truncated ${bodyLen - 50000} more chars]`;
        }

        return jsonResult({
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: outBody,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return jsonResult({ error: `Request timed out after ${timeoutMs}ms.` });
        }
        return jsonResult({ error: err instanceof Error ? err.message : String(err) });
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}
