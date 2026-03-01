import type { Tab } from "./navigation";
import { connectGateway } from "./app-gateway";
import {
  applySettingsFromInjectedConfig,
  applySettingsFromUrl,
  attachThemeListener,
  detachThemeListener,
  inferBasePath,
  syncTabWithLocation,
  syncThemeWithSettings,
} from "./app-settings";
import { observeTopbar, scheduleChatScroll, scheduleLogsScroll } from "./app-scroll";
import {
  startLogsPolling,
  startNodesPolling,
  stopLogsPolling,
  stopNodesPolling,
  startDebugPolling,
  stopDebugPolling,
} from "./app-polling";
import { runSmartScan } from "./controllers/smart-scan";
import type { ZEROApp } from "./app";

import type { ChatStore } from "./stores/chat-store";
import type { UIStore } from "./stores/ui-store";
import type { LogsStore } from "./stores/logs-store";

type LifecycleHost = {
  uiStore: UIStore;
  chatStore: ChatStore;
  logsStore: LogsStore;
  basePath: string;
  chatHasAutoScrolled: boolean;
  popStateHandler: () => void;
  topbarObserver: ResizeObserver | null;
  handleStartTour: () => void;
  connect: () => void;
  syncNexus: () => Promise<void>;
  loadCron: () => Promise<void>;
};

export function handleConnected(host: LifecycleHost) {
  host.basePath = inferBasePath();
  syncTabWithLocation(host as any, true);
  syncThemeWithSettings(host as any);
  attachThemeListener(host as any);
  window.addEventListener("popstate", host.popStateHandler);
  applySettingsFromUrl(host as any);
  applySettingsFromInjectedConfig(host as any);
  host.connect();
  startNodesPolling(host as any);
  if (host.uiStore.tab === "logs") {
    startLogsPolling(host as any);
  }
  if (host.uiStore.tab === "debug") {
    startDebugPolling(host as any);
  }
  if (host.uiStore.onboarding) {
    host.uiStore.setupLoading = true;
    runSmartScan(host as any).then((recommendations) => {
      host.uiStore.setupRecommendations = recommendations;
      host.uiStore.setupLoading = false;
    });
  } else if (!host.uiStore.settings.onboarded) {
    host.handleStartTour();
  }
}

export function handleFirstUpdated(host: LifecycleHost) {
  observeTopbar(host as any);
}

export function handleDisconnected(host: LifecycleHost) {
  window.removeEventListener("popstate", host.popStateHandler);
  stopNodesPolling(host as any);
  stopLogsPolling(host as any);
  stopDebugPolling(host as any);
  detachThemeListener(host as any);
  host.topbarObserver?.disconnect();
  host.topbarObserver = null;
}

export function handleUpdated(host: LifecycleHost, changed: Map<PropertyKey, unknown>) {
  // Note: the changed map relates to the ZEROApp instance.
  // We need to check if the stores have changed or if the tab has changed.
  const tabChanged = host.uiStore.tab; // Simplified check or use changed.has('uiStore')

  // Since Lit controllers trigger host updates, we check the tab and the relevant store states
  if (host.uiStore.tab === "chat") {
    // Scroll handling for chat
    scheduleChatScroll(
      host as any,
      false, // true if tab changed or just loaded
    );
  }
  if (host.uiStore.tab === "logs" && host.logsStore.autoFollow && host.logsStore.atBottom) {
    scheduleLogsScroll(host as any, false);
  }
}
