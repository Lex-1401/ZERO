import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { ChatQueueItem } from "../ui-types";
import type { CompactionStatus } from "../app-tool-stream";
import type { GatewayBrowserClient } from "../gateway";
import { generateUUID } from "../uuid";

export class ChatStore implements ReactiveController {
    host: ReactiveControllerHost;

    // State
    loading = false;
    sending = false;
    message = ""; // Draft
    messages: unknown[] = [];
    toolMessages: unknown[] = [];
    stream: string | null = null;
    streamStartedAt: number | null = null;
    runId: string | null = null;
    compactionStatus: CompactionStatus | null = null;
    avatarUrl: string | null = null;
    thinkingLevel: string | null = null;
    queue: ChatQueueItem[] = [];
    attachments: File[] = [];
    model: string | null = null;
    recording = false;
    recordingStartTime: number | null = null;

    // Predictive UX Cache
    historyCache = new Map<string, { messages: unknown[]; thinkingLevel: string | null }>();

    constructor(host: ReactiveControllerHost) {
        this.host = host;
        host.addController(this);
    }

    hostConnected() {
        // Setup listeners if needed
    }

    hostDisconnected() {
        // Cleanup
    }

    // State mutators that trigger update
    setDraft(text: string) {
        this.message = text;
        this.requestUpdate();
    }

    setLoading(value: boolean) {
        this.loading = value;
        this.requestUpdate();
    }

    setSending(value: boolean) {
        this.sending = value;
        this.requestUpdate();
    }

    setMessages(history: unknown[]) {
        this.messages = history;
        this.requestUpdate();
    }

    setStream(text: string | null) {
        this.stream = text;
        this.requestUpdate();
    }

    requestUpdate() {
        this.host.requestUpdate();
    }
}
