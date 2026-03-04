
import { createIMessageRpcClient } from "../../client.js";
import { type MonitorIMessageOpts } from "../types.js";
import { handleMessageNow } from "./handler.js";

/**
 * monitorIMessageProvider implementation
 * listens for messages via iMessage RPC and processes them via handleMessageNow.
 */
export async function monitorIMessageProvider(opts: MonitorIMessageOpts = {}): Promise<void> {
    const { cliPath, dbPath, abortSignal, runtime } = opts;

    const client = await createIMessageRpcClient({
        cliPath,
        dbPath,
        runtime,
        onNotification: (msg) => {
            if (msg.method === "message" && msg.params && (msg.params as any).message) {
                handleMessageNow((msg.params as any).message).catch((err) => {
                    runtime?.error?.(`imessage: handler failed: ${err}`);
                });
            }
        },
    });

    try {
        await client.request("watch.subscribe");

        const abortPromise = new Promise<void>((_, reject) => {
            if (abortSignal?.aborted) {
                reject(new Error("aborted"));
                return;
            }
            abortSignal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        });

        await Promise.race([client.waitForClose(), abortPromise]);
    } catch (err: any) {
        if (err?.message === "aborted") {
            // normal shutdown
        } else {
            runtime?.error?.(`imessage monitor failed: ${err}`);
            throw err;
        }
    } finally {
        try {
            if (abortSignal?.aborted) {
                await client.request("watch.unsubscribe").catch(() => { });
            }
        } finally {
            await client.stop();
        }
    }
}
