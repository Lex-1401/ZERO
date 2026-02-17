import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import type { GatewayBrowserClient, GatewayHelloOk } from "./gateway";
import { resolveInjectedAssistantIdentity } from "./assistant-identity";
import { loadSettings, saveSettings, type UiSettings } from "./storage";
import { renderApp } from "./app-render";
import type { Tab } from "./navigation";
import type { ResolvedTheme, ThemeMode } from "./theme";
import type {
  AgentsListResult,
  ConfigSnapshot,
  ConfigUiHints,
  CronJob,
  CronRunLogEntry,
  CronStatus,
  HealthSnapshot,
  LogEntry,
  LogLevel,
  PresenceEntry,
  ChannelsStatusSnapshot,
  SessionsListResult,
  SkillStatusReport,
  StatusSummary,
  TelemetrySummary,
} from "./types";
import { type ChatQueueItem, type CronFormState } from "./ui-types";
import type { EventLogEntry } from "./app-events";
import { DEFAULT_CRON_FORM, DEFAULT_LOG_LEVEL_FILTERS } from "./app-defaults";
import type {
  ExecApprovalsFile,
  ExecApprovalsSnapshot,
} from "./controllers/exec-approvals";
import type { DevicePairingList } from "./controllers/devices";
import type { ExecApprovalRequest } from "./controllers/exec-approval";
import {
  resetToolStream as resetToolStreamInternal,
  type ToolStreamEntry,
} from "./app-tool-stream";
import {
  exportLogs as exportLogsInternal,
  handleChatScroll as handleChatScrollInternal,
  handleLogsScroll as handleLogsScrollInternal,
  resetChatScroll as resetChatScrollInternal,
} from "./app-scroll";
import { connectGateway as connectGatewayInternal } from "./app-gateway";
import {
  handleConnected,
  handleDisconnected,
  handleFirstUpdated,
  handleUpdated,
} from "./app-lifecycle";
import {
  applySettings as applySettingsInternal,
  syncCronInternal,
  syncNexusInternal,
  setTab as setTabInternal,
  setTheme as setThemeInternal,
  onPopState as onPopStateInternal,
} from "./app-settings";
import {
  handleAbortChat as handleAbortChatInternal,
  handleSendChat as handleSendChatInternal,
  removeQueuedMessage as removeQueuedMessageInternal,
} from "./app-chat";
import {
  handleChannelConfigReload as handleChannelConfigReloadInternal,
  handleChannelConfigSave as handleChannelConfigSaveInternal,

  handleWhatsAppLogout as handleWhatsAppLogoutInternal,
  handleWhatsAppStart as handleWhatsAppStartInternal,
  handleWhatsAppWait as handleWhatsAppWaitInternal,
} from "./app-channels";
import {
  startRecording,
  stopRecording,
  cancelRecording,
} from "./app-recording";

import { loadAssistantIdentity as loadAssistantIdentityInternal } from "./controllers/assistant-identity";
import { loadGraph } from "./controllers/graph";
import { runPlayground, updatePlayground } from "./controllers/playground";
import { renderPlayground } from "./views/playground";
import type { AppViewState } from "./app-view-state";
import type { SkillMessage } from "./controllers/skills";

import {
  applyConfig,
  loadConfig,
  runUpdate,
  saveConfig,
  updateConfigFormValue,
} from "./controllers/config";
import { loadUpdateStatus, runSoftwareUpdate } from "./controllers/update";
import { loadSkills, updateSkillEnabled, saveSkillApiKey, installSkill, updateSkillEdit } from "./controllers/skills";
import { translateSkillReport } from "./controllers/skill-translator";
import { t } from "./i18n";
import {
  addCronJob,
  loadCronRuns,
  removeCronJob,
  runCronJob,
  toggleCronJob,
} from "./controllers/cron";
import { loadDocsList, loadDocContent } from "./controllers/docs";
import { deleteSession, loadSessions, patchSession } from "./controllers/sessions";
import { loadNodes } from "./controllers/nodes";
import { loadPresence } from "./controllers/presence";
import { callDebugMethod, loadDebug } from "./controllers/debug";
import { loadLogs } from "./controllers/logs";
import { loadMissionControl } from "./controllers/telemetry";

declare global {
  interface Window {
    __ZERO_CONTROL_UI_BASE_PATH__?: string;
    __ZERO_CONTROL_UI_TOKEN__?: string;
  }
}

import { ChatStore } from "./stores/chat-store";
import { ConfigStore } from "./stores/config-store";
import { CronStore } from "./stores/cron-store";
import { PlaygroundStore } from "./stores/playground-store";
import { SessionStore } from "./stores/session-store";

const injectedAssistantIdentity = resolveInjectedAssistantIdentity();

function resolveOnboardingMode(): boolean {
  if (!window.location.search) return false;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("onboarding");
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

@customElement("zero-app")
export class ZEROApp extends LitElement {
  chatStore = new ChatStore(this);
  configStore = new ConfigStore(this);
  cronStore = new CronStore(this);
  playgroundStore = new PlaygroundStore(this);
  sessionStore = new SessionStore(this);

  @state() settings: UiSettings = loadSettings();
  @state() password = this.settings.token || "";
  @state() tab: Tab = "chat";
  @state() onboarding = resolveOnboardingMode();
  @state() sidebarCollapsed = this.settings.navCollapsed ?? false;
  @state() zenMode = this.settings.zenMode ?? true;
  @state() connected = false;
  @state() theme: ThemeMode = this.settings.theme ?? "system";
  @state() themeResolved: ResolvedTheme = "dark";
  @state() hello: GatewayHelloOk | null = null;
  @state() lastError: string | null = null;
  @state() setupLoading = false;
  @state() setupRecommendations: any[] = [];
  @state() setupStep: "scan" | "persona" = "scan";
  @state() eventLog: EventLogEntry[] = [];
  @state() tourActive = false;
  @state() tourStep = 0;
  private eventLogBuffer: EventLogEntry[] = [];
  private toolStreamSyncTimer: number | null = null;
  private sidebarCloseTimer: number | null = null;

  @state() assistantName = injectedAssistantIdentity.name;
  @state() assistantAvatar = injectedAssistantIdentity.avatar;
  @state() assistantAgentId = injectedAssistantIdentity.agentId ?? null;

  @state() sessionKey = this.settings.sessionKey;
  get chatLoading() { return this.chatStore.loading; }
  set chatLoading(v: boolean) { this.chatStore.loading = v; this.chatStore.requestUpdate(); }

  get chatSending() { return this.chatStore.sending; }
  set chatSending(v: boolean) { this.chatStore.sending = v; this.chatStore.requestUpdate(); }

  get chatMessage() { return this.chatStore.message; }
  set chatMessage(v: string) { this.chatStore.message = v; this.chatStore.requestUpdate(); }

  get chatMessages() { return this.chatStore.messages; }
  set chatMessages(v: unknown[]) { this.chatStore.messages = v; this.chatStore.requestUpdate(); }

  get chatToolMessages() { return this.chatStore.toolMessages; }
  set chatToolMessages(v: unknown[]) { this.chatStore.toolMessages = v; this.chatStore.requestUpdate(); }

  get chatStream() { return this.chatStore.stream; }
  set chatStream(v: string | null) { this.chatStore.stream = v; this.chatStore.requestUpdate(); }

  get chatStreamStartedAt() { return this.chatStore.streamStartedAt; }
  set chatStreamStartedAt(v: number | null) { this.chatStore.streamStartedAt = v; this.chatStore.requestUpdate(); }

  get chatRunId() { return this.chatStore.runId; }
  set chatRunId(v: string | null) { this.chatStore.runId = v; this.chatStore.requestUpdate(); }

  get compactionStatus() { return this.chatStore.compactionStatus; }
  set compactionStatus(v: import("./app-tool-stream").CompactionStatus | null) { this.chatStore.compactionStatus = v; this.chatStore.requestUpdate(); }

  get chatAvatarUrl() { return this.chatStore.avatarUrl; }
  set chatAvatarUrl(v: string | null) { this.chatStore.avatarUrl = v; this.chatStore.requestUpdate(); }

  get chatThinkingLevel() { return this.chatStore.thinkingLevel; }
  set chatThinkingLevel(v: string | null) { this.chatStore.thinkingLevel = v; this.chatStore.requestUpdate(); }

  get chatQueue() { return this.chatStore.queue; }
  set chatQueue(v: ChatQueueItem[]) { this.chatStore.queue = v; this.chatStore.requestUpdate(); }

  get chatAttachments() { return this.chatStore.attachments; }
  set chatAttachments(v: File[]) { this.chatStore.attachments = v; this.chatStore.requestUpdate(); }

  get chatModel() { return this.chatStore.model; }
  set chatModel(v: string | null) { this.chatStore.model = v; this.chatStore.requestUpdate(); }

  get chatRecording() { return this.chatStore.recording; }
  set chatRecording(v: boolean) { this.chatStore.recording = v; this.chatStore.requestUpdate(); }

  get chatRecordingStartTime() { return this.chatStore.recordingStartTime; }
  set chatRecordingStartTime(v: number | null) { this.chatStore.recordingStartTime = v; this.chatStore.requestUpdate(); }
  // Sidebar state for tool output viewing
  @state() sidebarOpen = false;
  @state() mobileNavOpen = false;
  @state() sidebarContent: string | null = null;
  @state() sidebarError: string | null = null;
  @state() splitRatio = this.settings.splitRatio;

  toggleMobileNav() {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.applySettings({ ...this.settings, navCollapsed: this.sidebarCollapsed });
  }

  toggleZenMode(value?: boolean) {
    this.zenMode = value ?? !this.zenMode;
    this.applySettings({ ...this.settings, zenMode: this.zenMode });
  }

  handleToggleRecording() {
    if (this.chatRecording) {
      stopRecording(this);
    } else {
      void startRecording(this);
    }
  }

  handleCancelRecording() {
    cancelRecording(this);
  }

  @state() nodesLoading = false;
  @state() docsLoading = false;
  @state() docsList: any[] = [];
  @state() docsSelectedId: string | null = null;
  @state() docsContent: string | null = null;
  @state() docsError: string | null = null;
  @state() nodes: Array<Record<string, unknown>> = [];
  @state() devicesLoading = false;
  @state() devicesError: string | null = null;
  @state() devicesList: DevicePairingList | null = null;
  @state() execApprovalsLoading = false;
  @state() execApprovalsSaving = false;
  @state() execApprovalsDirty = false;
  @state() execApprovalsSnapshot: ExecApprovalsSnapshot | null = null;
  @state() execApprovalsForm: ExecApprovalsFile | null = null;
  @state() execApprovalsSelectedAgent: string | null = null;
  @state() execApprovalsTarget: "gateway" | "node" = "gateway";
  @state() execApprovalsTargetNodeId: string | null = null;
  @state() execApprovalQueue: ExecApprovalRequest[] = [];
  @state() execApprovalBusy = false;
  @state() execApprovalError: string | null = null;

  get configLoading() { return this.configStore.loading; }
  set configLoading(v: boolean) { this.configStore.loading = v; this.configStore.requestUpdate(); }

  get configRaw() { return this.configStore.raw; }
  set configRaw(v: string) { this.configStore.raw = v; this.configStore.requestUpdate(); }

  get configRawOriginal() { return this.configStore.rawOriginal; }
  set configRawOriginal(v: string) { this.configStore.rawOriginal = v; this.configStore.requestUpdate(); }

  get configValid() { return this.configStore.valid; }
  set configValid(v: boolean | null) { this.configStore.valid = v; this.configStore.requestUpdate(); }

  get configIssues() { return this.configStore.issues; }
  set configIssues(v: unknown[]) { this.configStore.issues = v; this.configStore.requestUpdate(); }

  get configSaving() { return this.configStore.saving; }
  set configSaving(v: boolean) { this.configStore.saving = v; this.configStore.requestUpdate(); }

  get configApplying() { return this.configStore.applying; }
  set configApplying(v: boolean) { this.configStore.applying = v; this.configStore.requestUpdate(); }

  get updateRunning() { return this.configStore.updateRunning; }
  set updateRunning(v: boolean) { this.configStore.updateRunning = v; this.configStore.requestUpdate(); }

  get applySessionKey() { return this.configStore.applySessionKey ?? this.settings.lastActiveSessionKey; }
  set applySessionKey(v: string) { this.configStore.applySessionKey = v; this.configStore.requestUpdate(); }

  get configSnapshot() { return this.configStore.snapshot; }
  set configSnapshot(v: ConfigSnapshot | null) { this.configStore.snapshot = v; this.configStore.requestUpdate(); }

  get configSchema() { return this.configStore.schema; }
  set configSchema(v: unknown | null) { this.configStore.schema = v; this.configStore.requestUpdate(); }

  get configSchemaVersion() { return this.configStore.schemaVersion; }
  set configSchemaVersion(v: string | null) { this.configStore.schemaVersion = v; this.configStore.requestUpdate(); }

  get configSchemaLoading() { return this.configStore.schemaLoading; }
  set configSchemaLoading(v: boolean) { this.configStore.schemaLoading = v; this.configStore.requestUpdate(); }

  get configUiHints() { return this.configStore.uiHints; }
  set configUiHints(v: ConfigUiHints) { this.configStore.uiHints = v; this.configStore.requestUpdate(); }

  get configForm() { return this.configStore.form; }
  set configForm(v: Record<string, unknown> | null) { this.configStore.form = v; this.configStore.requestUpdate(); }

  get configFormOriginal() { return this.configStore.formOriginal; }
  set configFormOriginal(v: Record<string, unknown> | null) { this.configStore.formOriginal = v; this.configStore.requestUpdate(); }

  get configFormDirty() { return this.configStore.formDirty; }
  set configFormDirty(v: boolean) { this.configStore.formDirty = v; this.configStore.requestUpdate(); }

  get configFormMode() { return this.configStore.formMode; }
  set configFormMode(v: "form" | "raw") { this.configStore.formMode = v; this.configStore.requestUpdate(); }

  get configSearchQuery() { return this.configStore.searchQuery; }
  set configSearchQuery(v: string) { this.configStore.searchQuery = v; this.configStore.requestUpdate(); }

  get configActiveSection() { return this.configStore.activeSection; }
  set configActiveSection(v: string | null) { this.configStore.activeSection = v; this.configStore.requestUpdate(); }

  get configActiveSubsection() { return this.configStore.activeSubsection; }
  set configActiveSubsection(v: string | null) { this.configStore.activeSubsection = v; this.configStore.requestUpdate(); }

  @state() channelsLoading = false;
  @state() channelsSnapshot: ChannelsStatusSnapshot | null = null;
  @state() channelsError: string | null = null;
  @state() channelsLastSuccess: number | null = null;
  @state() whatsappLoginMessage: string | null = null;
  @state() whatsappLoginQrDataUrl: string | null = null;
  @state() whatsappLoginConnected: boolean | null = null;
  @state() whatsappBusy = false;
  @state() nostrProfileFormState: any | null = null;
  @state() nostrProfileAccountId: string | null = null;
  @state() missionControlLoading = false;
  @state() missionControlSummary: TelemetrySummary | null = null;

  @state() graphLoading = false;
  @state() graphData: { nodes: unknown[]; edges: unknown[] } | null = null;
  @state() graphError: string | null = null;
  @state() graphMode: "memory" | "actions" = "memory";

  get playgroundSystemPrompt() { return this.playgroundStore.systemPrompt; }
  set playgroundSystemPrompt(v: string) { this.playgroundStore.systemPrompt = v; this.playgroundStore.requestUpdate(); }

  get playgroundUserPrompt() { return this.playgroundStore.userPrompt; }
  set playgroundUserPrompt(v: string) { this.playgroundStore.userPrompt = v; this.playgroundStore.requestUpdate(); }

  get playgroundOutput() { return this.playgroundStore.output; }
  set playgroundOutput(v: string) { this.playgroundStore.output = v; this.playgroundStore.requestUpdate(); }

  get playgroundModel() { return this.playgroundStore.model; }
  set playgroundModel(v: string) { this.playgroundStore.model = v; this.playgroundStore.requestUpdate(); }

  get playgroundTemperature() { return this.playgroundStore.temperature; }
  set playgroundTemperature(v: number) { this.playgroundStore.temperature = v; this.playgroundStore.requestUpdate(); }

  get playgroundMaxTokens() { return this.playgroundStore.maxTokens; }
  set playgroundMaxTokens(v: number) { this.playgroundStore.maxTokens = v; this.playgroundStore.requestUpdate(); }

  get playgroundLoading() { return this.playgroundStore.loading; }
  set playgroundLoading(v: boolean) { this.playgroundStore.loading = v; this.playgroundStore.requestUpdate(); }

  @state() presenceLoading = false;
  @state() presenceEntries: PresenceEntry[] = [];
  @state() presenceError: string | null = null;
  @state() presenceStatus: string | null = null;

  @state() agentsLoading = false;
  @state() agentsList: AgentsListResult | null = null;
  @state() agentsError: string | null = null;

  get sessionsLoading() { return this.sessionStore.loading; }
  set sessionsLoading(v: boolean) { this.sessionStore.loading = v; this.sessionStore.requestUpdate(); }

  get sessionsResult() { return this.sessionStore.result; }
  set sessionsResult(v: SessionsListResult | null) { this.sessionStore.result = v; this.sessionStore.requestUpdate(); }

  get sessionsError() { return this.sessionStore.error; }
  set sessionsError(v: string | null) { this.sessionStore.error = v; this.sessionStore.requestUpdate(); }

  get sessionsFilterActive() { return this.sessionStore.filterActive; }
  set sessionsFilterActive(v: string) { this.sessionStore.filterActive = v; this.sessionStore.requestUpdate(); }

  get sessionsFilterLimit() { return this.sessionStore.filterLimit; }
  set sessionsFilterLimit(v: string) { this.sessionStore.filterLimit = v; this.sessionStore.requestUpdate(); }

  get sessionsIncludeGlobal() { return this.sessionStore.includeGlobal; }
  set sessionsIncludeGlobal(v: boolean) { this.sessionStore.includeGlobal = v; this.sessionStore.requestUpdate(); }

  get sessionsIncludeUnknown() { return this.sessionStore.includeUnknown; }
  set sessionsIncludeUnknown(v: boolean) { this.sessionStore.includeUnknown = v; this.sessionStore.requestUpdate(); }

  get cronLoading() { return this.cronStore.loading; }
  set cronLoading(v: boolean) { this.cronStore.loading = v; this.cronStore.requestUpdate(); }

  get cronJobs() { return this.cronStore.jobs; }
  set cronJobs(v: CronJob[]) { this.cronStore.jobs = v; this.cronStore.requestUpdate(); }

  get cronStatus() { return this.cronStore.status; }
  set cronStatus(v: CronStatus | null) { this.cronStore.status = v; this.cronStore.requestUpdate(); }

  get cronError() { return this.cronStore.error; }
  set cronError(v: string | null) { this.cronStore.error = v; this.cronStore.requestUpdate(); }

  get cronForm() { return this.cronStore.form; }
  set cronForm(v: CronFormState) { this.cronStore.form = v; this.cronStore.requestUpdate(); }

  get cronRunsJobId() { return this.cronStore.runsJobId; }
  set cronRunsJobId(v: string | null) { this.cronStore.runsJobId = v; this.cronStore.requestUpdate(); }

  get cronRuns() { return this.cronStore.runs; }
  set cronRuns(v: CronRunLogEntry[]) { this.cronStore.runs = v; this.cronStore.requestUpdate(); }

  get cronBusy() { return this.cronStore.busy; }
  set cronBusy(v: boolean) { this.cronStore.busy = v; this.cronStore.requestUpdate(); }

  @state() skillsLoading = false;
  @state() skillsReport: SkillStatusReport | null = null;
  @state() skillsError: string | null = null;
  @state() skillsFilter = "";
  @state() skillEdits: Record<string, string> = {};
  @state() skillsBusyKey: string | null = null;
  @state() skillMessages: Record<string, SkillMessage> = {};
  @state() skillsTab: "installed" | "marketplace" = "installed";
  @state() marketplaceSkills: Array<{ name: string; description: string; link: string }> = [];

  @state() debugLoading = false;
  @state() debugStatus: StatusSummary | null = null;
  @state() debugHealth: HealthSnapshot | null = null;
  @state() debugModels: unknown[] = [];
  @state() debugHeartbeat: unknown | null = null;
  @state() debugCallMethod = "sys.info";
  @state() debugCallParams = "{}";
  @state() debugCallResult: string | null = null;
  @state() debugCallError: string | null = null;

  @state() logsLoading = false;
  @state() logsError: string | null = null;
  @state() logsFile: string | null = null;
  @state() logsEntries: LogEntry[] = [];
  @state() logsFilterText = "";
  @state() logsLevelFilters: Record<LogLevel, boolean> = {
    ...DEFAULT_LOG_LEVEL_FILTERS,
  };
  @state() logsAutoFollow = true;
  @state() logsTruncated = false;
  @state() logsCursor: number | null = null;
  @state() logsLastFetchAt: number | null = null;
  @state() logsLimit = 500;
  @state() logsMaxBytes = 250_000;
  @state() logsAtBottom = true;
  @state() updateStatusLoading = false;
  @state() updateStatus: import("./types").UpdateCheckResult | null = null;
  @state() updateStatusError: string | null = null;
  @state() isUpdating = false;

  @state() modelsLoading = false;
  @state() models: any[] = [];

  client: GatewayBrowserClient | null = null;
  private chatScrollFrame: number | null = null;
  private chatScrollTimeout: number | null = null;
  chatHasAutoScrolled = false;
  private chatUserNearBottom = true;
  private nodesPollInterval: number | null = null;
  private logsPollInterval: number | null = null;
  private debugPollInterval: number | null = null;
  private logsScrollFrame: number | null = null;
  private toolStreamById = new Map<string, ToolStreamEntry>();
  private toolStreamOrder: string[] = [];
  basePath = "";
  themeMedia: MediaQueryList | null = null;
  themeMediaHandler: ((event: MediaQueryListEvent) => void) | null = null;
  private popStateHandler = () =>
    onPopStateInternal(
      this as unknown as Parameters<typeof onPopStateInternal>[0],
    );
  private topbarObserver: ResizeObserver | null = null;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    handleConnected(this as unknown as Parameters<typeof handleConnected>[0]);
  }

  protected firstUpdated() {
    handleFirstUpdated(this as unknown as Parameters<typeof handleFirstUpdated>[0]);
  }

  disconnectedCallback() {
    handleDisconnected(this as unknown as Parameters<typeof handleDisconnected>[0]);
    super.disconnectedCallback();
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    handleUpdated(
      this as unknown as Parameters<typeof handleUpdated>[0],
      changed,
    );
  }

  connect() {
    connectGatewayInternal(
      this as unknown as Parameters<typeof connectGatewayInternal>[0],
    );
  }

  handleChatScroll(event: Event) {
    handleChatScrollInternal(
      this as unknown as Parameters<typeof handleChatScrollInternal>[0],
      event,
    );
  }

  handleLogsScroll(event: Event) {
    handleLogsScrollInternal(
      this as unknown as Parameters<typeof handleLogsScrollInternal>[0],
      event,
    );
  }

  exportLogs(lines: string[], label: string) {
    exportLogsInternal(lines, label);
  }

  resetToolStream() {
    resetToolStreamInternal(
      this as unknown as Parameters<typeof resetToolStreamInternal>[0],
    );
  }

  resetChatScroll() {
    resetChatScrollInternal(
      this as unknown as Parameters<typeof resetChatScrollInternal>[0],
    );
  }

  async loadAssistantIdentity() {
    await loadAssistantIdentityInternal(this);
  }

  applySettings(next: UiSettings) {
    applySettingsInternal(
      this as unknown as Parameters<typeof applySettingsInternal>[0],
      next,
    );
  }

  setTab(next: Tab) {
    setTabInternal(this as unknown as Parameters<typeof setTabInternal>[0], next);
  }

  setTheme(next: ThemeMode, context?: Parameters<typeof setThemeInternal>[2]) {
    setThemeInternal(
      this as unknown as Parameters<typeof setThemeInternal>[0],
      next,
      context,
    );
  }

  async syncNexus() {
    await syncNexusInternal(
      this as unknown as Parameters<typeof syncNexusInternal>[0],
    );
  }

  async loadCron() {
    await syncCronInternal(
      this as unknown as Parameters<typeof syncCronInternal>[0],
    );
  }

  async handleAbortChat() {
    await handleAbortChatInternal(
      this as unknown as Parameters<typeof handleAbortChatInternal>[0],
    );
  }

  removeQueuedMessage(id: string) {
    removeQueuedMessageInternal(
      this as unknown as Parameters<typeof removeQueuedMessageInternal>[0],
      id,
    );
  }
  async handleSendChat(
    messageOverride?: string,
    opts?: Parameters<typeof handleSendChatInternal>[2],
  ) {
    await handleSendChatInternal(
      this as unknown as Parameters<typeof handleSendChatInternal>[0],
      messageOverride,
      opts,
    );
  }

  handleSetupSkip() {
    this.onboarding = false;
    // Remove onboarding param from URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete("onboarding");
    window.history.replaceState({}, "", url.toString());
  }

  async handleSetupApply() {
    if (this.client && this.setupRecommendations.length > 0) {
      await this.client.request("system.applyRecommendations", {
        recommendations: this.setupRecommendations
      });
    }
    this.setupStep = "persona";
  }

  async handlePersonaSelect(personaId: string) {
    if (this.client) {
      await this.client.request("system.applyPersona", { personaId });
    }
    this.handleSetupSkip();

    // After setup, if not onboarded, start the tour
    if (!this.settings.onboarded) {
      this.handleStartTour();
    }
  }

  handleStartTour() {
    this.tourActive = true;
    this.tourStep = 0;
  }

  handleTourNext() {
    this.tourStep++;
  }

  handleTourPrev() {
    this.tourStep = Math.max(0, this.tourStep - 1);
  }

  handleTourFinish() {
    this.tourActive = false;
    this.applySettings({ ...this.settings, onboarded: true });
  }

  handleTourSkip() {
    this.tourActive = false;
    this.applySettings({ ...this.settings, onboarded: true });
  }

  async handleWhatsAppStart(force: boolean) {
    await handleWhatsAppStartInternal(this, force);
  }

  async handleWhatsAppWait() {
    await handleWhatsAppWaitInternal(this);
  }

  async handleWhatsAppLogout() {
    await handleWhatsAppLogoutInternal(this);
  }

  async handleChannelConfigSave() {
    await handleChannelConfigSaveInternal(this);
  }

  async handleChannelConfigReload() {
    await handleChannelConfigReloadInternal(this);
  }



  async handleLoadGraph() {
    await loadGraph(this);
  }

  async handleExecApprovalDecision(decision: "allow-once" | "allow-always" | "deny") {
    const active = this.execApprovalQueue[0];
    if (!active || !this.client || this.execApprovalBusy) return;
    this.execApprovalBusy = true;
    this.execApprovalError = null;
    try {
      await this.client.request("exec.approval.resolve", {
        id: active.id,
        decision,
      });
      this.execApprovalQueue = this.execApprovalQueue.filter((entry) => entry.id !== active.id);
    } catch (err) {
      this.execApprovalError = `Falha na aprovação de execução: ${String(err)}`;
    } finally {
      this.execApprovalBusy = false;
    }
  }

  // Sidebar handlers for tool output viewing
  handleOpenSidebar(content: string) {
    if (this.sidebarCloseTimer != null) {
      window.clearTimeout(this.sidebarCloseTimer);
      this.sidebarCloseTimer = null;
    }
    this.sidebarContent = content;
    this.sidebarError = null;
    this.sidebarOpen = true;
  }

  handleCloseSidebar() {
    this.sidebarOpen = false;
    // Clear content after transition
    if (this.sidebarCloseTimer != null) {
      window.clearTimeout(this.sidebarCloseTimer);
    }
    this.sidebarCloseTimer = window.setTimeout(() => {
      if (this.sidebarOpen) return;
      this.sidebarContent = null;
      this.sidebarError = null;
      this.sidebarCloseTimer = null;
    }, 200);
  }

  handleSplitRatioChange(ratio: number) {
    this.splitRatio = ratio;
    this.settings = { ...this.settings, splitRatio: ratio };
    saveSettings(this.settings);
  }

  handleConfigLoad() { return loadConfig(this as unknown as AppViewState); }
  handleConfigSave() { return saveConfig(this as unknown as AppViewState); }
  handleConfigApply() { return applyConfig(this as unknown as AppViewState); }
  handleConfigFormUpdate(path: string | (string | number)[], value: unknown) {
    const p = typeof path === "string" ? [path] : path;
    return updateConfigFormValue(this as unknown as AppViewState, p, value);
  }
  handleConfigFormModeChange(mode: "form" | "raw") { this.configFormMode = mode; }
  handleConfigRawChange(raw: string) { this.configRaw = raw; }
  handleInstallSkill(key: string) { return installSkill(this as unknown as AppViewState, key, "", ""); }
  handleUpdateSkill(key: string) { return loadSkills(this as unknown as AppViewState); }
  handleToggleSkillEnabled(key: string, enabled: boolean) { return updateSkillEnabled(this as unknown as AppViewState, key, enabled); }
  handleUpdateSkillEdit(key: string, value: string) { return updateSkillEdit(this as unknown as AppViewState, key, value); }
  handleSaveSkillApiKey(key: string, apiKey: string) { return saveSkillApiKey(this as unknown as AppViewState, key); }
  handleSetSkillsTab(tab: "installed" | "marketplace") { this.skillsTab = tab; }
  async handleSessionsPatch(key: string, patch: any) {
    return patchSession(this as unknown as AppViewState, key, patch);
  }
  async handleSessionsDelete(key: string) {
    return deleteSession(this as unknown as AppViewState, key);
  }
  async handleCronToggle(jobId: string, enabled: boolean) {
    const job = this.cronJobs.find((j) => j.id === jobId);
    if (!job) return;
    return toggleCronJob(this as unknown as AppViewState, job, enabled);
  }
  async handleCronRun(jobId: string) {
    const job = this.cronJobs.find((j) => j.id === jobId);
    if (!job) return;
    return runCronJob(this as unknown as AppViewState, job);
  }
  async handleCronRemove(jobId: string) {
    const job = this.cronJobs.find((j) => j.id === jobId);
    if (!job) return;
    return removeCronJob(this as unknown as AppViewState, job);
  }
  handleCronAdd() { return addCronJob(this as unknown as AppViewState); }
  handleCronRunsLoad(jobId: string) { return loadCronRuns(this as unknown as AppViewState, jobId); }
  handleCronFormUpdate(path: string, value: unknown) { /* implement if needed */ }
  handleSessionsLoad() { return loadSessions(this as unknown as AppViewState); }
  handleLoadNodes() { return loadNodes(this as unknown as AppViewState); }
  handleLoadPresence() { return loadPresence(this as unknown as AppViewState); }
  handleLoadSkills() { return loadSkills(this as unknown as AppViewState); }
  async handleRefreshSkills() {
    await loadSkills(this as unknown as AppViewState, { clearMessages: true });
    // Trigger tradução automática em background
    translateSkillReport(this as unknown as AppViewState).then(() => {
      this.requestUpdate();
    });
  }
  handleLoadDebug() { return loadDebug(this as unknown as AppViewState); }
  handleLoadLogs() { return loadLogs(this as unknown as AppViewState); }
  handleLoadMissionControl() { return loadMissionControl(this as unknown as AppViewState); }
  handleDebugCall() { return callDebugMethod(this as unknown as AppViewState); }
  handleRunUpdate() { return runUpdate(this as unknown as AppViewState); }
  handleLoadUpdateStatus(opts?: { fetchGit?: boolean }) {
    return loadUpdateStatus(this as unknown as AppViewState, opts);
  }
  handleRunSoftwareUpdate() {
    return runSoftwareUpdate(this as unknown as AppViewState);
  }
  setPassword(next: string) { this.password = next; }
  setSessionKey(next: string) { this.sessionKey = next; }
  setChatMessage(next: string) { this.chatMessage = next; }
  handleChatSelectQueueItem(id: string) { }
  handleChatDropQueueItem(id: string) { }
  handleChatClearQueue() { }
  handleLogsFilterChange(next: string) { this.logsFilterText = next; }
  handleLogsLevelFilterToggle(level: LogLevel) {
    this.logsLevelFilters = { ...this.logsLevelFilters, [level]: !this.logsLevelFilters[level] };
  }
  handleLogsAutoFollowToggle(next: boolean) { this.logsAutoFollow = next; }
  handleCallDebugMethod(method: string, params: string) {
    this.debugCallMethod = method;
    this.debugCallParams = params;
    return callDebugMethod(this as unknown as AppViewState);
  }

  async handlePlaygroundRun() {
    await runPlayground(this as unknown as AppViewState);
  }

  handlePlaygroundUpdate(patch: Parameters<typeof updatePlayground>[1]) {
    updatePlayground(this as unknown as AppViewState, patch);
  }

  handleNostrProfileEdit(accountId: string, profile: any) {
    this.nostrProfileAccountId = accountId;
    this.nostrProfileFormState = { ...profile };
  }

  handleNostrProfileCancel() {
    this.nostrProfileAccountId = null;
    this.nostrProfileFormState = null;
  }

  handleNostrProfileFieldChange(field: string, value: any) {
    if (this.nostrProfileFormState) {
      this.nostrProfileFormState = { ...this.nostrProfileFormState, [field]: value };
    }
  }

  async handleNostrProfileSave() {
    // TODO: Implement save logic if needed, or it's handled via config
  }

  async handleNostrProfileImport() { /* ... */ }
  handleNostrProfileToggleAdvanced() { /* ... */ }

  async handlePanic() {
    console.warn("pânico: parada de emergência acionada");
    this.chatQueue = [];
    this.playgroundLoading = false;
    this.playgroundOutput = "SISTEMA PARADO: Parada de emergência acionada.";

    if (this.client && this.connected) {
      try {
        await this.client.request("system.panic", {});
      } catch (err) {
        console.error("failed to trigger global panic:", err);
        // Fallback to local abort if global fails
        await this.handleAbortChat();
      }
    } else {
      await this.handleAbortChat();
    }

    this.lastError = "Parada de emergência acionada. Operações do sistema interrompidas.";
    this.requestUpdate();
  }

  render() {
    return renderApp(this);
  }
}
