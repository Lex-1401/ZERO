import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { Tab } from "../navigation";
import type { UiSettings } from "../storage";
import type { ThemeMode } from "../theme";
import type { GatewayHelloOk } from "../gateway";
import type { EventLogEntry } from "../app-events";
import { loadSettings } from "../storage";
import { resolveOnboardingMode } from "../navigation";

export type ResolvedTheme = "light" | "dark";

export class UIStore implements ReactiveController {
  host: ReactiveControllerHost;

  settings: UiSettings = loadSettings();
  password = this.settings.token || "";
  tab: Tab = "chat";
  onboarding = resolveOnboardingMode();
  sidebarCollapsed = this.settings.navCollapsed ?? false;
  zenMode = this.settings.zenMode ?? true;
  connected = false;
  theme: ThemeMode = this.settings.theme ?? "system";
  themeResolved: ResolvedTheme = "dark";
  hello: GatewayHelloOk | null = null;
  lastError: string | null = null;
  assistantName = "ZERO";
  assistantAvatar: string | null = null;
  assistantAgentId: string | null = null;
  setupLoading = false;
  setupRecommendations: unknown[] = [];
  setupStep: "scan" | "persona" = "scan";
  eventLog: EventLogEntry[] = [];
  tourActive = false;
  tourStep = 0;
  interfaceDropdownOpen = false;
  mobileNavOpen = false;
  sidebarOpen = false;
  sidebarContent: string | null = null;
  sidebarError: string | null = null;
  splitRatio = this.settings.splitRatio ?? 0.5;
  basePath = "";

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
