import { type ReactiveController, type ReactiveControllerHost } from "lit";
import type { LogEntry, LogLevel } from "../types";

export const DEFAULT_LOG_LEVEL_FILTERS: Record<LogLevel, boolean> = {
  fatal: true,
  error: true,
  warn: true,
  info: true,
  debug: false,
  trace: false,
};

export class LogsStore implements ReactiveController {
  host: ReactiveControllerHost;

  loading = false;
  error: string | null = null;
  file: string | null = null;
  entries: LogEntry[] = [];
  filterText = "";
  levelFilters: Record<LogLevel, boolean> = { ...DEFAULT_LOG_LEVEL_FILTERS };
  autoFollow = true;
  truncated = false;
  cursor: number | null = null;
  lastFetchAt: number | null = null;
  limit = 500;
  maxBytes = 250_000;
  atBottom = true;

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
