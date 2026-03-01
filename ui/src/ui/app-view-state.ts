import type { GatewayBrowserClient, GatewayHelloOk } from "./gateway";
import type { Tab } from "./navigation";
import type { UiSettings } from "./storage";
import type { ThemeMode } from "./theme";
import type { ThemeTransitionContext } from "./theme-transition";
import type {
  AgentsListResult,
  ChannelsStatusSnapshot,
  ConfigSnapshot,
  CronJob,
  CronRunLogEntry,
  CronStatus,
  HealthSnapshot,
  LogEntry,
  LogLevel,
  PresenceEntry,
  SessionsListResult,
  SkillStatusReport,
  StatusSummary,
  ConfigUiHints,
  TelemetrySummary,
  UpdateCheckResult,
} from "./types";
import type { ChatQueueItem, CronFormState } from "./ui-types";
import type { EventLogEntry } from "./app-events";
import type { SkillMessage } from "./controllers/skills";
import type { ExecApprovalsFile, ExecApprovalsSnapshot } from "./controllers/exec-approvals";
import type { DevicePairingList } from "./controllers/devices";
import type { ExecApprovalRequest } from "./controllers/exec-approval";
import type { UpdateStore } from "./stores/update-store";
import type { ModelStore } from "./stores/model-store";
import type { ChannelStore } from "./stores/channel-store";
import type { AgentStore } from "./stores/agent-store";
import type { SkillStore } from "./stores/skill-store";
import type { PresenceStore } from "./stores/presence-store";
import type { DebugStore } from "./stores/debug-store";
import type { GraphStore } from "./stores/graph-store";
import type { UIStore } from "./stores/ui-store";
import type { MissionControlStore } from "./stores/mission-control-store";
import type { NostrStore } from "./stores/nostr-store";
import type { SessionStore } from "./stores/session-store";
import type { CronStore } from "./stores/cron-store";
import type { PlaygroundStore } from "./stores/playground-store";
import type { ConfigStore } from "./stores/config-store";
import type { DeviceStore } from "./stores/device-store";
import type { ExecApprovalStore } from "./stores/exec-approval-store";
import type { ChatStore } from "./stores/chat-store";
import type { LogsStore } from "./stores/logs-store";
import type { TaskStore } from "./stores/task-store";
import type { DocsStore } from "./stores/docs-store";

export type AppViewState = {
  // Domain Stores (Reactive Containers)
  updateStore: UpdateStore;
  modelStore: ModelStore;
  channelStore: ChannelStore;
  agentStore: AgentStore;
  skillStore: SkillStore;
  presenceStore: PresenceStore;
  debugStore: DebugStore;
  graphStore: GraphStore;
  uiStore: UIStore;
  missionControlStore: MissionControlStore;
  nostrStore: NostrStore;
  sessionStore: SessionStore;
  cronStore: CronStore;
  playgroundStore: PlaygroundStore;
  configStore: ConfigStore;
  deviceStore: DeviceStore;
  execApprovalStore: ExecApprovalStore;
  chatStore: ChatStore;
  logsStore: LogsStore;
  taskStore: TaskStore;
  docsStore: DocsStore;

  // Global Config/Context (Shared)
  readonly connected: boolean;
  basePath: string;
  client: GatewayBrowserClient | null;
  lastError: string | null;
  password: string;
  assistantName: string;
  assistantAvatar: string | null;
  assistantAgentId: string | null;

  // ---------------------------------------------------------------------------
  // Flattened properties (The Bridge Layer)
  // These are required by legacy controllers and view renderers.
  // ---------------------------------------------------------------------------

  // Channels
  channelsLoading: boolean;
  channelsSnapshot: ChannelsStatusSnapshot | null;
  channelsError: string | null;
  channelsLastSuccess: number | null;
  whatsappLoginMessage: string | null;
  whatsappLoginQrDataUrl: string | null;
  whatsappLoginConnected: boolean | null;
  whatsappBusy: boolean;

  // Config
  applySessionKey: string;
  configLoading: boolean;
  configRaw: string;
  configRawOriginal: string;
  configValid: boolean | null;
  configIssues: unknown[];
  configSaving: boolean;
  configApplying: boolean;
  updateRunning: boolean;
  configSnapshot: ConfigSnapshot | null;
  configSchema: unknown | null;
  configSchemaVersion: string | null;
  configSchemaLoading: boolean;
  configUiHints: ConfigUiHints;
  configForm: Record<string, unknown> | null;
  configFormOriginal: Record<string, unknown> | null;
  configFormDirty: boolean;
  configFormMode: "form" | "raw";
  configSearchQuery: string;
  configActiveSection: string | null;
  configActiveSubsection: string | null;

  // Presence
  presenceLoading: boolean;
  presenceEntries: PresenceEntry[];
  presenceList: any[]; // Some places use list, some entries
  presenceError: string | null;
  presenceStatus: string | null;

  // Sessions
  sessionsLoading: boolean;
  sessionsResult: SessionsListResult | null;
  sessionsError: string | null;
  sessionsDeletedKey: string | null;
  sessionsPatchingKey: string | null;
  sessionsCompacting: boolean;
  sessionsViewMode: "list" | "grid";
  sessionsFilterActive: string;
  sessionsFilterLimit: string;
  sessionsIncludeGlobal: boolean;
  sessionsIncludeUnknown: boolean;

  // Cron
  cronLoading: boolean;
  cronJobs: CronJob[];
  cronStatus: CronStatus | null;
  cronRuns: CronRunLogEntry[];
  cronFormMode: "add" | "edit";
  cronFormJobId: string | null;
  cronFormState: CronFormState;
  cronRunsLoading: boolean;
  cronFormSaving: boolean;
  cronError: string | null;
  cronForm: any;
  cronRunsJobId: string | null;
  cronBusy: boolean;

  // Skills
  skillsLoading: boolean;
  skillsReport: SkillStatusReport | null;
  skillsError: string | null;
  skillsTab: "installed" | "marketplace";
  skillsSearchQuery: string;
  skillsInstallingKey: string | null;
  skillsBusyKey: string | null;
  skillEdits: Record<string, string>;
  skillMessages: Record<string, SkillMessage>;

  // Nodes / Devices
  nodesLoading: boolean;
  nodes: Array<Record<string, unknown>>;
  devicesLoading: boolean;
  devicesError: string | null;
  devicesList: DevicePairingList | null;

  // Exec Approvals
  execApprovalsLoading: boolean;
  execApprovalsSaving: boolean;
  execApprovalsDirty: boolean;
  execApprovalsState: ExecApprovalsSnapshot | null;
  execApprovalsViewMode: "queue" | "history";
  execApprovalsActiveFile: ExecApprovalsFile | null;
  execApprovalsFiles: ExecApprovalsFile[];
  execApprovalsError: string | null;
  execApprovalsSnapshot: ExecApprovalsSnapshot | null;
  execApprovalsForm: any;
  execApprovalsSelectedAgent: string | null;

  // Exec Approval (Singular Aliases for UI)
  execApprovalQueue: ExecApprovalRequest[];
  execApprovalBusy: boolean;
  execApprovalError: string | null;

  // Chat
  sessionKey: string;
  chatLoading: boolean;
  chatMessages: any[];
  chatStream: string | null;
  chatStreamStartedAt: number | null;
  chatRunId: string | null;
  chatCompactionStatus: any | null;
  chatAvatarUrl: string | null;
  chatThinkingLevel: string | null;
  chatQueue: ChatQueueItem[];
  chatAttachments: File[];
  chatRecording: boolean;
  chatRecordingStartTime: number | null;
  chatSending: boolean;
  chatMessage: string;

  // Debug
  debugLoading: boolean;
  debugStatus: StatusSummary | null;
  debugHealth: HealthSnapshot | null;
  debugModels: unknown[];
  debugHeartbeat: any | null;
  debugCallMethod: string;
  debugCallParams: string;
  debugCallResult: string | null;
  debugCallError: string | null;

  // Logs
  logsLoading: boolean;
  logsError: string | null;
  logsCursor: number | null;
  logsLines: LogEntry[];
  logsAutoFollow: boolean;
  logsAtBottom: boolean;
  logsFilter: LogLevel[];
  logsLimit: number;
  logsSearchQuery: string;
  logsFile: string | null;
  logsEntries: LogEntry[];
  logsTruncated: boolean;
  logsLastFetchAt: number | null;
  logsMaxBytes: number;

  // Agents
  agentsLoading: boolean;
  agentsError: string | null;
  agentsList: AgentsListResult | null;
  agentsDefaultId: string | null;
  agentsSelectedId: string | null;

  // Graph
  graphLoading: boolean;
  graphError: string | null;
  graphData: { nodes: any[]; edges: any[] } | null;
  graphMode: "memory" | "actions";

  // Playground
  playgroundLoading: boolean;
  playgroundSystemPrompt: string;
  playgroundUserPrompt: string;
  playgroundOutput: string;
  playgroundModel: string;
  playgroundTemperature: number;
  playgroundMaxTokens: number;

  // Docs
  docsLoading: boolean;
  docsError: string | null;
  docsList: any[];
  docsSelectedId: string | null;
  docsContent: string | null;

  // Update
  updateStatus: UpdateCheckResult | null;
  updateLoading: boolean;
  updateError: string | null;

  // Mission Control
  missionControlLoading: boolean;
  missionControlSummary: any;
  missionControlError: string | null;

  // Models
  modelsLoading: boolean;
  models: any[];
  modelsError: string | null;

  // Nostr
  nostrProfileFormState: Record<string, unknown> | null;
  nostrProfileAccountId: string | null;

  // ---------------------------------------------------------------------------
  // Orchestration Methods
  // ---------------------------------------------------------------------------
  connect: () => void;
  setTab: (tab: Tab) => void;
  setTheme: (theme: ThemeMode, context?: ThemeTransitionContext) => void;
  applySettings: (next: UiSettings) => void;
  syncNexus: () => Promise<void>;
  loadAssistantIdentity: () => Promise<void>;
  loadCron: () => Promise<void>;
  handleLoadGraph: () => Promise<void>;
  handleWhatsAppStart: (force: boolean) => Promise<void>;
  handleWhatsAppWait: () => Promise<void>;
  handleWhatsAppLogout: () => Promise<void>;
  handleChannelConfigSave: () => Promise<void>;
  handleChannelConfigReload: () => Promise<void>;

  handleExecApprovalDecision: (decision: "allow-once" | "allow-always" | "deny") => Promise<void>;
  handleConfigLoad: () => Promise<void>;
  handleConfigSave: () => Promise<void>;
  handleConfigApply: () => Promise<void>;
  handleConfigFormUpdate: (path: string | (string | number)[], value: unknown) => void;
  handleConfigFormModeChange: (mode: "form" | "raw") => void;
  handleConfigRawChange: (raw: string) => void;
  handleInstallSkill: (key: string) => Promise<void>;
  handleUpdateSkill: (key: string) => Promise<void>;
  handleToggleSkillEnabled: (key: string, enabled: boolean) => Promise<void>;
  handleUpdateSkillEdit: (key: string, value: string) => void;
  handleSaveSkillApiKey: (key: string, apiKey: string) => Promise<void>;
  handleCronToggle: (jobId: string, enabled: boolean) => Promise<void>;
  handleCronRun: (jobId: string) => Promise<void>;
  handleCronRemove: (jobId: string) => Promise<void>;
  handleCronAdd: () => Promise<void>;
  handleCronRunsLoad: (jobId: string) => Promise<void>;
  handleCronFormUpdate: (path: string, value: unknown) => void;
  handleSessionsLoad: () => Promise<void>;
  handleSessionsPatch: (key: string, patch: Record<string, unknown>) => Promise<void>;
  handleLoadNodes: () => Promise<void>;
  handleLoadPresence: () => Promise<void>;
  handleLoadSkills: () => Promise<void>;
  handleRefreshSkills: () => Promise<void>;
  handleLoadDebug: () => Promise<void>;
  handleLoadLogs: () => Promise<void>;
  handleLoadMissionControl: () => Promise<void>;
  handleLoadTasks: () => Promise<void>;
  handleDebugCall: () => Promise<void>;
  handleRunUpdate: () => Promise<void>;
  setPassword: (next: string) => void;
  setSessionKey: (next: string) => void;
  setChatMessage: (next: string) => void;
  handleSendChat: (messageOverride?: string, opts?: Record<string, unknown>) => Promise<void>;
  handleAbortChat: () => Promise<void>;
  handleToggleRecording: () => void;
  handleCancelRecording: () => void;
  removeQueuedMessage: (id: string) => void;
  requestUpdate?: () => void;
  resetToolStream: () => void;
  resetChatScroll: () => void;
  handleChatScroll: (event: Event) => void;
  handleLogsScroll: (event: Event) => void;
  handleOpenSidebar: (content: string) => void;
  handleCloseSidebar: () => void;
  handleSplitRatioChange: (ratio: number) => void;
  exportLogs: (lines: string[], label: string) => void;
  handlePlaygroundRun: () => Promise<void>;
  handlePlaygroundUpdate: (
    patch: Partial<{
      systemPrompt: string;
      userPrompt: string;
      model: string;
      temperature: number;
      maxTokens: number;
      output: string;
    }>,
  ) => void;
  toggleInterfaceDropdown: (value?: boolean) => void;
  handlePanic: () => Promise<void>;
  handleSetupApply: () => Promise<void>;
  handleSetupSkip: () => void;
  handlePersonaSelect: (personaId: string) => Promise<void>;
  handleSetSkillsTab: (tab: "installed" | "marketplace") => void;
  handleNostrProfileEdit: (accountId: string, profile: Record<string, unknown>) => void;
  handleNostrProfileCancel: () => void;
  handleNostrProfileFieldChange: (field: string, value: unknown) => void;
  handleNostrProfileSave: () => Promise<void>;
  handleNostrProfileImport: () => Promise<void>;
  handleNostrProfileToggleAdvanced: () => void;
  handleLoadUpdateStatus: (opts?: { fetchGit?: boolean }) => Promise<void>;
  handleRunSoftwareUpdate: () => Promise<void>;
  handleStartTour: () => void;
  handleTourNext: () => void;
  handleTourPrev: () => void;
  handleTourFinish: () => void;
  handleTourSkip: () => void;
};
