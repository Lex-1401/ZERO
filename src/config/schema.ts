// @ts-nocheck

import { VERSION } from "../version.js";
import { ZEROSchema } from "./zod-schema.js";
import {
  ConfigSchemaResponse,
  PluginUiMetadata,
  ChannelUiMetadata,
} from "./schema/types.js";
import {
  buildBaseHints,
  applySensitiveHints,
  applyHeartbeatTargetHints,
  applyChannelHints,
  applyPluginHints,
  applyChannelSchemas,
  applyPluginSchemas,
  stripChannelSchema,
} from "./schema/functions.ts";

export * from "./schema/types.js";

let cachedBase: ConfigSchemaResponse | null = null;

function buildBaseConfigSchema(): ConfigSchemaResponse {
  if (cachedBase) return cachedBase;
  const schema = ZEROSchema.toJSONSchema({
    target: "draft-07",
    unrepresentable: "any",
  });
  schema.title = "ZEROConfig";
  const hints = applySensitiveHints(buildBaseHints());
  const next = {
    schema: stripChannelSchema(schema),
    uiHints: hints,
    version: VERSION,
    generatedAt: new Date().toISOString(),
  };
  cachedBase = next;
  return next;
}

/**
 * Builds the full configuration schema, including metadata for plugins and channels.
 * Used by the UI to render the configuration editor.
 */
export function buildConfigSchema(params?: {
  plugins?: PluginUiMetadata[];
  channels?: ChannelUiMetadata[];
}): ConfigSchemaResponse {
  const base = buildBaseConfigSchema();
  const plugins = params?.plugins ?? [];
  const channels = params?.channels ?? [];
  if (plugins.length === 0 && channels.length === 0) return base;
  const mergedHints = applySensitiveHints(
    applyHeartbeatTargetHints(
      applyChannelHints(applyPluginHints(base.uiHints, plugins), channels),
      channels,
    ),
  );
  const mergedSchema = applyChannelSchemas(applyPluginSchemas(base.schema, plugins), channels);
  return {
    ...base,
    schema: mergedSchema,
    uiHints: mergedHints,
  };
}
