import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { SkillStatusReport } from "../types";
import type { SkillMessage } from "../controllers/skills";

export class SkillStore implements ReactiveController {
  host: ReactiveControllerHost;

  loading = false;
  report: SkillStatusReport | null = null;
  error: string | null = null;
  filter = "";
  searchQuery = "";
  edits: Record<string, string> = {};
  messages: Record<string, SkillMessage> = {};
  busyKey: string | null = null;
  installingKey: string | null = null;
  tab: "installed" | "marketplace" = "installed";
  marketplaceSkills: Array<{ name: string; description: string; link: string }> = [];

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
