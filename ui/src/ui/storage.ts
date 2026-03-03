const KEY = "zero.control.settings.v2";

import type { ThemeMode } from "./theme";

export type UiSettings = {
  gatewayUrl: string;
  token: string;
  sessionKey: string;
  lastActiveSessionKey: string;
  theme: ThemeMode;
  chatFocusMode: boolean;
  chatShowThinking: boolean;
  splitRatio: number; // Sidebar split ratio (0.4 to 0.7, default 0.6)
  navCollapsed: boolean; // Collapsible sidebar state
  navGroupsCollapsed: Record<string, boolean>; // Which nav groups are collapsed
  autopilot: boolean; // Automatic mode for tool execution
  zenMode: boolean; // Zen mode state
  onboarded: boolean; // Whether the user completed the onboarding tour
};

export function loadSettings(): UiSettings {
  const defaultUrl = (() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const hostname = location.hostname && location.hostname !== "" ? location.hostname : "localhost";
    const port = location.port && location.port !== "" && location.port !== "5173" ? location.port : "18789";
    return `${proto}://${hostname}:${port}`;
  })();

  const defaults: UiSettings = {
    gatewayUrl: defaultUrl,
    token: "",
    sessionKey: "main", // Default session
    lastActiveSessionKey: "main",
    theme: "system",
    chatFocusMode: false,
    chatShowThinking: true,
    splitRatio: 0.6,
    navCollapsed: false,
    navGroupsCollapsed: {},
    autopilot: false,
    zenMode: true, // Default to Zen Mode for the simplified experience
    onboarded: false,
  };

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as Partial<UiSettings>;

    // Migration: Force update from old ports (like 3000) to 18789 for A-POS.
    // Also handle URLs that are missing the port or have bad hostnames.
    const cleanGatewayUrl = (url: string | undefined): string => {
      if (!url || typeof url !== "string") return defaultUrl;
      const u = url.trim();
      if (u.includes(":3000")) return defaultUrl; // Legacy port
      return u;
    };

    return {
      gatewayUrl: cleanGatewayUrl(parsed.gatewayUrl),
      token: typeof parsed.token === "string" ? parsed.token : defaults.token,
      sessionKey:
        typeof parsed.sessionKey === "string" && parsed.sessionKey.trim()
          ? parsed.sessionKey.trim()
          : defaults.sessionKey,
      lastActiveSessionKey:
        typeof parsed.lastActiveSessionKey === "string" && parsed.lastActiveSessionKey.trim()
          ? parsed.lastActiveSessionKey.trim()
          : (typeof parsed.sessionKey === "string" && parsed.sessionKey.trim()) ||
          defaults.lastActiveSessionKey,
      theme:
        parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system"
          ? parsed.theme
          : defaults.theme,
      chatFocusMode:
        typeof parsed.chatFocusMode === "boolean" ? parsed.chatFocusMode : defaults.chatFocusMode,
      chatShowThinking:
        typeof parsed.chatShowThinking === "boolean"
          ? parsed.chatShowThinking
          : defaults.chatShowThinking,
      splitRatio:
        typeof parsed.splitRatio === "number" &&
          parsed.splitRatio >= 0.4 &&
          parsed.splitRatio <= 0.7
          ? parsed.splitRatio
          : defaults.splitRatio,
      navCollapsed:
        typeof parsed.navCollapsed === "boolean" ? parsed.navCollapsed : defaults.navCollapsed,
      navGroupsCollapsed:
        typeof parsed.navGroupsCollapsed === "object" && parsed.navGroupsCollapsed !== null
          ? parsed.navGroupsCollapsed
          : defaults.navGroupsCollapsed,
      autopilot: typeof parsed.autopilot === "boolean" ? parsed.autopilot : defaults.autopilot,
      zenMode: typeof parsed.zenMode === "boolean" ? parsed.zenMode : defaults.zenMode,
      onboarded: typeof parsed.onboarded === "boolean" ? parsed.onboarded : defaults.onboarded,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(next: UiSettings) {
  localStorage.setItem(KEY, JSON.stringify(next));
}
