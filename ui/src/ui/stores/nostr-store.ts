import { type ReactiveController, type ReactiveControllerHost } from "lit";

export class NostrStore implements ReactiveController {
  host: ReactiveControllerHost;

  formState: Record<string, unknown> | null = null;
  accountId: string | null = null;

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
