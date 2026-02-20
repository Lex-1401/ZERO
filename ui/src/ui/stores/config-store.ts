import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { ConfigSnapshot, ConfigUiHints } from "../types";

export class ConfigStore implements ReactiveController {
    host: ReactiveControllerHost;

    loading = false;
    raw = "{\n}\n";
    rawOriginal = "";
    valid: boolean | null = null;
    issues: unknown[] = [];
    saving = false;
    applying = false;
    updateRunning = false;
    applySessionKey: string | null = null; // Will be initialized by app
    snapshot: ConfigSnapshot | null = null;
    schema: unknown | null = null;
    schemaVersion: string | null = null;
    schemaLoading = false;
    uiHints: ConfigUiHints = {};
    form: Record<string, unknown> | null = null;
    formOriginal: Record<string, unknown> | null = null;
    formDirty = false;
    formMode: "form" | "raw" = "form";
    searchQuery = "";
    activeSection: string | null = null;
    activeSubsection: string | null = null;

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
