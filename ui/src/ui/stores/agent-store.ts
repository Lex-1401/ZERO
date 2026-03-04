import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { AgentsListResult } from "../types";

export class AgentStore implements ReactiveController {
  host: ReactiveControllerHost;

  loading = false;
  list: AgentsListResult | null = null;
  error: string | null = null;
  defaultId: string | null = null; // Added
  selectedId: string | null = null; // Added

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
