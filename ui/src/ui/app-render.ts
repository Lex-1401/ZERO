import { html, nothing } from "lit";
import { until } from "lit/directives/until.js";

import type { AppViewState } from "./app-view-state";
import {
  TAB_GROUPS,
  titleForTab,
  type Tab,
} from "./navigation";
import { icons } from "./icons";
import type { ThemeMode } from "./theme";
import type { Language } from "./i18n";
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
import { renderExecApprovalPrompt } from "./views/exec-approval";
import { renderPlayground } from "./views/playground";
import { loadDevices } from "./controllers/devices";
import { renderSkills } from "./views/skills";
import { renderSetup } from "./views/setup";
import { renderDocs } from "./views/docs";
import { loadDocsList, loadDocContent } from "./controllers/docs";
import { renderGuidedTour, type TourStep } from "./views/guided-tour";
import { renderNotFound } from "./views/not-found";
import {
  renderChatControls,
  renderTab,
} from "./app-render.helpers";
import { loadChannels } from "./controllers/channels";
import { loadPresence } from "./controllers/presence";
import { deleteSession, loadSessions, patchSession } from "./controllers/sessions";
import {
  installSkill,
  loadSkills,
  saveSkillApiKey,
  updateSkillEdit,
  updateSkillEnabled,
} from "./controllers/skills";
import { loadNodes } from "./controllers/nodes";
import { loadChatHistory } from "./controllers/chat";
import { loadConfig, saveConfig, updateConfigFormValue, runUpdate } from "./controllers/config";
import { getLanguage, setLanguage, t } from "./i18n";
import {
  loadExecApprovals,
  removeExecApprovalsFormValue,
  saveExecApprovals,
  updateExecApprovalsFormValue,
} from "./controllers/exec-approvals";
import { loadCronRuns, toggleCronJob, runCronJob, removeCronJob, addCronJob } from "./controllers/cron";
import { loadDebug, callDebugMethod } from "./controllers/debug";
import { loadLogs } from "./controllers/logs";

import "./zen/zen-dashboard";

const TOUR_STEPS: TourStep[] = [
  {
    title: t("onboarding.tour.welcome.title" as any),
    desc: t("onboarding.tour.welcome.desc" as any),
    icon: icons.sparkles
  },
  {
    title: t("onboarding.tour.chat.title" as any),
    desc: t("onboarding.tour.chat.desc" as any),
    targetTab: "chat",
    icon: icons.messageSquare
  },
  {
    title: t("onboarding.tour.zen.title" as any),
    desc: t("onboarding.tour.zen.desc" as any),
    icon: icons.maximize
  },
  {
    title: t("onboarding.tour.skills.title" as any),
    desc: t("onboarding.tour.skills.desc" as any),
    targetTab: "skills",
    icon: icons.zap
  },
  {
    title: t("onboarding.tour.channels.title" as any),
    desc: t("onboarding.tour.channels.desc" as any),
    targetTab: "channels",
    icon: icons.globe
  },
  {
    title: t("onboarding.tour.security.title" as any),
    desc: t("onboarding.tour.security.desc" as any),
    targetTab: "nodes",
    icon: icons.shieldCheck
  }
];

export function renderApp(state: AppViewState) {
  /* Setup / Onboarding Flow */
  if (state.onboarding) {
    return renderSetup({
      recommendations: state.setupRecommendations,
      loading: state.setupLoading,
      step: state.setupStep,
      onApply: () => state.handleSetupApply(),
      onSkip: () => state.handleSetupSkip(),
      onPersonaSelect: (id) => state.handlePersonaSelect(id),
    });
  }

  /* Zen Mode Logic - Integrated, not appended */
  const isZen = state.zenMode;

  const isChat = state.tab === "chat";

  return html`
    <div class="shell ${state.mobileNavOpen ? "mobile-nav-open" : ""} ${state.sidebarCollapsed ? "sidebar-collapsed" : ""} ${isZen ? "zen-mode" : ""}">
      <div class="mobile-nav-overlay" @click=${() => state.toggleMobileNav()}></div>
      
      <!-- Native Sidebar -->
      <aside class="nav" style="padding-top: 20px;">
        <div class="mascot-container">
            <div class="mascot-glow"></div>
            <div class="mascot-container-red" @click=${() => state.setTab("chat")}>
                <img src="logo.png?v=2" alt="Zero Mascot" class="mascot-img-red" />
                <span class="mascot-brand">ZERO</span>
            </div>
        </div>

        ${!isZen ? html`
        <div class="sidebar-search">
            <div class="search-icon" style="flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; color: var(--text-dim);">${icons.search}</div>
            <input type="text" .placeholder="${t("common.search_placeholder")}" />
        </div>
        ` : nothing}

        <nav style="flex: 1; overflow-y: auto; padding-top: 8px;">
          ${TAB_GROUPS.map((group) => {
    const visibleTabs = isZen
      ? group.tabs.filter((t) => ["chat", "sessions", "skills", "config"].includes(t))
      : group.tabs;

    if (visibleTabs.length === 0) return nothing;

    return html`
            <div class="nav-group">
              <div class="nav-group-title">${group.label}</div>
              <div class="nav-group-items">
                ${visibleTabs.map((tab) => renderTab(state, tab as any))}
              </div>
            </div>
          `;
  })}
        </nav>
      </aside>

      <header class="topbar">
        <div class="topbar-nav">
            <button class="btn-mobile-menu" @click=${() => state.toggleMobileNav()}>${icons.menu}</button>
            <button class="btn-nav-history" @click=${() => state.toggleSidebar()} title="Alternar Menu">
                ${icons.panelLeft}
            </button>
            ${!isZen ? html`
                <button class="btn-nav-history">${icons.chevronLeft}</button>
                <button class="btn-nav-history">${icons.chevronRight}</button>
            ` : nothing}
        </div>
        <div class="page-info" style="display: flex; align-items: center; gap: 8px; position: relative;">
            <h1 class="page-title">${titleForTab(state.tab)}</h1>
            <div class="dropdown" style="display: inline-block;">
                <button class="btn-nav-history" style="padding: 4px; border-radius: 6px; background: rgba(255,255,255,0.03);" 
                        @click=${(e: Event) => {
      const menu = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement;
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      e.stopPropagation();
      window.addEventListener('click', () => menu.style.display = 'none', { once: true });
    }}>
                    ${icons.chevronDown}
                </button>
                <div class="dropdown-menu" style="display: none; position: absolute; top: 100%; left: 0; background: #111; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 8px; min-width: 180px; z-index: 1000; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin-top: 8px;">
                    <div style="font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.3); padding: 8px 12px; text-transform: uppercase; letter-spacing: 0.05em;">Selecionar Interface</div>
                    <div class="dropdown-item" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 600; color: ${state.tab === 'chat' && !state.zenMode ? '#fff' : 'rgba(255,255,255,0.5)'};" 
                         @click=${() => { state.toggleZenMode(false); state.setTab('chat'); }}>
                        <span style="width: 16px; height: 16px;">${icons.messageSquare}</span>
                        <span>Chat Completo</span>
                    </div>
                    <div class="dropdown-item" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 600; color: ${state.zenMode ? '#fff' : 'rgba(255,255,255,0.5)'};" 
                         @click=${() => { state.toggleZenMode(true); }}>
                        <span style="width: 16px; height: 16px;">${icons.maximize}</span>
                        <span>Modo Zen (Simples)</span>
                    </div>
                    ${!isZen ? html`
                    <div class="dropdown-item" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 600; color: ${state.tab === 'playground' ? '#fff' : 'rgba(255,255,255,0.5)'};" 
                         @click=${() => { state.setTab('playground'); }}>
                        <span style="width: 16px; height: 16px;">${icons.sliders}</span>
                        <span>Playground</span>
                    </div>
                    <div class="dropdown-item" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 600; color: ${state.tab === 'mission-control' ? '#fff' : 'rgba(255,255,255,0.5)'};" 
                         @click=${() => { state.setTab('mission-control'); }}>
                        <span style="width: 16px; height: 16px;">${icons.activity}</span>
                        <span>Mission Control</span>
                    </div>
                    ` : nothing}
                    <style>
                        .dropdown-item:hover { background: rgba(255,255,255,0.05); color: #fff !important; }
                    </style>
                </div>
            </div>
        </div>
        <div class="topbar-status">
            ${!isZen ? html`
            <div class="sentinel-badge" title="Zero Sentinel Active: Protecting your privacy">
                ${icons.shield}
                <span class="sentinel-text">${t("app.sentinel" as any)}</span>
            </div>
            ` : nothing}
            <div style="display: flex; align-items: center; gap: 8px; margin-right: 12px; border-left: 1px solid var(--border-subtle); padding-left: 12px;">
                <div class="status-orb ${state.connected ? "success" : "danger"}"></div>
                <span class="text-xs font-bold text-muted uppercase tracking-wider">${state.connected ? t("app.online" as any) : t("app.offline" as any)}</span>
            </div>
            ${!isZen ? html`
                <button class="btn danger" @click=${() => state.handlePanic()}>${t("app.panic" as any)}</button>
            ` : nothing}
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="content">
        ${state.tab === "overview"
      ? renderNexus({
        connected: state.connected,
        hello: state.hello,
        settings: state.settings,
        password: state.password,
        lastError: state.lastError,
        presenceCount: state.presenceEntries.length,
        sessionsCount: state.sessionsResult?.sessions.length ?? null,
        cronEnabled: state.cronStatus?.enabled ?? null,
        cronNext: state.cronStatus?.nextWakeAtMs ?? null,
        lastChannelsRefresh: state.channelsLastSuccess,
        onSettingsChange: (next) => state.applySettings(next),
        onPasswordChange: (next) => state.setPassword(next),
        onSessionKeyChange: (next) => {
          state.setSessionKey(next);
          state.applySettings({ ...state.settings, sessionKey: next, lastActiveSessionKey: next });
          void state.loadAssistantIdentity();
        },
        onConnect: () => state.connect(),
        onRefresh: () => state.syncNexus(),
      })
      : nothing}

        ${state.tab === "mission-control"
      ? renderMissionControl({
        loading: state.missionControlLoading,
        summary: state.missionControlSummary,
        panicActive: state.hello?.isPanicMode ?? false,
        onRefresh: () => state.handleLoadMissionControl(),
        onPanic: () => state.handlePanic(),
      })
      : nothing}

        ${state.tab === "channels"
      ? renderChannels({
        connected: state.connected,
        loading: state.channelsLoading,
        snapshot: state.channelsSnapshot,
        lastError: state.channelsError,
        lastSuccessAt: state.channelsLastSuccess,
        whatsappMessage: state.whatsappLoginMessage,
        whatsappQrDataUrl: state.whatsappLoginQrDataUrl,
        whatsappConnected: state.whatsappLoginConnected,
        whatsappBusy: state.whatsappBusy,
        configSchema: state.configSchema as any,
        configSchemaLoading: state.configSchemaLoading,
        configForm: state.configForm,
        configUiHints: state.configUiHints,
        configSaving: state.configSaving,
        configFormDirty: state.configFormDirty,
        nostrProfileFormState: state.nostrProfileFormState,
        nostrProfileAccountId: state.nostrProfileAccountId,
        onRefresh: (probe) => loadChannels(state, probe),
        onWhatsAppStart: (force) => state.handleWhatsAppStart(force),
        onWhatsAppWait: () => state.handleWhatsAppWait(),
        onWhatsAppLogout: () => state.handleWhatsAppLogout(),
        onConfigPatch: (path, value) => updateConfigFormValue(state, path, value),
        onConfigSave: () => state.handleChannelConfigSave(),
        onConfigReload: () => state.handleChannelConfigReload(),
        onNostrProfileEdit: (accountId, profile) => state.handleNostrProfileEdit(accountId, profile),
        onNostrProfileCancel: () => state.handleNostrProfileCancel(),
        onNostrProfileFieldChange: (field, value) => state.handleNostrProfileFieldChange(field, value),
        onNostrProfileSave: () => state.handleNostrProfileSave(),
        onNostrProfileImport: () => state.handleNostrProfileImport(),
        onNostrProfileToggleAdvanced: () => state.handleNostrProfileToggleAdvanced(),
      })
      : nothing}

        ${state.tab === "instances"
      ? renderInstances({
        loading: state.presenceLoading,
        entries: state.presenceEntries,
        lastError: state.presenceError,
        statusMessage: state.presenceStatus,
        onRefresh: () => loadPresence(state),
      })
      : nothing}

        ${state.tab === "sessions"
      ? renderSessions({
        loading: state.sessionsLoading,
        result: state.sessionsResult,
        error: state.sessionsError,
        activeMinutes: state.sessionsFilterActive,
        limit: state.sessionsFilterLimit,
        includeGlobal: state.sessionsIncludeGlobal,
        includeUnknown: state.sessionsIncludeUnknown,
        basePath: state.basePath,
        onFiltersChange: (next) => {
          state.sessionsFilterActive = next.activeMinutes;
          state.sessionsFilterLimit = next.limit;
          state.sessionsIncludeGlobal = next.includeGlobal;
          state.sessionsIncludeUnknown = next.includeUnknown;
        },
        onRefresh: () => loadSessions(state),
        onPatch: (key, patch) => patchSession(state, key, patch),
        onDelete: (key) => deleteSession(state, key),
      })
      : nothing}

        ${state.tab === "cron"
      ? renderCron({
        loading: state.cronLoading,
        status: state.cronStatus,
        jobs: state.cronJobs,
        error: state.cronError,
        busy: state.cronBusy,
        form: state.cronForm,
        channels: state.channelsSnapshot?.channelMeta?.length ? state.channelsSnapshot.channelMeta.map((e) => e.id) : [],
        channelLabels: state.channelsSnapshot?.channelLabels ?? {},
        channelMeta: state.channelsSnapshot?.channelMeta ?? [],
        runsJobId: state.cronRunsJobId,
        runs: state.cronRuns,
        onFormChange: (patch) => (state.cronForm = { ...state.cronForm, ...patch }),
        onRefresh: () => state.loadCron(),
        onAdd: () => addCronJob(state),
        onToggle: (job, enabled) => state.handleCronToggle(job.id, enabled),
        onRun: (job) => state.handleCronRun(job.id),
        onRemove: (job) => state.handleCronRemove(job.id),
        onLoadRuns: (id) => loadCronRuns(state, id),
      })
      : nothing}

        ${state.tab === "skills"
      ? renderSkills({
        loading: state.skillsLoading,
        report: state.skillsReport,
        error: state.skillsError,
        filter: state.skillsFilter,
        edits: state.skillEdits,
        messages: state.skillMessages,
        busyKey: state.skillsBusyKey,
        activeTab: state.skillsTab,
        marketplaceSkills: state.marketplaceSkills,
        onTabChange: (tab) => state.handleSetSkillsTab(tab),
        onFilterChange: (next) => (state.skillsFilter = next),
        onRefresh: () => state.handleRefreshSkills(),
        onToggle: (k, e) => updateSkillEnabled(state, k, e),
        onEdit: (k, v) => updateSkillEdit(state, k, v),
        onSaveKey: (k) => saveSkillApiKey(state, k),
        onInstall: (k, n, i) => installSkill(state, k, n, i),
      })
      : nothing}

        ${state.tab === "nodes"
      ? renderNodes({
        loading: state.nodesLoading,
        nodes: state.nodes,
        devicesLoading: state.devicesLoading,
        devicesError: state.devicesError,
        devicesList: state.devicesList,
        configForm: state.configForm ?? (state.configSnapshot?.config as Record<string, unknown> | null),
        configLoading: state.configLoading,
        configSaving: state.configSaving,
        configDirty: state.configFormDirty,
        configFormMode: state.configFormMode,
        execApprovalsLoading: state.execApprovalsLoading,
        execApprovalsSaving: state.execApprovalsSaving,
        execApprovalsDirty: state.execApprovalsDirty,
        execApprovalsSnapshot: state.execApprovalsSnapshot,
        execApprovalsForm: state.execApprovalsForm,
        execApprovalsSelectedAgent: state.execApprovalsSelectedAgent,
        execApprovalsTarget: state.execApprovalsTarget,
        execApprovalsTargetNodeId: state.execApprovalsTargetNodeId,
        onRefresh: () => loadNodes(state),
        onDevicesRefresh: () => loadDevices(state),
        onDeviceApprove: (id) => state.handleExecApprovalDecision("allow-once"),
        onDeviceReject: (id) => state.handleExecApprovalDecision("deny"),
        onDeviceRotate: (id, role, scopes) => { /* rotate */ },
        onDeviceRevoke: (id, role) => { /* revoke */ },
        onLoadConfig: () => loadConfig(state),
        onLoadExecApprovals: () => {
          const target = state.execApprovalsTarget === "node" ? { kind: "node" as const, nodeId: state.execApprovalsTargetNodeId! } : { kind: "gateway" as const };
          return loadExecApprovals(state, target);
        },
        onBindDefault: (nodeId) => updateConfigFormValue(state, ["tools", "exec", "node"], nodeId),
        onBindAgent: (idx, nodeId) => updateConfigFormValue(state, ["agents", "list", idx, "tools", "exec", "node"], nodeId),
        onSaveBindings: () => saveConfig(state),
        onExecApprovalsTargetChange: (k, n) => { state.execApprovalsTarget = k; state.execApprovalsTargetNodeId = n; },
        onExecApprovalsSelectAgent: (id) => { state.execApprovalsSelectedAgent = id; },
        onExecApprovalsPatch: (p, v) => updateExecApprovalsFormValue(state, p, v),
        onExecApprovalsRemove: (p) => { /* remove */ },
        onSaveExecApprovals: () => {
          const target = state.execApprovalsTarget === "node" ? { kind: "node" as const, nodeId: state.execApprovalsTargetNodeId! } : { kind: "gateway" as const };
          return saveExecApprovals(state, target);
        },
      })
      : nothing}

        ${state.tab === "chat"
      ? renderChat({
        zenMode: isZen,
        app: state,
        sessionKey: state.sessionKey,
        onSessionKeyChange: (next) => {
          state.sessionKey = next;
          state.applySettings({ ...state.settings, sessionKey: next, lastActiveSessionKey: next });
          void loadChatHistory(state);
          void state.loadAssistantIdentity();
        },
        thinkingLevel: state.chatThinkingLevel,
        showThinking: state.settings.chatShowThinking,
        loading: state.chatLoading,
        sending: state.chatSending,
        compactionStatus: state.compactionStatus,
        assistantAvatarUrl: state.chatAvatarUrl,
        messages: state.chatMessages,
        toolMessages: state.chatToolMessages,
        stream: state.chatStream,
        streamStartedAt: state.chatStreamStartedAt,
        draft: state.chatMessage,
        chatAttachments: state.chatAttachments,
        queue: state.chatQueue,
        connected: state.connected,
        onAttachmentsChange: (files) => (state.chatAttachments = files),
        canSend: state.connected,
        disabledReason: state.connected ? null : "Offline",
        error: state.lastError,
        sessions: state.sessionsResult,
        focusMode: state.settings.chatFocusMode,
        onRefresh: () => Promise.all([loadChatHistory(state), state.loadAssistantIdentity()]),
        onToggleFocusMode: () => state.applySettings({ ...state.settings, chatFocusMode: !state.settings.chatFocusMode }),
        onChatScroll: (e) => state.handleChatScroll(e),
        onDraftChange: (n) => (state.chatMessage = n),
        onSend: (msg?: string) => state.handleSendChat(msg),
        canAbort: !!state.chatRunId,
        onAbort: () => state.handleAbortChat(),
        onQueueRemove: (id) => state.removeQueuedMessage(id),
        onNewSession: () => state.handleSendChat("/new"),
        sidebarOpen: state.sidebarOpen,
        sidebarContent: state.sidebarContent,
        sidebarError: state.sidebarError,
        splitRatio: state.splitRatio,
        onOpenSidebar: (c) => state.handleOpenSidebar(c),
        onCloseSidebar: () => state.handleCloseSidebar(),
        onSplitRatioChange: (r) => state.handleSplitRatioChange(r),
        assistantName: state.assistantName,
        assistantAvatar: state.assistantAvatar,
        chatRecording: state.chatRecording,
        chatRecordingStartTime: state.chatRecordingStartTime,
        onToggleRecording: () => state.handleToggleRecording(),
        onCancelRecording: () => state.handleCancelRecording(),

        models: state.models,
        modelsLoading: state.modelsLoading,
        selectedModel: state.chatModel || state.sessionsResult?.sessions.find(s => s.key === state.sessionKey)?.model,
        configuredProviders: Object.keys((state.configSnapshot?.config as any)?.models?.providers || {}).filter(k => {
          const p = (state.configSnapshot?.config as any)?.models?.providers?.[k];
          return p && (p.apiKey || p.auth || p.profile);
        }),
        usage: state.missionControlSummary,
        onModelChange: async (model) => {
          state.chatModel = model;
          // Force update to show optimistic change
          (state as unknown as import("./app").ZEROApp).requestUpdate();
          await patchSession(state, state.sessionKey, { model });
        },
      })
      : nothing}

        ${state.tab === "config"
      ? renderConfig({
        raw: state.configRaw,
        originalRaw: state.configRawOriginal,
        valid: state.configValid,
        issues: state.configIssues,
        loading: state.configLoading,
        saving: state.configSaving,
        connected: state.connected,
        schema: state.configSchema,
        schemaLoading: state.configSchemaLoading,
        uiHints: state.configUiHints,
        formMode: state.configFormMode,
        formValue: state.configForm,
        originalValue: state.configFormOriginal,
        searchQuery: state.configSearchQuery,
        activeSection: state.configActiveSection,
        activeSubsection: state.configActiveSubsection,
        theme: state.theme,
        language: getLanguage(),
        onRawChange: (next: string) => (state.configRaw = next),
        onFormModeChange: (next: "form" | "raw") => (state.configFormMode = next),
        onFormPatch: (path: any, value: any) => updateConfigFormValue(state, path as any, value),
        onSearchChange: (next: string) => (state.configSearchQuery = next),
        onSectionChange: (next: string | null) => (state.configActiveSection = next),
        onSubsectionChange: (next: string | null) => (state.configActiveSubsection = next),
        onReload: () => loadConfig(state),
        onSave: () => saveConfig(state),
        onApply: () => state.handleConfigApply(),
        onUpdate: () => state.handleRunUpdate(),
        updateStatus: state.updateStatus,
        updateStatusLoading: state.updateStatusLoading,
        updateStatusError: state.updateStatusError,
        onRefreshUpdateStatus: (opts: any) => state.handleLoadUpdateStatus(opts),
        onRunSoftwareUpdate: () => state.handleRunSoftwareUpdate(),
        onThemeChange: (next: ThemeMode) => state.setTheme(next),
        onLanguageChange: (next: any) => setLanguage(next as Language),
        onStartTour: () => state.handleStartTour(),
      } as any)
      : nothing
    }

        ${state.tab === "debug"
      ? renderDebug({
        loading: state.debugLoading,
        status: state.debugStatus,
        health: state.debugHealth,
        models: state.debugModels,
        heartbeat: state.debugHeartbeat,
        eventLog: state.eventLog,
        callMethod: state.debugCallMethod,
        callParams: state.debugCallParams,
        callResult: state.debugCallResult,
        callError: state.debugCallError,
        onCallMethodChange: (n) => (state.debugCallMethod = n),
        onCallParamsChange: (n) => (state.debugCallParams = n),
        onRefresh: () => loadDebug(state),
        onCall: () => callDebugMethod(state),
      })
      : nothing
    }

        ${state.tab === "logs"
      ? renderLogs({
        loading: state.logsLoading,
        error: state.logsError,
        file: state.logsFile,
        entries: state.logsEntries,
        filterText: state.logsFilterText,
        levelFilters: state.logsLevelFilters,
        autoFollow: state.logsAutoFollow,
        truncated: state.logsTruncated,
        onFilterTextChange: (n) => (state.logsFilterText = n),
        onLevelToggle: (l, e) => { state.logsLevelFilters = { ...state.logsLevelFilters, [l]: e }; },
        onToggleAutoFollow: (n) => (state.logsAutoFollow = n),
        onRefresh: () => loadLogs(state, { reset: true }),
        onExport: (l, b) => state.exportLogs(l, b),
        onScroll: (e) => state.handleLogsScroll(e),
      })
      : nothing
    }

        ${state.tab === "graph"
      ? renderGraph({
        loading: state.graphLoading,
        data: state.graphData,
        error: state.graphError,
        mode: state.graphMode,
        thinkingNodeIds: state.chatStreamStartedAt ? [state.sessionKey] : [],
        onRefresh: () => state.handleLoadGraph(),
        onModeChange: (m) => { state.graphMode = m; state.handleLoadGraph(); },
      })
      : nothing
    }
    
    ${state.tab === "docs"
      ? renderDocs({
        state,
        onSelect: (id) => void loadDocContent(state, id),
        onRefresh: () => void loadDocsList(state),
      })
      : nothing
    }

      ${state.tab === "playground"
      ? renderPlayground({
        systemPrompt: state.playgroundSystemPrompt,
        userPrompt: state.playgroundUserPrompt,
        output: state.playgroundOutput,
        model: state.playgroundModel,
        temperature: state.playgroundTemperature,
        maxTokens: state.playgroundMaxTokens,
        loading: state.playgroundLoading,
        onSystemPromptChange: (n) => state.handlePlaygroundUpdate({ systemPrompt: n }),
        onUserPromptChange: (n) => state.handlePlaygroundUpdate({ userPrompt: n }),
        onModelChange: (n) => state.handlePlaygroundUpdate({ model: n }),
        onTemperatureChange: (n) => state.handlePlaygroundUpdate({ temperature: n }),
        onMaxTokensChange: (n) => state.handlePlaygroundUpdate({ maxTokens: n }),
        onRun: () => state.handlePlaygroundRun(),
        onClear: () => state.handlePlaygroundUpdate({ userPrompt: "", output: "" }),
      })
      : nothing
    }

      ${!["overview", "chat", "channels", "skills", "cron", "logs", "config", "debug", "nodes", "graph", "sessions", "instances", "playground", "mission-control", "docs"].includes(state.tab)
      ? renderNotFound((route) => state.setTab(route as any))
      : nothing
    }
</main>

      ${renderExecApprovalPrompt(state)}

      ${state.tourActive ? renderGuidedTour({
      step: state.tourStep,
      totalSteps: TOUR_STEPS.length,
      currentStep: TOUR_STEPS[state.tourStep],
      onNext: () => {
        const nextStep = TOUR_STEPS[state.tourStep + 1];
        if (nextStep?.targetTab) state.setTab(nextStep.targetTab as any);
        state.handleTourNext();
      },
      onPrev: () => {
        const prevStep = TOUR_STEPS[state.tourStep - 1];
        if (prevStep?.targetTab) state.setTab(prevStep.targetTab as any);
        state.handleTourPrev();
      },
      onFinish: () => state.handleTourFinish(),
      onSkip: () => state.handleTourSkip()
    }) : nothing}
</div>
  `;
}
