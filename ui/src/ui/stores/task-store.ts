import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { TaskRecord } from "../views/tasks";

export class TaskStore implements ReactiveController {
    host: ReactiveControllerHost;

    loading = false;
    list: TaskRecord[] = [];
    error: string | null = null;
    pollInterval: number | null = null;

    constructor(host: ReactiveControllerHost) {
        this.host = host;
        host.addController(this);
    }

    hostConnected() { }

    hostDisconnected() {
        this.stopPolling();
    }

    requestUpdate() {
        this.host.requestUpdate();
    }

    startPolling(callback: () => void, interval = 5000) {
        if (this.pollInterval) return;
        this.pollInterval = window.setInterval(callback, interval);
    }

    stopPolling() {
        if (this.pollInterval) {
            window.clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
}
