import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { PresenceEntry } from "../types";

export class PresenceStore implements ReactiveController {
  host: ReactiveControllerHost;

  loading = false;
  entries: PresenceEntry[] = [];
  get list() { return this.entries; } // Alias
  set list(v: PresenceEntry[]) { this.entries = v; }
  error: string | null = null;
  status: string | null = null;

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
