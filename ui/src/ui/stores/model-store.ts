import { type ReactiveController, type ReactiveControllerHost } from "lit";

export class ModelStore implements ReactiveController {
  host: ReactiveControllerHost;

  loading = false;
  models: unknown[] = [];
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
