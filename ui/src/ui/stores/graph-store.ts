import { type ReactiveController, type ReactiveControllerHost } from "lit";

export class GraphStore implements ReactiveController {
  host: ReactiveControllerHost;

  loading = false;
  data: { nodes: any[]; edges: any[] } | null = null;
  error: string | null = null;
  mode: "memory" | "actions" = "memory";

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
