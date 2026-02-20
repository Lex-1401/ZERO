
import { useState, useEffect } from 'react';

// Basic Types
interface RequestFrame {
    id: string;
    type: 'req';
    method: string;
    params?: unknown;
}

interface ResponseFrame {
    id: string;
    type: 'res';
    ok: boolean;
    payload?: unknown;
    error?: { message: string; code?: string };
}

interface EventFrame {
    type: 'event';
    event: string;
    seq?: number;
    payload?: unknown;
}

type Frame = RequestFrame | ResponseFrame | EventFrame;

// Client Logic
class GatewayClient {
    private ws: WebSocket | null = null;
    private pending = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
    private listeners = new Set<(evt: EventFrame) => void>();
    private url = 'ws://127.0.0.1:18789';

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('Connected to Gateway');
            // Handshake could go here
            this.call('connect', { client: { id: 'desktop-gui', role: 'operator' } }).catch(console.error);
        };

        this.ws.onmessage = (msg) => {
            try {
                const frame = JSON.parse(msg.data) as Frame;
                if (frame.type === 'res') {
                    const p = this.pending.get(frame.id);
                    if (p) {
                        this.pending.delete(frame.id);
                        if (frame.ok) p.resolve(frame.payload);
                        else p.reject(new Error(frame.error?.message || 'Unknown error'));
                    }
                } else if (frame.type === 'event') {
                    this.listeners.forEach(l => l(frame));
                }
            } catch (err) {
                console.error('Failed to parse message', err);
            }
        };

        this.ws.onclose = () => {
            console.log('Gateway disconnected, reconnecting in 3s...');
            setTimeout(() => this.connect(), 3000);
        };
    }

    async call(method: string, params?: unknown): Promise<any> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('Gateway not connected');
        }
        const id = crypto.randomUUID();
        const frame: RequestFrame = { id, type: 'req', method, params };

        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.ws!.send(JSON.stringify(frame));
        });
    }

    subscribe(cb: (evt: EventFrame) => void) {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }
}

export const gatewayClient = new GatewayClient();

// React Hook
export function useGateway() {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        gatewayClient.connect();
        // Since we don't expose readyState directly in a reactive way yet, 
        // we can assume it connects eventually. 
        // For a robust UI, we'd add state listeners to the client.
        setIsConnected(true);
    }, []);

    return {
        client: gatewayClient,
        isConnected
    };
}
