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
} from "./types";
import type { ChatQueueItem, CronFormState } from "./ui-types";
import type { EventLogEntry } from "./app-events";
import type { SkillMessage } from "./controllers/skills";
import type {
  ExecApprovalsFile,
  ExecApprovalsSnapshot,
} from "./controllers/exec-approvals";
import type { DevicePairingList } from "./controllers/devices";
import type { ExecApprovalRequest } from "./controllers/exec-approval";


export type AppViewState = {
  settings: UiSettings;
  password: string;
  tab: Tab;
  onboarding: boolean;
  basePath: string;
  connected: boolean;
  theme: ThemeMode;
  themeResolved: "light" | "dark";
  hello: GatewayHelloOk | null;
  lastError: string | null;
  eventLog: EventLogEntry[];
  setupRecommendations: any[];
  setupLoading: boolean;
  setupStep: "scan" | "persona";
  assistantName: string;
  assistantAvatar: string | null;
  assistantAgentId: string | null;
  sessionKey: string;
  chatLoading: boolean;
  chatSending: boolean;
  chatMessage: string;
  chatMessages: unknown[];
  chatToolMessages: unknown[];
  chatStream: string | null;
  chatRunId: string | null;
  chatAvatarUrl: string | null;
  chatThinkingLevel: string | null;
  chatQueue: ChatQueueItem[];
  nodesLoading: boolean;
  nodes: Array<Record<string, unknown>>;
  devicesLoading: boolean;
  devicesError: string | null;
  devicesList: DevicePairingList | null;
  execApprovalsLoading: boolean;
  execApprovalsSaving: boolean;
  execApprovalsDirty: boolean;
  execApprovalsSnapshot: ExecApprovalsSnapshot | null;
  execApprovalsForm: ExecApprovalsFile | null;
  execApprovalsSelectedAgent: string | null;
  execApprovalsTarget: "gateway" | "node";
  execApprovalsTargetNodeId: string | null;
  execApprovalQueue: ExecApprovalRequest[];
  execApprovalBusy: boolean;
  execApprovalError: string | null;
  configLoading: boolean;
  configRaw: string;
  configRawOriginal: string;
  configValid: boolean | null;
  configIssues: unknown[];
  configSaving: boolean;
  configApplying: boolean;
  updateRunning: boolean;
  applySessionKey: string;
  configSnapshot: ConfigSnapshot | null;
  configSchema: unknown | null;
  configSchemaVersion: string | null;
  configSchemaLoading: boolean;
  configUiHints: ConfigUiHints;
  configForm: Record<string, unknown> | null;
  configFormOriginal: Record<string, unknown> | null;
  configFormMode: "form" | "raw";
  configSearchQuery: string;
  configActiveSection: string | null;
  configActiveSubsection: string | null;
  channelsLoading: boolean;
  channelsSnapshot: ChannelsStatusSnapshot | null;
  channelsError: string | null;
  channelsLastSuccess: number | null;
  whatsappLoginMessage: string | null;
  whatsappLoginQrDataUrl: string | null;
  whatsappLoginConnected: boolean | null;
  whatsappBusy: boolean;
  nostrProfileFormState: any | null;
  nostrProfileAccountId: string | null;

  configFormDirty: boolean;
  presenceLoading: boolean;
  presenceEntries: PresenceEntry[];
  presenceError: string | null;
  presenceStatus: string | null;
  agentsLoading: boolean;
  agentsList: AgentsListResult | null;
  agentsError: string | null;
  sessionsLoading: boolean;
  sessionsResult: SessionsListResult | null;
  sessionsError: string | null;
  sessionsFilterActive: string;
  sessionsFilterLimit: string;
  sessionsIncludeGlobal: boolean;
  sessionsIncludeUnknown: boolean;
  cronLoading: boolean;
  cronJobs: CronJob[];
  cronStatus: CronStatus | null;
  cronError: string | null;
  cronForm: CronFormState;
  cronRunsJobId: string | null;
  cronRuns: CronRunLogEntry[];
  cronBusy: boolean;
  skillsLoading: boolean;
  skillsReport: SkillStatusReport | null;
  skillsError: string | null;
  skillsFilter: string;
  skillEdits: Record<string, string>;
  skillMessages: Record<string, SkillMessage>;
  skillsBusyKey: string | null;
  skillsTab: "installed" | "marketplace";
  marketplaceSkills: Array<{ name: string; description: string; link: string }>;
  debugLoading: boolean;
  debugStatus: StatusSummary | null;
  debugHealth: HealthSnapshot | null;
  debugModels: unknown[];
  debugHeartbeat: unknown | null;
  debugCallMethod: string;
  debugCallParams: string;
  debugCallResult: string | null;
  debugCallError: string | null;
  logsLoading: boolean;
  logsError: string | null;
  logsFile: string | null;
  logsEntries: LogEntry[];
  logsFilterText: string;
  logsLevelFilters: Record<LogLevel, boolean>;
  logsAutoFollow: boolean;
  logsTruncated: boolean;
  logsCursor: number | null;
  logsLastFetchAt: number | null;
  logsLimit: number;
  logsMaxBytes: number;
  sidebarOpen: boolean;
  mobileNavOpen: boolean;
  sidebarContent: string | null;
  sidebarError: string | null;
  splitRatio: number;
  toggleMobileNav: () => void;
  chatStreamStartedAt: number | null;
  compactionStatus: any;
  graphLoading: boolean;
  graphData: { nodes: unknown[]; edges: unknown[] } | null;
  graphError: string | null;
  graphMode: "memory" | "actions";
  playgroundSystemPrompt: string;
  playgroundUserPrompt: string;
  playgroundOutput: string;
  playgroundModel: string;
  playgroundTemperature: number;
  playgroundMaxTokens: number;
  playgroundLoading: boolean;
  missionControlLoading: boolean;
  missionControlSummary: TelemetrySummary | null;
  client: GatewayBrowserClient | null;
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
  handleSessionsPatch: (key: string, patch: any) => Promise<void>;
  handleLoadNodes: () => Promise<void>;
  handleLoadPresence: () => Promise<void>;
  handleLoadSkills: () => Promise<void>;
  handleRefreshSkills: () => Promise<void>;
  handleLoadDebug: () => Promise<void>;
  handleLoadLogs: () => Promise<void>;
  handleLoadMissionControl: () => Promise<void>;
  handleDebugCall: () => Promise<void>;
  handleRunUpdate: () => Promise<void>;
  setPassword: (next: string) => void;
  setSessionKey: (next: string) => void;
  setChatMessage: (next: string) => void;
  handleSendChat: (messageOverride?: string, opts?: any) => Promise<void>;
  handleAbortChat: () => Promise<void>;
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
  handlePlaygroundUpdate: (patch: Partial<{
    systemPrompt: string;
    userPrompt: string;
    model: string;
    temperature: number;
    maxTokens: number;
    output: string;
  }>) => void;
  handlePanic: () => Promise<void>;
  handleSetupApply: () => Promise<void>;
  handleSetupSkip: () => void;
  handlePersonaSelect: (personaId: string) => Promise<void>;
  handleSetSkillsTab: (tab: "installed" | "marketplace") => void;
  handleNostrProfileEdit: (accountId: string, profile: any) => void;
  handleNostrProfileCancel: () => void;
  handleNostrProfileFieldChange: (field: string, value: any) => void;
  handleNostrProfileSave: () => Promise<void>;
  handleNostrProfileImport: () => Promise<void>;
  handleNostrProfileToggleAdvanced: () => void;
};
