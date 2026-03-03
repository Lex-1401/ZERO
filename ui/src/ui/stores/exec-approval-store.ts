import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { ExecApprovalsSnapshot, ExecApprovalsFile } from "../controllers/exec-approvals";
import type { ExecApprovalRequest } from "../controllers/exec-approval";

export class ExecApprovalStore implements ReactiveController {
  host: ReactiveControllerHost;

  loading = false;
  saving = false;
  dirty = false;
  snapshot: ExecApprovalsSnapshot | null = null;
  form: ExecApprovalsFile | null = null;
  selectedAgent: string | null = null;
  target: "gateway" | "node" = "gateway";
  targetNodeId: string | null = null;
  queue: ExecApprovalRequest[] = [];
  busy = false;
  error: string | null = null;

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
