
/**
 * @fileoverview Types for the configuration schema and UI hints.
 */

export interface ConfigUiHint {
    label?: string;
    help?: string;
    group?: string;
    order?: number;
    advanced?: boolean;
    sensitive?: boolean;
    placeholder?: string;
    itemTemplate?: unknown;
}

export type ConfigUiHints = Record<string, ConfigUiHint>;

export type ConfigSchema = any; // JSON Schema type is complex, using any here as in original
export type JsonSchemaNode = any;

export interface ConfigSchemaResponse {
    schema: ConfigSchema;
    uiHints: ConfigUiHints;
    version: string;
    generatedAt: string;
}

export interface PluginUiMetadata {
    id: string;
    name?: string;
    description?: string;
    configUiHints?: Record<
        string,
        Pick<ConfigUiHint, "label" | "help" | "advanced" | "sensitive" | "placeholder">
    >;
    configSchema?: JsonSchemaNode;
}

export interface ChannelUiMetadata {
    id: string;
    label?: string;
    description?: string;
    configSchema?: JsonSchemaNode;
    configUiHints?: Record<string, ConfigUiHint>;
}
