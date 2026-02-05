import type { ZEROApp } from "../app";

export async function runSmartScan(app: ZEROApp) {
    try {
        if (!app.client) return [];
        const result = (await app.client.request("system.smartScan", {})) as any;
        return result.recommendations;
    } catch (err) {
        console.error("Smart scan failed", err);
        return [];
    }
}
