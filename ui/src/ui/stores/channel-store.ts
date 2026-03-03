import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { ChannelsStatusSnapshot } from "../types";

export class ChannelStore implements ReactiveController {
  host: ReactiveControllerHost;

  loading = false;
  snapshot: ChannelsStatusSnapshot | null = null;
  error: string | null = null;
  lastSuccess: number | null = null;
  whatsappLoginMessage: string | null = null;
  whatsappLoginQrDataUrl: string | null = null;
  whatsappLoginConnected: boolean | null = null;
  whatsappBusy = false;

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
