
import { type ServerResponse } from "node:http";

export function sendJson(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
}

export function isAllowedWsOrigin(origin: string | undefined): boolean {
    if (!origin) return true;
    return origin.includes("localhost") || origin.includes("127.0.0.1");
}
