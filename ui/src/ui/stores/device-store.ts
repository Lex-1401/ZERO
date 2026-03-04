import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { DevicePairingList } from "../controllers/devices";

export class DeviceStore implements ReactiveController {
  host: ReactiveControllerHost;

  nodes: Array<Record<string, unknown>> = [];
  nodesLoading = false;
  devicesLoading = false;
  devicesError: string | null = null;
  devicesList: DevicePairingList | null = null;

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
