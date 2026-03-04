
import { CHANNEL_IDS } from "../../channels/registry.js";
import {
    ConfigUiHints,
    ConfigSchema,
    PluginUiMetadata,
    ChannelUiMetadata,
} from "./types.js";
import { GROUP_LABELS, GROUP_ORDERS } from "./groups.js";
import { FIELD_LABELS, FIELD_PLACEHOLDERS } from "./labels.js";
import { FIELD_HELP } from "./helps.js";

const SENSITIVE_PATTERNS = [/token/i, /password/i, /secret/i, /api.?key/i];

export function isSensitivePath(path: string): boolean {
    return SENSITIVE_PATTERNS.some((pattern) => pattern.test(path));
}

export function cloneSchema<T>(value: T): T {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value)) as T;
}

export function asSchemaObject(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as any;
}

export function isObjectSchema(schema: any): boolean {
    const type = schema.type;
    if (type === "object") return true;
    if (Array.isArray(type) && type.includes("object")) return true;
    return Boolean(schema.properties || schema.additionalProperties);
}

export function mergeObjectSchema(base: any, extension: any): any {
    const mergedRequired = new Set<string>([...(base.required ?? []), ...(extension.required ?? [])]);
    const merged: any = {
        ...base,
        ...extension,
        properties: {
            ...base.properties,
            ...extension.properties,
        },
    };
    if (mergedRequired.size > 0) {
        merged.required = Array.from(mergedRequired);
    }
    const additional = extension.additionalProperties ?? base.additionalProperties;
    if (additional !== undefined) merged.additionalProperties = additional;
    return merged;
}

export function buildBaseHints(): ConfigUiHints {
    const hints: ConfigUiHints = {};
    for (const [group, label] of Object.entries(GROUP_LABELS)) {
        hints[group] = {
            label,
            group: label,
            order: GROUP_ORDERS[group],
        };
    }
    for (const [path, label] of Object.entries(FIELD_LABELS)) {
        const current = hints[path];
        hints[path] = current ? { ...current, label } : { label };
    }
    for (const [path, help] of Object.entries(FIELD_HELP)) {
        const current = hints[path];
        hints[path] = current ? { ...current, help } : { help };
    }
    for (const [path, placeholder] of Object.entries(FIELD_PLACEHOLDERS)) {
        const current = hints[path];
        hints[path] = current ? { ...current, placeholder } : { placeholder };
    }
    return hints;
}

export function applySensitiveHints(hints: ConfigUiHints): ConfigUiHints {
    const next = { ...hints };
    for (const key of Object.keys(next)) {
        if (isSensitivePath(key)) {
            next[key] = { ...next[key], sensitive: true };
        }
    }
    return next;
}

export function applyPluginHints(hints: ConfigUiHints, plugins: PluginUiMetadata[]): ConfigUiHints {
    const next: ConfigUiHints = { ...hints };
    for (const plugin of plugins) {
        const id = plugin.id.trim();
        if (!id) continue;
        const name = (plugin.name ?? id).trim() || id;
        const basePath = `plugins.entries.${id}`;

        next[basePath] = {
            ...next[basePath],
            label: name,
            help: plugin.description
                ? `${plugin.description} (plugin: ${id})`
                : `Plugin entry for ${id}.`,
        };
        next[`${basePath}.enabled`] = {
            ...next[`${basePath}.enabled`],
            label: `Enable ${name}`,
        };
        next[`${basePath}.config`] = {
            ...next[`${basePath}.config`],
            label: `${name} Config`,
            help: `Plugin-defined config payload for ${id}.`,
        };

        const uiHints = plugin.configUiHints ?? {};
        for (const [relPathRaw, hint] of Object.entries(uiHints)) {
            const relPath = relPathRaw.trim().replace(/^\./, "");
            if (!relPath) continue;
            const key = `${basePath}.config.${relPath}`;
            next[key] = {
                ...next[key],
                ...hint,
            };
        }
    }
    return next;
}

export function applyChannelHints(hints: ConfigUiHints, channels: ChannelUiMetadata[]): ConfigUiHints {
    const next: ConfigUiHints = { ...hints };
    for (const channel of channels) {
        const id = channel.id.trim();
        if (!id) continue;
        const basePath = `channels.${id}`;
        const current = next[basePath] ?? {};
        const label = channel.label?.trim();
        const help = channel.description?.trim();
        next[basePath] = {
            ...current,
            ...(label ? { label } : {}),
            ...(help ? { help } : {}),
        };

        const uiHints = channel.configUiHints ?? {};
        for (const [relPathRaw, hint] of Object.entries(uiHints)) {
            const relPath = relPathRaw.trim().replace(/^\./, "");
            if (!relPath) continue;
            const key = `${basePath}.${relPath}`;
            next[key] = {
                ...next[key],
                ...hint,
            };
        }
    }
    return next;
}

export function listHeartbeatTargetChannels(channels: ChannelUiMetadata[]): string[] {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const id of CHANNEL_IDS) {
        const normalized = id.trim().toLowerCase();
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        ordered.push(normalized);
    }
    for (const channel of channels) {
        const normalized = channel.id.trim().toLowerCase();
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        ordered.push(normalized);
    }
    return ordered;
}

export function applyHeartbeatTargetHints(
    hints: ConfigUiHints,
    channels: ChannelUiMetadata[],
): ConfigUiHints {
    const next: ConfigUiHints = { ...hints };
    const channelList = listHeartbeatTargetChannels(channels);
    const channelHelp = channelList.length ? ` Known channels: ${channelList.join(", ")}.` : "";
    const help = `Delivery target ("last", "none", or a channel id).${channelHelp}`;
    const paths = ["agents.defaults.heartbeat.target", "agents.list.*.heartbeat.target"];
    for (const path of paths) {
        const current = next[path] ?? {};
        next[path] = {
            ...current,
            help: current.help ?? help,
            placeholder: current.placeholder ?? "last",
        };
    }
    return next;
}

export function applyPluginSchemas(schema: ConfigSchema, plugins: PluginUiMetadata[]): ConfigSchema {
    const next = cloneSchema(schema);
    const root = asSchemaObject(next);
    const pluginsNode = asSchemaObject(root?.properties?.plugins);
    const entriesNode = asSchemaObject(pluginsNode?.properties?.entries);
    if (!entriesNode) return next;

    const entryBase = asSchemaObject(entriesNode.additionalProperties);
    const entryProperties = entriesNode.properties ?? {};
    entriesNode.properties = entryProperties;

    for (const plugin of plugins) {
        if (!plugin.configSchema) continue;
        const entrySchema = entryBase
            ? cloneSchema(entryBase)
            : ({ type: "object" } as any);
        const entryObject = asSchemaObject(entrySchema) ?? ({ type: "object" } as any);
        const baseConfigSchema = asSchemaObject(entryObject.properties?.config);
        const pluginSchema = asSchemaObject(plugin.configSchema);
        const nextConfigSchema =
            baseConfigSchema &&
                pluginSchema &&
                isObjectSchema(baseConfigSchema) &&
                isObjectSchema(pluginSchema)
                ? mergeObjectSchema(baseConfigSchema, pluginSchema)
                : cloneSchema(plugin.configSchema);

        entryObject.properties = {
            ...entryObject.properties,
            config: nextConfigSchema,
        };
        entryProperties[plugin.id] = entryObject;
    }

    return next;
}

export function applyChannelSchemas(schema: ConfigSchema, channels: ChannelUiMetadata[]): ConfigSchema {
    const next = cloneSchema(schema);
    const root = asSchemaObject(next);
    const channelsNode = asSchemaObject(root?.properties?.channels);
    if (!channelsNode) return next;
    const channelProps = channelsNode.properties ?? {};
    channelsNode.properties = channelProps;

    for (const channel of channels) {
        if (!channel.configSchema) continue;
        const existing = asSchemaObject(channelProps[channel.id]);
        const incoming = asSchemaObject(channel.configSchema);
        if (existing && incoming && isObjectSchema(existing) && isObjectSchema(incoming)) {
            channelProps[channel.id] = mergeObjectSchema(existing, incoming);
        } else {
            channelProps[channel.id] = cloneSchema(channel.configSchema);
        }
    }

    return next;
}

export function stripChannelSchema(schema: ConfigSchema): ConfigSchema {
    const next = cloneSchema(schema);
    const root = asSchemaObject(next);
    if (!root || !root.properties) return next;
    const channelsNode = asSchemaObject(root.properties.channels);
    if (channelsNode) {
        channelsNode.properties = {};
        channelsNode.required = [];
        channelsNode.additionalProperties = true;
    }
    return next;
}
