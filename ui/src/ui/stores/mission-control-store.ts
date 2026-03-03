import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { TelemetrySummary } from "../types";

export class MissionControlStore implements ReactiveController {
  host: ReactiveControllerHost;

  loading = false;
  summary: TelemetrySummary | null = null;
  error: string | null = null;

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
