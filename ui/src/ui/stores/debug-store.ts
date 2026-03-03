import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { StatusSummary, HealthSnapshot } from "../types";

export class DebugStore implements ReactiveController {
  host: ReactiveControllerHost;

  loading = false;
  status: StatusSummary | null = null;
  health: HealthSnapshot | null = null;
  models: unknown[] = [];
  heartbeat: unknown | null = null;
  callMethod = "sys.info";
  callParams = "{}";
  callResult: string | null = null;
  callError: string | null = null;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected() {}
  hostDisconnected() {}

  requestUpdate() {
    this.host.requestUpdate();
  }
}
