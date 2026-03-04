
import { type GatewayServer, type GatewayServerOptions } from "./types.js";

export async function bootstrapGatewayServer(_port: number, _opts: GatewayServerOptions): Promise<GatewayServer> {
    // Logic to load config, start HTTP/WS servers, and register handlers.
    // Omitted for brevity in this stage, will be copied from original.
    return {
        close: async () => { },
    };
}
