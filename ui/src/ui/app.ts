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
import type { ExecApprovalsFile, ExecApprovalsSnapshot } from "./controllers/exec-approvals";
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
  predictivePrefetchChat,
  removeQueuedMessage as removeQueuedMessageInternal,
} from "./app-chat";
import {
  handleChannelConfigReload as handleChannelConfigReloadInternal,
  handleChannelConfigSave as handleChannelConfigSaveInternal,
  handleWhatsAppLogout as handleWhatsAppLogoutInternal,
  handleWhatsAppStart as handleWhatsAppStartInternal,
  handleWhatsAppWait as handleWhatsAppWaitInternal,
} from "./app-channels";
import { startRecording, stopRecording, cancelRecording } from "./app-recording";
import { HapticService } from "./services/haptic-service";

import { loadAssistantIdentity as loadAssistantIdentityInternal } from "./controllers/assistant-identity";
import { loadGraph } from "./controllers/graph";
import { runPlayground, updatePlayground } from "./controllers/playground";
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
import {
  loadSkills,
  updateSkillEnabled,
  saveSkillApiKey,
  installSkill,
  updateSkillEdit,
} from "./controllers/skills";
import { translateSkillReport } from "./controllers/skill-translator";
import { loadDocsList, loadDocContent } from "./controllers/docs";
import { loadTasks } from "./controllers/tasks";
import {
  handleExecApprovalDecision,
  handleOpenSidebar,
  handleCloseSidebar,
  handleSplitRatioChange,
  handlePanic,
  handleSetupApply,
  handleSetupSkip,
  handlePersonaSelect,
  handleStartTour,
  handleTourNext,
  handleTourPrev,
  handleTourFinish,
  handleTourSkip,
} from "./app-handlers";
import {
  addCronJob,
  loadCronRuns,
  removeCronJob,
  runCronJob,
  toggleCronJob,
} from "./controllers/cron";
import { deleteSession, loadSessions, patchSession } from "./controllers/sessions";
import { loadNodes } from "./controllers/nodes";
import { loadPresence } from "./controllers/presence";
import { callDebugMethod, loadDebug } from "./controllers/debug";
import { loadLogs } from "./controllers/logs";
import { loadMissionControl } from "./controllers/telemetry";

import { ChatStore } from "./stores/chat-store";
import { ConfigStore } from "./stores/config-store";
import { CronStore } from "./stores/cron-store";
import { PlaygroundStore } from "./stores/playground-store";
import { SessionStore } from "./stores/session-store";
import { ExecApprovalStore } from "./stores/exec-approval-store";
import { DocsStore } from "./stores/docs-store";
import { LogsStore } from "./stores/logs-store";
import { TaskStore } from "./stores/task-store";
import { DeviceStore } from "./stores/device-store";
import { UpdateStore } from "./stores/update-store";
import { ModelStore } from "./stores/model-store";
import { ChannelStore } from "./stores/channel-store";
import { AgentStore } from "./stores/agent-store";
import { SkillStore } from "./stores/skill-store";
import { PresenceStore } from "./stores/presence-store";
import { DebugStore } from "./stores/debug-store";
import { GraphStore } from "./stores/graph-store";
import { UIStore } from "./stores/ui-store";
import { MissionControlStore } from "./stores/mission-control-store";
import { NostrStore } from "./stores/nostr-store";

const injectedAssistantIdentity = resolveInjectedAssistantIdentity();

@customElement("zero-app")
export class ZEROApp extends LitElement {
  // Domain Stores
  chatStore = new ChatStore(this);
  configStore = new ConfigStore(this);
  cronStore = new CronStore(this);
  playgroundStore = new PlaygroundStore(this);
  sessionStore = new SessionStore(this);
  execApprovalStore = new ExecApprovalStore(this);
  docsStore = new DocsStore(this);
  logsStore = new LogsStore(this);
  deviceStore = new DeviceStore(this);
  updateStore = new UpdateStore(this);
  modelStore = new ModelStore(this);
  channelStore = new ChannelStore(this);
  agentStore = new AgentStore(this);
  skillStore = new SkillStore(this);
  presenceStore = new PresenceStore(this);
  debugStore = new DebugStore(this);
  graphStore = new GraphStore(this);
  uiStore = new UIStore(this);
  missionControlStore = new MissionControlStore(this);
  nostrStore = new NostrStore(this);
  taskStore = new TaskStore(this);

  // --- State Bridge Getters ---
  get connected() { return this.uiStore.connected; }

  // Channels
  get channelsLoading() { return this.channelStore.loading; }
  set channelsLoading(v) { this.channelStore.loading = v; }
  get channelsSnapshot() { return this.channelStore.snapshot; }
  set channelsSnapshot(v) { this.channelStore.snapshot = v; }
  get channelsError() { return this.channelStore.error; }
  set channelsError(v) { this.channelStore.error = v; }
  get channelsLastSuccess() { return this.channelStore.lastSuccess; }
  set channelsLastSuccess(v) { this.channelStore.lastSuccess = v; }
  get whatsappLoginMessage() { return this.channelStore.whatsappLoginMessage; }
  set whatsappLoginMessage(v) { this.channelStore.whatsappLoginMessage = v; }
  get whatsappLoginQrDataUrl() { return this.channelStore.whatsappLoginQrDataUrl; }
  set whatsappLoginQrDataUrl(v) { this.channelStore.whatsappLoginQrDataUrl = v; }
  get whatsappLoginConnected() { return this.channelStore.whatsappLoginConnected; }
  set whatsappLoginConnected(v) { this.channelStore.whatsappLoginConnected = v; }
  get whatsappBusy() { return this.channelStore.whatsappBusy; }
  set whatsappBusy(v) { this.channelStore.whatsappBusy = v; }
  get nostrProfileFormState() { return this.nostrStore.formState; }
  set nostrProfileFormState(v) { this.nostrStore.formState = v; }
  get nostrProfileAccountId() { return this.nostrStore.accountId; }
  set nostrProfileAccountId(v) { this.nostrStore.accountId = v; }

  // Config
  get applySessionKey() { return this.configStore.applySessionKey; }
  set applySessionKey(v) { this.configStore.applySessionKey = v; }
  get configLoading() { return this.configStore.loading; }
  set configLoading(v) { this.configStore.loading = v; }
  get configRaw() { return this.configStore.raw; }
  set configRaw(v) { this.configStore.raw = v; }
  get configRawOriginal() { return this.configStore.rawOriginal; }
  set configRawOriginal(v) { this.configStore.rawOriginal = v; }
  get configValid() { return this.configStore.valid; }
  set configValid(v) { this.configStore.valid = v; }
  get configIssues() { return this.configStore.issues; }
  set configIssues(v) { this.configStore.issues = v; }
  get configSaving() { return this.configStore.saving; }
  set configSaving(v) { this.configStore.saving = v; }
  get configApplying() { return this.configStore.applying; }
  set configApplying(v) { this.configStore.applying = v; }
  get updateRunning() { return this.configStore.updateRunning; }
  set updateRunning(v) { this.configStore.updateRunning = v; }
  get configSnapshot() { return this.configStore.snapshot; }
  set configSnapshot(v) { this.configStore.snapshot = v; }
  get configSchema() { return this.configStore.schema; }
  set configSchema(v) { this.configStore.schema = v; }
  get configSchemaVersion() { return this.configStore.schemaVersion; }
  set configSchemaVersion(v) { this.configStore.schemaVersion = v; }
  get configSchemaLoading() { return this.configStore.schemaLoading; }
  set configSchemaLoading(v) { this.configStore.schemaLoading = v; }
  get configUiHints() { return this.configStore.uiHints; }
  set configUiHints(v) { this.configStore.uiHints = v; }
  get configForm() { return this.configStore.form; }
  set configForm(v) { this.configStore.form = v; }
  get configFormOriginal() { return this.configStore.formOriginal; }
  set configFormOriginal(v) { this.configStore.formOriginal = v; }
  get configFormDirty() { return this.configStore.formDirty; }
  set configFormDirty(v) { this.configStore.formDirty = v; }
  get configFormMode() { return this.configStore.formMode; }
  set configFormMode(v) { this.configStore.formMode = v; }
  get configSearchQuery() { return this.configStore.searchQuery; }
  set configSearchQuery(v) { this.configStore.searchQuery = v; }
  get configActiveSection() { return this.configStore.activeSection; }
  set configActiveSection(v) { this.configStore.activeSection = v; }
  get configActiveSubsection() { return this.configStore.activeSubsection; }
  set configActiveSubsection(v) { this.configStore.activeSubsection = v; }
  get password() { return this.uiStore.password; }
  set password(v) { this.uiStore.password = v; }
  get lastError() { return this.uiStore.lastError; }
  set lastError(v) { this.uiStore.lastError = v; }
  get assistantName() { return this.uiStore.assistantName; }
  set assistantName(v) { this.uiStore.assistantName = v; }
  get assistantAvatar() { return this.uiStore.assistantAvatar; }
  set assistantAvatar(v) { this.uiStore.assistantAvatar = v; }
  get assistantAgentId() { return this.uiStore.assistantAgentId; }
  set assistantAgentId(v) { this.uiStore.assistantAgentId = v; }

  // Presence
  get presenceLoading() { return this.presenceStore.loading; }
  set presenceLoading(v) { this.presenceStore.loading = v; }
  get presenceEntries() { return this.presenceStore.entries; }
  set presenceEntries(v) { this.presenceStore.entries = v; }
  get presenceError() { return this.presenceStore.error; }
  set presenceError(v) { this.presenceStore.error = v; }
  get presenceStatus() { return this.presenceStore.status; }
  set presenceStatus(v) { this.presenceStore.status = v; }

  // Sessions
  get sessionsLoading() { return this.sessionStore.loading; }
  set sessionsLoading(v) { this.sessionStore.loading = v; }
  get sessionsResult() { return this.sessionStore.result; }
  set sessionsResult(v) { this.sessionStore.result = v; }
  get sessionsError() { return this.sessionStore.error; }
  set sessionsError(v) { this.sessionStore.error = v; }
  get sessionsDeletedKey() { return this.sessionStore.deletedKey; }
  set sessionsDeletedKey(v) { this.sessionStore.deletedKey = v; }
  get sessionsPatchingKey() { return this.sessionStore.patchingKey; }
  set sessionsPatchingKey(v) { this.sessionStore.patchingKey = v; }
  get sessionsCompacting() { return this.sessionStore.compacting; }
  set sessionsCompacting(v) { this.sessionStore.compacting = v; }
  get sessionsActiveFilter() { return this.sessionStore.activeFilter; }
  set sessionsActiveFilter(v) { this.sessionStore.activeFilter = v; }
  get sessionsViewMode() { return this.sessionStore.viewMode; }
  set sessionsViewMode(v) { this.sessionStore.viewMode = v; }
  get sessionsFilterActive() { return this.sessionStore.filterActive; }
  set sessionsFilterActive(v) { this.sessionStore.filterActive = v; }
  get sessionsFilterLimit() { return this.sessionStore.filterLimit; }
  set sessionsFilterLimit(v) { this.sessionStore.filterLimit = v; }
  get sessionsIncludeGlobal() { return this.sessionStore.includeGlobal; }
  set sessionsIncludeGlobal(v) { this.sessionStore.includeGlobal = v; }
  get sessionsIncludeUnknown() { return this.sessionStore.includeUnknown; }
  set sessionsIncludeUnknown(v) { this.sessionStore.includeUnknown = v; }

  // Cron
  get cronLoading() { return this.cronStore.loading; }
  set cronLoading(v) { this.cronStore.loading = v; }
  get cronJobs() { return this.cronStore.jobs; }
  set cronJobs(v) { this.cronStore.jobs = v; }
  get cronStatus() { return this.cronStore.status; }
  set cronStatus(v) { this.cronStore.status = v; }
  get cronRuns() { return this.cronStore.runs; }
  set cronRuns(v) { this.cronStore.runs = v; }
  get cronFormMode() { return this.cronStore.formMode; }
  set cronFormMode(v) { this.cronStore.formMode = v; }
  get cronFormJobId() { return this.cronStore.formJobId; }
  set cronFormJobId(v) { this.cronStore.formJobId = v; }
  get cronFormState() { return this.cronStore.formState; }
  set cronFormState(v) { this.cronStore.formState = v; }
  get cronRunsLoading() { return this.cronStore.runsLoading; }
  set cronRunsLoading(v) { this.cronStore.runsLoading = v; }
  get cronFormSaving() { return this.cronStore.formSaving; }
  set cronFormSaving(v) { this.cronStore.formSaving = v; }
  get cronError() { return this.cronStore.error; }
  set cronError(v) { this.cronStore.error = v; }
  get cronForm() { return this.cronStore.form; }
  set cronForm(v) { this.cronStore.form = v; }
  get cronRunsJobId() { return this.cronStore.runsJobId; }
  set cronRunsJobId(v) { this.cronStore.runsJobId = v; }
  get cronBusy() { return this.cronStore.busy; }
  set cronBusy(v) { this.cronStore.busy = v; }

  // Skills
  get skillsLoading() { return this.skillStore.loading; }
  set skillsLoading(v) { this.skillStore.loading = v; }
  get skillsReport() { return this.skillStore.report; }
  set skillsReport(v) { this.skillStore.report = v; }
  get skillsError() { return this.skillStore.error; }
  set skillsError(v) { this.skillStore.error = v; }
  get skillsTab() { return this.skillStore.tab; }
  set skillsTab(v) { this.skillStore.tab = v; }
  get skillsSearchQuery() { return this.skillStore.searchQuery; }
  set skillsSearchQuery(v) { this.skillStore.searchQuery = v; }
  get skillsInstallingKey() { return this.skillStore.installingKey; }
  set skillsInstallingKey(v) { this.skillStore.installingKey = v; }
  get skillsBusyKey() { return this.skillStore.busyKey; }
  set skillsBusyKey(v) { this.skillStore.busyKey = v; }
  get skillEdits() { return this.skillStore.edits; }
  set skillEdits(v) { this.skillStore.edits = v; }
  get skillMessages() { return this.skillStore.messages; }
  set skillMessages(v) { this.skillStore.messages = v; }

  // Nodes / Devices
  get nodesLoading() { return this.deviceStore.nodesLoading; }
  set nodesLoading(v) { this.deviceStore.nodesLoading = v; }
  get nodes() { return this.deviceStore.nodes; }
  set nodes(v) { this.deviceStore.nodes = v; }
  get devicesLoading() { return this.deviceStore.devicesLoading; }
  set devicesLoading(v) { this.deviceStore.devicesLoading = v; }
  get devicesError() { return this.deviceStore.devicesError; }
  set devicesError(v) { this.deviceStore.devicesError = v; }
  get devicesList() { return this.deviceStore.devicesList; }
  set devicesList(v) { this.deviceStore.devicesList = v; }

  // Exec Approvals
  get execApprovalsLoading() { return this.execApprovalStore.loading; }
  set execApprovalsLoading(v) { this.execApprovalStore.loading = v; }
  get execApprovalsSaving() { return this.execApprovalStore.saving; }
  set execApprovalsSaving(v) { this.execApprovalStore.saving = v; }
  get execApprovalsDirty() { return this.execApprovalStore.dirty; }
  set execApprovalsDirty(v) { this.execApprovalStore.dirty = v; }
  get execApprovalsState() { return this.execApprovalStore.snapshot; } // state -> snapshot
  set execApprovalsState(v) { this.execApprovalStore.snapshot = v; }
  get execApprovalsViewMode() { return "queue" as any; } // Placeholder or add to store
  set execApprovalsViewMode(v) { /* ... */ }
  get execApprovalsActiveFile() { return this.execApprovalStore.form; } // activeFile -> form
  set execApprovalsActiveFile(v) { this.execApprovalStore.form = v; }
  get execApprovalsFiles() { return []; } // TODO: Implement if needed
  set execApprovalsFiles(v) { /* ... */ }
  get execApprovalsError() { return this.execApprovalStore.error; }
  set execApprovalsError(v) { this.execApprovalStore.error = v; }
  get execApprovalsSnapshot() { return this.execApprovalStore.snapshot; }
  set execApprovalsSnapshot(v) { this.execApprovalStore.snapshot = v; }
  get execApprovalsForm() { return this.execApprovalStore.form; }
  set execApprovalsForm(v) { this.execApprovalStore.form = v; }
  get execApprovalsSelectedAgent() { return this.execApprovalStore.selectedAgent; }
  set execApprovalsSelectedAgent(v) { this.execApprovalStore.selectedAgent = v; }

  // Exec Approval Singular Aliases
  get execApprovalQueue() { return this.execApprovalStore.queue; }
  set execApprovalQueue(v) { this.execApprovalStore.queue = v; }
  get execApprovalBusy() { return this.execApprovalStore.busy; }
  set execApprovalBusy(v) { this.execApprovalStore.busy = v; }
  get execApprovalError() { return this.execApprovalStore.error; }
  set execApprovalError(v) { this.execApprovalStore.error = v; }

  // Chat
  get sessionKey() { return this.chatStore.sessionKey; }
  set sessionKey(v) { this.chatStore.sessionKey = v; }
  get chatLoading() { return this.chatStore.loading; }
  set chatLoading(v) { this.chatStore.loading = v; }
  get chatMessages() { return this.chatStore.messages; }
  set chatMessages(v) { this.chatStore.messages = v; }
  get chatStream() { return this.chatStore.stream; }
  set chatStream(v) { this.chatStore.stream = v; }
  get chatStreamStartedAt() { return this.chatStore.streamStartedAt; }
  set chatStreamStartedAt(v) { this.chatStore.streamStartedAt = v; }
  get chatRunId() { return this.chatStore.runId; }
  set chatRunId(v) { this.chatStore.runId = v; }
  get chatCompactionStatus() { return this.chatStore.compactionStatus; }
  set chatCompactionStatus(v) { this.chatStore.compactionStatus = v; }
  get chatAvatarUrl() { return this.chatStore.avatarUrl; }
  set chatAvatarUrl(v) { this.chatStore.avatarUrl = v; }
  get chatThinkingLevel() { return this.chatStore.thinkingLevel; }
  set chatThinkingLevel(v) { this.chatStore.thinkingLevel = v; }
  get chatQueue() { return this.chatStore.queue; }
  set chatQueue(v) { this.chatStore.queue = v; }
  get chatAttachments() { return this.chatStore.attachments; }
  set chatAttachments(v) { this.chatStore.attachments = v; }
  get chatRecording() { return this.chatStore.recording; }
  set chatRecording(v) { this.chatStore.recording = v; }
  get chatRecordingStartTime() { return this.chatStore.recordingStartTime; }
  set chatRecordingStartTime(v) { this.chatStore.recordingStartTime = v; }
  get chatSending() { return this.chatStore.sending; }
  set chatSending(v) { this.chatStore.sending = v; }
  get chatMessage() { return this.chatStore.message; }
  set chatMessage(v) { this.chatStore.message = v; }

  // Debug
  get debugLoading() { return this.debugStore.loading; }
  set debugLoading(v) { this.debugStore.loading = v; }
  get debugStatus() { return this.debugStore.status; }
  set debugStatus(v) { this.debugStore.status = v; }
  get debugHealth() { return this.debugStore.health; }
  set debugHealth(v) { this.debugStore.health = v; }
  get debugModels() { return this.debugStore.models; }
  set debugModels(v) { this.debugStore.models = v; }
  get debugHeartbeat() { return this.debugStore.heartbeat; }
  set debugHeartbeat(v) { this.debugStore.heartbeat = v; }
  get debugCallMethod() { return this.debugStore.callMethod; }
  set debugCallMethod(v) { this.debugStore.callMethod = v; }
  get debugCallParams() { return this.debugStore.callParams; }
  set debugCallParams(v) { this.debugStore.callParams = v; }
  get debugCallResult() { return this.debugStore.callResult; }
  set debugCallResult(v) { this.debugStore.callResult = v; }
  get debugCallError() { return this.debugStore.callError; }
  set debugCallError(v) { this.debugStore.callError = v; }

  // Logs
  get logsLoading() { return this.logsStore.loading; }
  set logsLoading(v) { this.logsStore.loading = v; }
  get logsError() { return this.logsStore.error; }
  set logsError(v) { this.logsStore.error = v; }
  get logsCursor() { return this.logsStore.cursor; }
  set logsCursor(v) { this.logsStore.cursor = v; }
  get logsLines() { return this.logsStore.entries; }
  set logsLines(v) { this.logsStore.entries = v; }
  get logsAutoFollow() { return this.logsStore.autoFollow; }
  set logsAutoFollow(v) { this.logsStore.autoFollow = v; }
  get logsAtBottom() { return this.logsStore.atBottom; }
  set logsAtBottom(v) { this.logsStore.atBottom = v; }
  get logsFilter() {
    return Object.entries(this.logsStore.levelFilters)
      .filter(([_, enabled]) => enabled)
      .map(([level]) => level as LogLevel);
  }
  set logsFilter(v) { /* ... */ }
  get logsLimit() { return this.logsStore.limit; }
  set logsLimit(v) { this.logsStore.limit = v; }
  get logsSearchQuery() { return this.logsStore.filterText; } // searchQuery -> filterText
  set logsSearchQuery(v) { this.logsStore.filterText = v; }
  get logsFile() { return this.logsStore.file; }
  set logsFile(v) { this.logsStore.file = v; }
  get logsEntries() { return this.logsStore.entries; }
  set logsEntries(v) { this.logsStore.entries = v; }
  get logsTruncated() { return this.logsStore.truncated; }
  set logsTruncated(v) { this.logsStore.truncated = v; }
  get logsLastFetchAt() { return this.logsStore.lastFetchAt; }
  set logsLastFetchAt(v) { this.logsStore.lastFetchAt = v; }
  get logsMaxBytes() { return this.logsStore.maxBytes; }
  set logsMaxBytes(v) { this.logsStore.maxBytes = v; }

  // Agents
  get agentsLoading() { return this.agentStore.loading; }
  set agentsLoading(v) { this.agentStore.loading = v; }
  get agentsError() { return this.agentStore.error; }
  set agentsError(v) { this.agentStore.error = v; }
  get agentsList() { return this.agentStore.list; }
  set agentsList(v) { this.agentStore.list = v; }
  get agentsDefaultId() { return this.agentStore.defaultId; }
  set agentsDefaultId(v) { this.agentStore.defaultId = v; }
  get agentsSelectedId() { return this.agentStore.selectedId; }
  set agentsSelectedId(v) { this.agentStore.selectedId = v; }

  // Graph
  get graphLoading() { return this.graphStore.loading; }
  set graphLoading(v) { this.graphStore.loading = v; }
  get graphError() { return this.graphStore.error; }
  set graphError(v) { this.graphStore.error = v; }
  get graphData() { return this.graphStore.data; }
  set graphData(v: any) { this.graphStore.data = v; }
  get graphMode() { return this.graphStore.mode; }
  set graphMode(v) { this.graphStore.mode = v; }

  // Playground
  get playgroundLoading() { return this.playgroundStore.loading; }
  set playgroundLoading(v) { this.playgroundStore.loading = v; }
  get playgroundSystemPrompt() { return this.playgroundStore.systemPrompt; }
  set playgroundSystemPrompt(v) { this.playgroundStore.systemPrompt = v; }
  get playgroundUserPrompt() { return this.playgroundStore.userPrompt; }
  set playgroundUserPrompt(v) { this.playgroundStore.userPrompt = v; }
  get playgroundOutput() { return this.playgroundStore.output; }
  set playgroundOutput(v) { this.playgroundStore.output = v; }
  get playgroundModel() { return this.playgroundStore.model; }
  set playgroundModel(v) { this.playgroundStore.model = v; }
  get playgroundTemperature() { return this.playgroundStore.temperature; }
  set playgroundTemperature(v) { this.playgroundStore.temperature = v; }
  get playgroundMaxTokens() { return this.playgroundStore.maxTokens; }
  set playgroundMaxTokens(v) { this.playgroundStore.maxTokens = v; }

  // Docs
  get docsLoading() { return this.docsStore.loading; }
  set docsLoading(v) { this.docsStore.loading = v; }
  get docsError() { return this.docsStore.error; }
  set docsError(v) { this.docsStore.error = v; }
  get docsList() { return this.docsStore.list; }
  set docsList(v) { this.docsStore.list = v; }
  get docsSelectedId() { return this.docsStore.selectedId; }
  set docsSelectedId(v) { this.docsStore.selectedId = v; }
  get docsContent() { return this.docsStore.content; }
  set docsContent(v) { this.docsStore.content = v; }

  // Update
  get updateStatus() { return this.updateStore.status; }
  set updateStatus(v) { this.updateStore.status = v; }
  get updateLoading() { return this.updateStore.loading; }
  set updateLoading(v) { this.updateStore.loading = v; }
  get updateError() { return this.updateStore.error; }
  set updateError(v) { this.updateStore.error = v; }

  // Mission Control
  get missionControlLoading() { return this.missionControlStore.loading; }
  set missionControlLoading(v) { this.missionControlStore.loading = v; }
  get missionControlSummary() { return this.missionControlStore.summary; }
  set missionControlSummary(v) { this.missionControlStore.summary = v; }
  get missionControlError() { return this.missionControlStore.error; }
  set missionControlError(v) { this.missionControlStore.error = v; }

  // Models
  get modelsLoading() { return this.modelStore.loading; }
  set modelsLoading(v) { this.modelStore.loading = v; }
  get models() { return this.modelStore.models; }
  set models(v) { this.modelStore.models = v; }
  get modelsError() { return this.modelStore.error; }
  set modelsError(v) { this.modelStore.error = v; }

  // Core properties
  client: GatewayBrowserClient | null = null;
  basePath = "";

  private eventLogBuffer: EventLogEntry[] = [];
  private toolStreamSyncTimer: number | null = null;
  private sidebarCloseTimer: number | null = null;
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
  themeMedia: MediaQueryList | null = null;
  themeMediaHandler: ((event: MediaQueryListEvent) => void) | null = null;
  private popStateHandler = () => onPopStateInternal(this as any);
  private topbarObserver: ResizeObserver | null = null;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    handleConnected(this as any);
  }

  protected firstUpdated() {
    handleFirstUpdated(this as any);
  }

  disconnectedCallback() {
    handleDisconnected(this as any);
    super.disconnectedCallback();
  }

  protected updated(changed: Map<PropertyKey, unknown>) {
    handleUpdated(this as any, changed);
  }

  // Orchestration Methods
  connect() {
    connectGatewayInternal(this as any);
  }
  setTab(next: Tab) {
    setTabInternal(this as any, next);
  }
  setTheme(next: ThemeMode, context?: any) {
    setThemeInternal(this as any, next, context);
  }
  applySettings(next: UiSettings) {
    applySettingsInternal(this as any, next);
  }
  async syncNexus() {
    await syncNexusInternal(this as any);
  }
  async loadAssistantIdentity() {
    await loadAssistantIdentityInternal(this as any);
  }
  async loadCron() {
    await syncCronInternal(this as any);
  }
  async handleLoadGraph() {
    await loadGraph(this as any);
  }
  async handleWhatsAppStart(force: boolean) {
    await handleWhatsAppStartInternal(this as any, force);
  }
  async handleWhatsAppWait() {
    await handleWhatsAppWaitInternal(this as any);
  }
  async handleWhatsAppLogout() {
    await handleWhatsAppLogoutInternal(this as any);
  }
  async handleChannelConfigSave() {
    await handleChannelConfigSaveInternal(this as any);
  }
  async handleChannelConfigReload() {
    await handleChannelConfigReloadInternal(this as any);
  }

  async handleExecApprovalDecision(d: any) {
    await handleExecApprovalDecision(this as any, d);
  }
  async handleLoadTasks() {
    await loadTasks(this as any);
  }
  handleConfigLoad() {
    return loadConfig(this as any);
  }
  handleConfigSave() {
    return saveConfig(this as any);
  }
  handleConfigApply() {
    return applyConfig(this as any);
  }
  handleConfigFormUpdate(path: any, value: any) {
    return updateConfigFormValue(this as any, path, value);
  }
  handleConfigFormModeChange(mode: any) {
    this.configStore.formMode = mode;
  }
  handleConfigRawChange(raw: any) {
    this.configStore.raw = raw;
  }
  handleInstallSkill(key: any) {
    return installSkill(this as any, key, "", "");
  }
  handleUpdateSkill(key: any) {
    return loadSkills(this as any);
  }
  handleToggleSkillEnabled(key: any, enabled: boolean) {
    return updateSkillEnabled(this as any, key, enabled);
  }
  handleUpdateSkillEdit(key: any, value: string) {
    return updateSkillEdit(this as any, key, value);
  }
  handleSaveSkillApiKey(key: any, apiKey: string) {
    return saveSkillApiKey(this as any, key);
  }
  async handleCronToggle(jobId: string, enabled: boolean) {
    const job = this.cronStore.jobs.find((j) => j.id === jobId);
    if (job) return toggleCronJob(this as any, job, enabled);
  }
  async handleCronRun(jobId: string) {
    const job = this.cronStore.jobs.find((j) => j.id === jobId);
    if (job) return runCronJob(this as any, job);
  }
  async handleCronRemove(jobId: string) {
    const job = this.cronStore.jobs.find((j) => j.id === jobId);
    if (job) return removeCronJob(this as any, job);
  }
  handleCronAdd() {
    return addCronJob(this as any);
  }
  handleCronRunsLoad(jobId: string) {
    return loadCronRuns(this as any, jobId);
  }
  handleCronFormUpdate(path: string, value: any) {
    /* redundant with store */
  }
  async handleSessionsLoad() {
    await loadSessions(this as any);
    const sessions = this.sessionStore.result?.sessions ?? [];
    for (const session of sessions.slice(0, 3)) {
      if (session.key !== this.chatStore.sessionKey) {
        void predictivePrefetchChat(this as any, session.key);
      }
    }
  }
  async handleSessionsPatch(key: string, patch: any) {
    return patchSession(this as any, key, patch);
  }
  handleLoadNodes() {
    return loadNodes(this as any);
  }
  handleLoadPresence() {
    return loadPresence(this as any);
  }
  handleLoadSkills() {
    return loadSkills(this as any);
  }
  async handleRefreshSkills() {
    await loadSkills(this as any, { clearMessages: true });
    await translateSkillReport(this as any);
    this.requestUpdate();
  }
  handleLoadDebug() {
    return loadDebug(this as any);
  }
  handleLoadLogs() {
    return loadLogs(this as any);
  }
  handleLoadMissionControl() {
    return loadMissionControl(this as any);
  }
  handleDebugCall() {
    return callDebugMethod(this as any);
  }
  handleRunUpdate() {
    return runUpdate(this as any);
  }
  setPassword(n: string) {
    this.uiStore.password = n;
  }
  setSessionKey(n: string) {
    this.chatStore.sessionKey = n;
  }
  setChatMessage(n: string) {
    this.chatStore.message = n;
  }
  async handleSendChat(m?: string, o?: any) {
    await handleSendChatInternal(this as any, m, o);
  }
  async handleAbortChat() {
    HapticService.light();
    await handleAbortChatInternal(this as any);
  }
  handleToggleRecording() {
    if (this.chatStore.recording) stopRecording(this as any);
    else void startRecording(this as any);
  }
  handleCancelRecording() {
    cancelRecording(this as any);
  }
  removeQueuedMessage(id: string) {
    removeQueuedMessageInternal(this as any, id);
  }
  resetToolStream() {
    resetToolStreamInternal(this as any);
  }
  resetChatScroll() {
    resetChatScrollInternal(this as any);
  }
  handleChatScroll(e: Event) {
    handleChatScrollInternal(this as any, e);
  }
  handleLogsScroll(e: Event) {
    handleLogsScrollInternal(this as any, e);
  }
  handleOpenSidebar(c: string) {
    if (this.sidebarCloseTimer != null) {
      clearTimeout(this.sidebarCloseTimer);
      this.sidebarCloseTimer = null;
    }
    handleOpenSidebar(this as any, c);
  }
  handleCloseSidebar() {
    handleCloseSidebar(this as any);
    if (this.sidebarCloseTimer != null) clearTimeout(this.sidebarCloseTimer);
    this.sidebarCloseTimer = window.setTimeout(() => {
      if (!this.uiStore.sidebarOpen) {
        this.uiStore.sidebarContent = null;
        this.uiStore.sidebarError = null;
      }
      this.sidebarCloseTimer = null;
    }, 200);
  }
  handleSplitRatioChange(r: number) {
    handleSplitRatioChange(this as any, r);
  }
  exportLogs(l: string[], lb: string) {
    exportLogsInternal(l, lb);
  }
  handlePlaygroundRun() {
    return runPlayground(this as any);
  }
  handlePlaygroundUpdate(p: any) {
    updatePlayground(this as any, p);
  }
  toggleInterfaceDropdown(v?: boolean) {
    this.uiStore.interfaceDropdownOpen = v ?? !this.uiStore.interfaceDropdownOpen;
  }
  async handlePanic() {
    await handlePanic(this as any);
  }
  async handleSetupApply() {
    await handleSetupApply(this as any);
  }
  handleSetupSkip() {
    handleSetupSkip(this as any);
  }
  async handlePersonaSelect(pid: string) {
    await handlePersonaSelect(this as any, pid);
  }
  handleSetSkillsTab(t: any) {
    this.skillStore.tab = t;
  }
  handleNostrProfileEdit(aid: string, p: any) {
    this.nostrStore.accountId = aid;
    this.nostrStore.formState = { ...p };
  }
  handleNostrProfileCancel() {
    this.nostrStore.accountId = null;
    this.nostrStore.formState = null;
  }
  handleNostrProfileFieldChange(f: string, v: any) {
    if (this.nostrStore.formState)
      this.nostrStore.formState = { ...this.nostrStore.formState, [f]: v };
  }
  async handleNostrProfileSave() {
    /* ... */
  }
  async handleNostrProfileImport() {
    /* ... */
  }
  handleNostrProfileToggleAdvanced() {
    /* ... */
  }
  handleLoadUpdateStatus(o?: any) {
    return loadUpdateStatus(this as any, o);
  }
  handleRunSoftwareUpdate() {
    return runSoftwareUpdate(this as any);
  }
  handleStartTour() {
    handleStartTour(this as any);
  }
  handleTourNext() {
    handleTourNext(this as any);
  }
  handleTourPrev() {
    handleTourPrev(this as any);
  }
  handleTourFinish() {
    handleTourFinish(this as any);
  }
  handleTourSkip() {
    handleTourSkip(this as any);
  }

  render() {
    return renderApp(this as any);
  }
}
