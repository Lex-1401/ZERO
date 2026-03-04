
import type { ChannelPlugin, ChannelOutboundAdapter } from "../../channels/plugins/types.js";
import type { PluginRegistry } from "../../plugins/registry/types.js";
import { DEFAULT_ACCOUNT_ID } from "../../routing/session-key.js";

export type StubChannelOptions = {
    id: ChannelPlugin["id"];
    label: string;
    summary?: Record<string, unknown>;
};

export function createStubOutboundAdapter(channelId: ChannelPlugin["id"]): ChannelOutboundAdapter {
    return {
        deliveryMode: "direct",
        sendText: async (_ctx) => ({
            channel: channelId as any,
            messageId: `stub-${channelId}-${Date.now()}`,
            metadata: {},
        }),
        sendMedia: async (_ctx) => ({
            channel: channelId as any,
            messageId: `stub-media-${channelId}-${Date.now()}`,
            metadata: {},
        }),
    };
}

export function createStubChannelPlugin(params: StubChannelOptions): ChannelPlugin {
    return {
        id: params.id,
        meta: {
            id: params.id,
            label: params.label,
            selectionLabel: params.label,
            docsPath: `/docs/${params.id}`,
            blurb: `Stub ${params.label} channel`,
        },
        capabilities: {
            chatTypes: ["direct", "group"],
            media: true,
        },
        config: {
            listAccountIds: () => [DEFAULT_ACCOUNT_ID],
            resolveAccount: () => ({ enabled: true }),
            isConfigured: async () => true,
        } as any,
        status: {
            buildChannelSummary: async () => ({
                enabled: true,
                configured: true,
                ...params.summary,
            }),
        } as any,
        outbound: createStubOutboundAdapter(params.id),
        gateway: {
            logoutAccount: async () => ({ cleared: true }),
        } as any,
    };
}


export function createStubPluginRegistry(): PluginRegistry {
    return {
        plugins: [],
        tools: [],
        hooks: [],
        typedHooks: [],
        channels: [],
        providers: [],
        gatewayHandlers: {},
        httpHandlers: [],
        httpRoutes: [],
        cliRegistrars: [],
        services: [],
        commands: [],
        diagnostics: [],
    };
}
