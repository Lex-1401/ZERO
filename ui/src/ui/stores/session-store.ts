import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { SessionsListResult } from "../types";

export class SessionStore implements ReactiveController {
    host: ReactiveControllerHost;

    loading = false;
    result: SessionsListResult | null = null;
    error: string | null = null;
    filterActive = "";
    filterLimit = "120";
    includeGlobal = true;
    includeUnknown = false;

    constructor(host: ReactiveControllerHost) {
        this.host = host;
        host.addController(this);
    }

    hostConnected() { }
    hostDisconnected() { }

    requestUpdate() {
        this.host.requestUpdate();
    }
}
