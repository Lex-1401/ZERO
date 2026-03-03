import { type ReactiveController, type ReactiveControllerHost } from "lit";

export class DocsStore implements ReactiveController {
  host: ReactiveControllerHost;

  loading = false;
  list: any[] = [];
  selectedId: string | null = null;
  content: string | null = null;
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
