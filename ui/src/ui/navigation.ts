import type { IconName } from "./icons.js";
import { t } from "./i18n.js";

export const TAB_GROUPS = [
  { label: t("group.Conversa" as any), tabs: ["chat"] },
  {
    label: t("group.Controle" as any),
    tabs: ["mission-control", "overview", "channels", "instances", "sessions", "cron"],
  },
  { label: t("group.Agente" as any), tabs: ["skills", "nodes", "graph", "playground"] },
  { label: t("group.Ajustes" as any), tabs: ["config", "debug", "logs"] },
] as const;

export type Tab =
  | "mission-control"
  | "overview"
  | "channels"
  | "instances"
  | "sessions"
  | "cron"
  | "skills"
  | "nodes"
  | "graph"
  | "playground"
  | "chat"
  | "config"
  | "debug"
  | "logs"
  | "not-found";

const TAB_PATHS: Record<Tab, string> = {
  "mission-control": "/mission-control",
  overview: "/overview",
  channels: "/channels",
  instances: "/instances",
  sessions: "/sessions",
  cron: "/cron",
  skills: "/skills",
  nodes: "/nodes",
  graph: "/graph",
  playground: "/playground",
  chat: "/chat",
  config: "/config",
  debug: "/debug",
  logs: "/logs",
  "not-found": "/404",
};

export function pathForTab(tab: Tab, basePath: string = ""): string {
  if (tab === "not-found") return window.location.pathname;
  const p = TAB_PATHS[tab] || "/";
  return normalizePath(basePath + p);
}

export function tabFromPath(path: string): Tab {
  const normalized = normalizePath(path);
  if (normalized === "/") return "overview";
  for (const [tab, p] of Object.entries(TAB_PATHS)) {
    if (path.endsWith(p) && tab !== "not-found") return tab as Tab;
  }
  return "not-found";
}

export function inferBasePathFromPathname(pathname: string): string {
  for (const path of Object.values(TAB_PATHS)) {
    if (pathname.endsWith(path)) {
      return pathname.slice(0, -path.length);
    }
  }
  return "";
}

export function normalizeBasePath(base: string): string {
  if (!base || base === "./") return "";
  if (base.endsWith("/")) return base.slice(0, -1);
  return base;
}

export function normalizePath(path: string): string {
  return path.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

export function iconForTab(tab: Tab): IconName {
  switch (tab) {
    case "chat":
      return "messageSquare";
    case "playground":
      return "sliders";
    case "overview":
      return "barChart";
    case "channels":
      return "link";
    case "instances":
      return "radio";
    case "sessions":
      return "fileText";
    case "cron":
      return "loader";
    case "skills":
      return "zap";
    case "nodes":
      return "monitor";
    case "graph":
      return "share2";
    case "config":
      return "settings";
    case "debug":
      return "bug";
    case "mission-control":
      return "activity";
    case "logs":
      return "scrollText";
    default:
      return "folder";
  }
}

export function titleForTab(tab: Tab) {
  return t(`tab.${tab}` as any);
}

export function subtitleForTab(tab: Tab) {
  return t(`subtitle.${tab}` as any);
}
