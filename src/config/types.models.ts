/**
 * @module config/types.models
 * @deprecated Re-export shim — import directly from 'config/schemas/models.js' instead.
 */
export type { ModelCompat, ModelApiKind, ModelDefinitionConfig, ModelProviderConfig, ModelProviderAuthMode } from "./schemas/models.js";

/** Top-level models section of the config file. */
export type ModelsConfig = {
    providers?: Record<string, import("./schemas/models.js").ModelProviderConfig>;
    definitions?: Record<string, import("./schemas/models.js").ModelDefinitionConfig>;
};
