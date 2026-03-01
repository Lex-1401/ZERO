import WebSocket from "ws";

export interface CdpClientOptions {
    host?: string;
    port?: number;
}

export class CdpClient {
    private ws: WebSocket | null = null;
    private messageId = 0;
    private resolvers = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

    constructor(private options: CdpClientOptions = {}) { }

    async connect(debuggerUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(debuggerUrl);
            this.ws.on("open", resolve);
            this.ws.on("error", reject);
            this.ws.on("message", (data) => this.handleMessage(data));
        });
    }

    private handleMessage(data: WebSocket.Data) {
        const msg = JSON.parse(data.toString());
        if (msg.id && this.resolvers.has(msg.id)) {
            if (msg.error) {
                this.resolvers.get(msg.id)!.reject(new Error(msg.error.message));
            } else {
                this.resolvers.get(msg.id)!.resolve(msg.result);
            }
            this.resolvers.delete(msg.id);
        }
    }

    async send(method: string, params?: Record<string, unknown>): Promise<any> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error("CDP client is not connected.");
        }
        const id = ++this.messageId;
        return new Promise((resolve, reject) => {
            this.resolvers.set(id, { resolve, reject });
            this.ws!.send(JSON.stringify({ id, method, params }));
        });
    }

    async navigate(url: string) {
        return this.send("Page.navigate", { url });
    }

    async snapshot() {
        return this.send("Page.captureSnapshot", { format: "mhtml" });
    }

    async evaluate(expression: string) {
        return this.send("Runtime.evaluate", { expression, returnByValue: true });
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export async function createCdpSession(debuggerUrl: string) {
    const client = new CdpClient();
    await client.connect(debuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    return client;
}
