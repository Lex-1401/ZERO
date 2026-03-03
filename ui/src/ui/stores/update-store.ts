import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { UpdateCheckResult } from "../types";

export class UpdateStore implements ReactiveController {
  host: ReactiveControllerHost;

  loading = false;
  status: UpdateCheckResult | null = null;
  error: string | null = null;
  updating = false;

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
