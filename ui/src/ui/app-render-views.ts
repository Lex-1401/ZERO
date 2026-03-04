import { html, nothing } from "lit";
import { renderChat } from "./views/chat";
import { renderConfig } from "./views/config";
import { renderChannels } from "./views/channels";
import { renderCron } from "./views/cron";
import { renderDebug } from "./views/debug";
import { renderInstances } from "./views/instances";
import { renderLogs } from "./views/logs";
import { renderNodes } from "./views/nodes";
import { renderNexus } from "./views/nexus";
import { renderSessions } from "./views/sessions";
import { renderGraph } from "./views/graph";
import { renderMissionControl } from "./views/mission-control";
import { renderTasks } from "./views/tasks";
import { renderPlayground } from "./views/playground";
import { renderSkills } from "./views/skills";
import { renderDocs } from "./views/docs";
import { renderNotFound } from "./views/not-found";
import { loadDevices } from "./controllers/devices";
import { loadChannels } from "./controllers/channels";
import { loadPresence } from "./controllers/presence";
import { deleteSession, loadSessions, patchSession } from "./controllers/sessions";
import {
  installSkill,
  saveSkillApiKey,
  updateSkillEdit,
  updateSkillEnabled,
} from "./controllers/skills";
import { loadNodes } from "./controllers/nodes";
import { loadChatHistory } from "./controllers/chat";
import { loadConfig, saveConfig, updateConfigFormValue } from "./controllers/config";
import { getLanguage, setLanguage, type Language } from "./i18n";
import type { ThemeMode } from "./theme";
import {
  loadExecApprovals,
  saveExecApprovals,
  updateExecApprovalsFormValue,
} from "./controllers/exec-approvals";
import { loadCronRuns, addCronJob } from "./controllers/cron";
import { loadDebug, callDebugMethod } from "./controllers/debug";
import { loadLogs } from "./controllers/logs";
import { loadDocsList, loadDocContent } from "./controllers/docs";
import { LocalizationAgent } from "./agents/localization-agent";

import type { AppViewState } from "./app-view-state";

export function renderViews(state: AppViewState) {
  const tab = state.uiStore.tab;
  const isZen = state.uiStore.zenMode;

  switch (tab) {
    case "overview":
      return renderNexus({
        connected: state.uiStore.connected,
        hello: state.uiStore.hello,
        settings: state.uiStore.settings,
        password: state.uiStore.password,
        lastError: state.uiStore.lastError,
        presenceCount: state.presenceStore.entries.length,
        sessionsCount: state.sessionStore.result?.sessions.length ?? null,
        cronEnabled: state.cronStore.status?.enabled ?? null,
        cronNext: state.cronStore.status?.nextWakeAtMs ?? null,
        lastChannelsRefresh: state.channelStore.lastSuccess,
        onSettingsChange: (next) => state.applySettings(next),
        onPasswordChange: (next) => state.setPassword(next),
        onSessionKeyChange: (next) => {
          state.setSessionKey(next);
          state.applySettings({
            ...state.uiStore.settings,
            sessionKey: next,
            lastActiveSessionKey: next,
          });
          void state.loadAssistantIdentity();
        },
        onConnect: () => state.connect(),
        onRefresh: () => state.syncNexus(),
      });

    case "mission-control":
      return renderMissionControl({
        loading: state.missionControlStore.loading,
        summary: state.missionControlStore.summary,
        panicActive: state.uiStore.hello?.isPanicMode ?? false,
        onRefresh: () => state.handleLoadMissionControl(),
        onPanic: () => state.handlePanic(),
      });

    case "tasks":
      return renderTasks({
        loading: state.taskStore.loading,
        tasks: state.taskStore.list,
        onRefresh: () => state.handleLoadTasks(),
      });

    case "channels":
      return renderChannels({
        connected: state.uiStore.connected,
        loading: state.channelStore.loading,
        snapshot: state.channelStore.snapshot,
        lastError: state.channelStore.error,
        lastSuccessAt: state.channelStore.lastSuccess,
        whatsappMessage: state.channelStore.whatsappLoginMessage,
        whatsappQrDataUrl: state.channelStore.whatsappLoginQrDataUrl,
        whatsappConnected: state.channelStore.whatsappLoginConnected,
        whatsappBusy: state.channelStore.whatsappBusy,
        configSchema: state.configStore.schema as any,
        configSchemaLoading: state.configStore.schemaLoading,
        configForm: state.configStore.form,
        configUiHints: state.configStore.uiHints,
        configSaving: state.configStore.saving,
        configFormDirty: state.configStore.formDirty,
        nostrProfileFormState: state.nostrStore.formState,
        nostrProfileAccountId: state.nostrStore.accountId,
        onRefresh: (probe) => loadChannels(state, probe),
        onWhatsAppStart: (force) => state.handleWhatsAppStart(force),
        onWhatsAppWait: () => state.handleWhatsAppWait(),
        onWhatsAppLogout: () => state.handleWhatsAppLogout(),
        onConfigPatch: (path, value) => updateConfigFormValue(state, path, value),
        onConfigSave: () => state.handleChannelConfigSave(),
        onConfigReload: () => state.handleChannelConfigReload(),
        onNostrProfileEdit: (accountId, profile) =>
          state.handleNostrProfileEdit(accountId, profile),
        onNostrProfileCancel: () => state.handleNostrProfileCancel(),
        onNostrProfileFieldChange: (field, value) =>
          state.handleNostrProfileFieldChange(field, value),
        onNostrProfileSave: () => state.handleNostrProfileSave(),
        onNostrProfileImport: () => state.handleNostrProfileImport(),
        onNostrProfileToggleAdvanced: () => state.handleNostrProfileToggleAdvanced(),
      });

    case "instances":
      return renderInstances({
        loading: state.presenceStore.loading,
        entries: state.presenceStore.entries,
        lastError: state.presenceStore.error,
        statusMessage: state.presenceStore.status,
        onRefresh: () => loadPresence(state),
      });

    case "sessions":
      return renderSessions({
        loading: state.sessionStore.loading,
        result: state.sessionStore.result,
        error: state.sessionStore.error,
        activeMinutes: state.sessionStore.filterActive,
        limit: state.sessionStore.filterLimit,
        includeGlobal: state.sessionStore.includeGlobal,
        includeUnknown: state.sessionStore.includeUnknown,
        basePath: state.basePath,
        onFiltersChange: (next) => {
          state.sessionStore.filterActive = next.activeMinutes;
          state.sessionStore.filterLimit = next.limit;
          state.sessionStore.includeGlobal = next.includeGlobal;
          state.sessionStore.includeUnknown = next.includeUnknown;
        },
        onRefresh: () => loadSessions(state),
        onPatch: (key, patch) => patchSession(state, key, patch),
        onDelete: (key) => deleteSession(state, key),
      });

    case "cron":
      return renderCron({
        loading: state.cronStore.loading,
        status: state.cronStore.status,
        jobs: state.cronStore.jobs,
        error: state.cronStore.error,
        busy: state.cronStore.busy,
        form: state.cronStore.form,
        channels: state.channelStore.snapshot?.channelMeta?.length
          ? state.channelStore.snapshot.channelMeta.map((e) => e.id)
          : [],
        channelLabels: state.channelStore.snapshot?.channelLabels ?? {},
        channelMeta: state.channelStore.snapshot?.channelMeta ?? [],
        runsJobId: state.cronStore.runsJobId,
        runs: state.cronStore.runs,
        onFormChange: (patch) => (state.cronStore.form = { ...state.cronStore.form, ...patch }),
        onRefresh: () => state.loadCron(),
        onAdd: () => addCronJob(state),
        onToggle: (job, enabled) => state.handleCronToggle(job.id, enabled),
        onRun: (job) => state.handleCronRun(job.id),
        onRemove: (job) => state.handleCronRemove(job.id),
        onLoadRuns: (id) => loadCronRuns(state, id),
      });

    case "skills":
      return renderSkills({
        loading: state.skillStore.loading,
        report: state.skillStore.report,
        error: state.skillStore.error,
        filter: state.skillStore.filter,
        edits: state.skillStore.edits,
        messages: state.skillStore.messages,
        busyKey: state.skillStore.busyKey,
        activeTab: state.skillStore.tab,
        marketplaceSkills: state.skillStore.marketplaceSkills,
        onTabChange: (tab) => state.handleSetSkillsTab(tab),
        onFilterChange: (next) => (state.skillStore.filter = next),
        onRefresh: () => state.handleRefreshSkills(),
        onToggle: (k, e) => updateSkillEnabled(state, k, e),
        onEdit: (k, v) => updateSkillEdit(state, k, v),
        onSaveKey: (k) => saveSkillApiKey(state, k),
        onInstall: (k, n, i) => installSkill(state, k, n, i),
      });

    case "nodes":
      return renderNodes({
        loading: state.uiStore.connected, // Placeholder
        nodes: [], // Placeholder
        devicesLoading: state.deviceStore.devicesLoading,
        devicesError: state.deviceStore.devicesError,
        devicesList: state.deviceStore.devicesList,
        configForm:
          state.configStore.form ??
          (state.configStore.snapshot?.config as Record<string, unknown> | null),
        configLoading: state.configStore.loading,
        configSaving: state.configStore.saving,
        configDirty: state.configStore.formDirty,
        configFormMode: state.configStore.formMode,
        execApprovalsLoading: state.execApprovalStore.loading,
        execApprovalsSaving: state.execApprovalStore.saving,
        execApprovalsDirty: state.execApprovalStore.dirty,
        execApprovalsSnapshot: state.execApprovalStore.snapshot,
        execApprovalsForm: state.execApprovalStore.form,
        execApprovalsSelectedAgent: state.execApprovalStore.selectedAgent,
        execApprovalsTarget: state.execApprovalStore.target,
        execApprovalsTargetNodeId: state.execApprovalStore.targetNodeId,
        onRefresh: () => loadNodes(state),
        onDevicesRefresh: () => loadDevices(state),
        onDeviceApprove: (id) => state.handleExecApprovalDecision("allow-once"),
        onDeviceReject: (id) => state.handleExecApprovalDecision("deny"),
        onDeviceRotate: (id, role, scopes) => {
          /* rotate */
        },
        onDeviceRevoke: (id, role) => {
          /* revoke */
        },
        onLoadConfig: () => loadConfig(state),
        onLoadExecApprovals: () => {
          const target =
            state.execApprovalStore.target === "node"
              ? { kind: "node" as const, nodeId: state.execApprovalStore.targetNodeId! }
              : { kind: "gateway" as const };
          return loadExecApprovals(state, target);
        },
        onBindDefault: (nodeId) => updateConfigFormValue(state, ["tools", "exec", "node"], nodeId),
        onBindAgent: (idx, nodeId) =>
          updateConfigFormValue(state, ["agents", "list", idx, "tools", "exec", "node"], nodeId),
        onSaveBindings: () => saveConfig(state),
        onExecApprovalsTargetChange: (k, n) => {
          state.execApprovalStore.target = k;
          state.execApprovalStore.targetNodeId = n;
        },
        onExecApprovalsSelectAgent: (id) => {
          state.execApprovalStore.selectedAgent = id;
        },
        onExecApprovalsPatch: (p, v) => updateExecApprovalsFormValue(state, p, v),
        onExecApprovalsRemove: (p) => {
          /* remove */
        },
        onSaveExecApprovals: () => {
          const target =
            state.execApprovalStore.target === "node"
              ? { kind: "node" as const, nodeId: state.execApprovalStore.targetNodeId! }
              : { kind: "gateway" as const };
          return saveExecApprovals(state, target);
        },
      });

    case "chat":
      return renderChat({
        zenMode: isZen,
        app: state,
        sessionKey: state.chatStore.sessionKey,
        onSessionKeyChange: (next: string) => {
          state.chatStore.sessionKey = next;
          state.applySettings({
            ...state.uiStore.settings,
            sessionKey: next,
            lastActiveSessionKey: next,
          });
          void loadChatHistory(state);
          void state.loadAssistantIdentity();
        },
        thinkingLevel: state.chatStore.thinkingLevel,
        showThinking: state.uiStore.settings.chatShowThinking,
        loading: state.chatStore.loading,
        sending: state.chatStore.sending,
        compactionStatus: state.chatStore.compactionStatus as any,
        assistantAvatarUrl: state.chatStore.avatarUrl,
        messages: state.chatStore.messages,
        toolMessages: state.chatStore.toolMessages,
        stream: state.chatStore.stream,
        streamStartedAt: state.chatStore.streamStartedAt,
        draft: state.chatStore.message,
        chatAttachments: state.chatStore.attachments,
        queue: state.chatStore.queue,
        connected: state.uiStore.connected,
        onAttachmentsChange: (files: File[]) => (state.chatStore.attachments = files),
        canSend: state.uiStore.connected,
        disabledReason: state.uiStore.connected ? null : "offline",
        error: state.uiStore.lastError,
        sessions: state.sessionStore.result,
        focusMode: state.uiStore.settings.chatFocusMode,
        onRefresh: () => Promise.all([loadChatHistory(state), state.loadAssistantIdentity()]),
        onToggleFocusMode: () =>
          state.applySettings({
            ...state.uiStore.settings,
            chatFocusMode: !state.uiStore.settings.chatFocusMode,
          }),
        onChatScroll: (e: Event) => state.handleChatScroll(e),
        onDraftChange: (n: string) => (state.chatStore.message = n),
        onSend: (msg?: string) => state.handleSendChat(msg),
        canAbort: !!state.chatStore.runId,
        onAbort: () => state.handleAbortChat(),
        onQueueRemove: (id: string) => state.removeQueuedMessage(id),
        onNewSession: () => state.handleSendChat("/new"),
        sidebarOpen: state.uiStore.sidebarOpen,
        sidebarContent: state.uiStore.sidebarContent,
        sidebarError: state.uiStore.sidebarError,
        splitRatio: state.uiStore.splitRatio,
        onOpenSidebar: (c: string) => state.handleOpenSidebar(c),
        onCloseSidebar: () => state.handleCloseSidebar(),
        onSplitRatioChange: (r: number) => state.handleSplitRatioChange(r),
        assistantName: state.chatStore.assistantName,
        assistantAvatar: state.chatStore.assistantAvatar,
        chatRecording: state.chatStore.recording,
        chatRecordingStartTime: state.chatStore.recordingStartTime,
        onToggleRecording: () => state.handleToggleRecording(),
        onCancelRecording: () => state.handleCancelRecording(),

        models: state.modelStore.models as any,
        modelsLoading: state.modelStore.loading,
        selectedModel:
          state.chatStore.model ||
          state.sessionStore.result?.sessions.find((s) => s.key === state.chatStore.sessionKey)
            ?.model,
        configuredProviders: Object.keys(
          (state.configStore.snapshot?.config as any)?.models?.providers || {},
        ).filter((k) => {
          const p = (state.configStore.snapshot?.config as any)?.models?.providers?.[k];
          return p && (p.apiKey || p.auth || p.profile);
        }),
        usage: state.missionControlStore.summary,
        onModelChange: async (model: string) => {
          state.chatStore.model = model;
          state.requestUpdate?.();
          await patchSession(state, state.chatStore.sessionKey, { model });
        },
      });

    case "config":
      return renderConfig({
        raw: state.configStore.raw,
        originalRaw: state.configStore.rawOriginal,
        valid: state.configStore.valid,
        issues: state.configStore.issues,
        loading: state.configStore.loading,
        saving: state.configStore.saving,
        applying: state.configStore.applying,
        updateRunning: state.configStore.updateRunning,
        connected: state.uiStore.connected,
        schema: state.configStore.schema,
        schemaLoading: state.configStore.schemaLoading,
        uiHints: state.configStore.uiHints,
        formMode: state.configStore.formMode,
        formValue: state.configStore.form,
        originalValue: state.configStore.formOriginal,
        searchQuery: state.configStore.searchQuery,
        activeSection: state.configStore.activeSection,
        activeSubsection: state.configStore.activeSubsection,
        theme: state.uiStore.theme,
        language: getLanguage(),
        onRawChange: (next: string) => (state.configStore.raw = next),
        onFormModeChange: (next: "form" | "raw") => (state.configStore.formMode = next),
        onFormPatch: (path: string[], value: unknown) => updateConfigFormValue(state, path, value),
        onSearchChange: (next: string) => (state.configStore.searchQuery = next),
        onSectionChange: (next: string | null) => (state.configStore.activeSection = next),
        onSubsectionChange: (next: string | null) => (state.configStore.activeSubsection = next),
        onReload: () => loadConfig(state),
        onSave: () => saveConfig(state),
        onApply: () => state.handleConfigApply(),
        onUpdate: () => state.handleRunUpdate(),
        updateStatus: state.updateStore.status,
        updateStatusLoading: state.updateStore.loading,
        updateStatusError: state.updateStore.error,
        error: state.uiStore.lastError,
        onRefreshUpdateStatus: (opts: Record<string, unknown>) =>
          state.handleLoadUpdateStatus(opts),
        onRunSoftwareUpdate: () => state.handleRunSoftwareUpdate(),
        onThemeChange: (next: ThemeMode) => state.setTheme(next),
        onLanguageChange: (next: Language) => setLanguage(next),
        onStartTour: () => state.handleStartTour(),
      } as any);

    case "debug":
      return renderDebug({
        loading: state.debugStore.loading,
        status: state.debugStore.status,
        health: state.debugStore.health,
        models: state.debugStore.models,
        heartbeat: state.debugStore.heartbeat,
        eventLog: state.uiStore.eventLog,
        callMethod: state.debugStore.callMethod,
        callParams: state.debugStore.callParams,
        callResult: state.debugStore.callResult,
        callError: state.debugStore.callError,
        onCallMethodChange: (n) => (state.debugStore.callMethod = n),
        onCallParamsChange: (n) => (state.debugStore.callParams = n),
        onRefresh: () => loadDebug(state),
        onCall: () => callDebugMethod(state),
        onStressTest: () => LocalizationAgent.getInstance().runStressTest(state, getLanguage()),
      });

    case "logs":
      return renderLogs({
        loading: state.logsStore.loading,
        error: state.logsStore.error,
        file: state.logsStore.file,
        entries: state.logsStore.entries,
        filterText: state.logsStore.filterText,
        levelFilters: state.logsStore.levelFilters,
        autoFollow: state.logsStore.autoFollow,
        truncated: state.logsStore.truncated,
        onFilterTextChange: (n) => (state.logsStore.filterText = n),
        onLevelToggle: (l, e) => {
          state.logsStore.levelFilters = { ...state.logsStore.levelFilters, [l]: e };
        },
        onToggleAutoFollow: (n) => (state.logsStore.autoFollow = n),
        onRefresh: () => loadLogs(state, { reset: true }),
        onExport: (l, b) => state.exportLogs(l, b),
        onScroll: (e) => state.handleLogsScroll(e),
      });

    case "graph":
      return renderGraph({
        loading: state.graphStore.loading,
        data: state.graphStore.data,
        error: state.graphStore.error,
        mode: state.graphStore.mode,
        thinkingNodeIds: state.chatStore.streamStartedAt ? [state.chatStore.sessionKey] : [],
        onRefresh: () => state.handleLoadGraph(),
        onModeChange: (m) => {
          state.graphStore.mode = m;
          state.handleLoadGraph();
        },
      });

    case "docs":
      return renderDocs({
        state: state as any,
        onSelect: (id) => void loadDocContent(state as any, id),
        onRefresh: () => void loadDocsList(state as any),
      });

    case "playground":
      return renderPlayground({
        systemPrompt: state.playgroundStore.systemPrompt,
        userPrompt: state.playgroundStore.userPrompt,
        output: state.playgroundStore.output,
        model: state.playgroundStore.model,
        temperature: state.playgroundStore.temperature,
        maxTokens: state.playgroundStore.maxTokens,
        loading: state.playgroundStore.loading,
        onSystemPromptChange: (n) => state.handlePlaygroundUpdate({ systemPrompt: n }),
        onUserPromptChange: (n) => state.handlePlaygroundUpdate({ userPrompt: n }),
        onModelChange: (n) => state.handlePlaygroundUpdate({ model: n }),
        onTemperatureChange: (n) => state.handlePlaygroundUpdate({ temperature: n }),
        onMaxTokensChange: (n) => state.handlePlaygroundUpdate({ maxTokens: n }),
        onRun: () => state.handlePlaygroundRun(),
        onClear: () => state.handlePlaygroundUpdate({ userPrompt: "", output: "" }),
      });

    default:
      return renderNotFound((route) => state.setTab(route as any));
  }
}
