import {
  CombinedAutocompleteProvider,
  Container,
  ProcessTerminal,
  Text,
  TUI,
} from "@mariozechner/pi-tui";
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import { loadConfig } from "../config/config.js";
import {
  buildAgentMainSessionKey,
  normalizeMainKey,
  parseAgentSessionKey,
} from "../routing/session-key.js";
import { getSlashCommands } from "./commands.js";
import { ChatLog } from "./components/chat-log.js";
import { CustomEditor } from "./components/custom-editor.js";
import { GatewayChatClient } from "./gateway-chat.js";
import { editorTheme, theme } from "./theme/theme.js";
import { createCommandHandlers } from "./tui-command-handlers.js";
import { createEventHandlers } from "./tui-event-handlers.js";
import { formatTokens } from "./tui-formatters.js";
import { createLocalShellRunner } from "./tui-local-shell.js";
import { createOverlayHandlers } from "./tui-overlays.js";
import { createSessionActions } from "./tui-session-actions.js";
import type {
  SessionScope,
  TuiOptions,
  TuiStateAccess,
} from "./tui-types.js";
import { TuiStatusManager } from "./core/status-manager.js";
import { TuiEditorController } from "./core/editor-controller.js";

export { resolveFinalAssistantText } from "./tui-formatters.js";
export type { TuiOptions } from "./tui-types.js";

export function createEditorSubmitHandler(params: {
  editor: { setText: (v: string) => void; addToHistory: (v: string) => void };
  handleCommand: (v: string) => Promise<void> | void;
  sendMessage: (v: string) => Promise<void> | void;
  handleBangLine: (v: string) => Promise<void> | void;
}) {
  return (text: string) => {
    const raw = text;
    const value = raw.trim();
    params.editor.setText("");
    if (!value) return;
    if (raw.startsWith("!") && raw !== "!") {
      params.editor.addToHistory(raw);
      void params.handleBangLine(raw);
      return;
    }
    params.editor.addToHistory(value);
    if (value.startsWith("/")) {
      void params.handleCommand(value);
      return;
    }
    void params.sendMessage(value);
  };
}

export async function runTui(opts: TuiOptions) {
  const config = loadConfig();
  const initialSessionInput = (opts.session ?? "").trim();
  const state: TuiStateAccess = {
    sessionScope: (config.session?.scope ?? "per-sender") as SessionScope,
    sessionMainKey: normalizeMainKey(config.session?.mainKey),
    agentDefaultId: resolveDefaultAgentId(config),
    currentAgentId: resolveDefaultAgentId(config),
    agents: [],
    currentSessionKey: "",
    currentSessionId: null,
    activeChatRunId: null,
    historyLoaded: false,
    sessionInfo: {},
    initialSessionApplied: false,
    isConnected: false,
    autoMessageSent: false,
    toolsExpanded: false,
    showThinking: false,
    connectionStatus: "conectando",
    activityStatus: "ocioso",
    statusTimeout: null,
    lastCtrlCAt: 0,
  };

  const agentNames = new Map<string, string>();
  const client = new GatewayChatClient({
    url: opts.url,
    token: opts.token,
    password: opts.password,
  });
  const tuiService = new TUI(new ProcessTerminal());
  const header = new Text("", 1, 0);
  const statusContainer = new Container();
  const footer = new Text("", 1, 0);
  const chatLog = new ChatLog();
  const editor = new CustomEditor(tuiService, editorTheme);
  const root = new Container();
  [header, chatLog, statusContainer, footer, editor].forEach((c) => root.addChild(c));

  const statusManager = new TuiStatusManager(tuiService, statusContainer, state);

  const updateAutocompleteProvider = () => {
    editor.setAutocompleteProvider(
      new CombinedAutocompleteProvider(
        getSlashCommands({
          cfg: config,
          provider: state.sessionInfo.modelProvider,
          model: state.sessionInfo.model,
        }),
        process.cwd(),
      ),
    );
  };

  tuiService.addChild(root);
  tuiService.setFocus(editor);

  const formatSessionKey = (key: string) => {
    if (key === "global" || key === "unknown") return key;
    const parsed = parseAgentSessionKey(key);
    return parsed?.rest ?? key;
  };

  const formatAgentLabel = (id: string) => {
    const name = agentNames.get(id);
    return name ? `${id} (${name})` : id;
  };

  const resolveSessionKey = (raw?: string) => {
    const trimmed = (raw ?? "").trim();
    if (state.sessionScope === "global") return "global";
    if (!trimmed)
      return buildAgentMainSessionKey({
        agentId: state.currentAgentId,
        mainKey: state.sessionMainKey,
      });
    if (trimmed === "global" || trimmed === "unknown") return trimmed;
    if (trimmed.startsWith("agent:")) return trimmed;
    return `agent:${state.currentAgentId}:${trimmed}`;
  };

  state.currentSessionKey = resolveSessionKey(initialSessionInput);

  const updateHeader = () => {
    header.setText(
      theme.header(
        `zero tui - ${client.connection.url} - agent ${formatAgentLabel(state.currentAgentId)} - session ${formatSessionKey(state.currentSessionKey)}`,
      ),
    );
  };

  const setConnectionStatus = (text: string, ttlMs?: number) => {
    state.connectionStatus = text;
    statusManager.renderStatus();
    if (state.statusTimeout) clearTimeout(state.statusTimeout);
    if (ttlMs && ttlMs > 0) {
      state.statusTimeout = setTimeout(() => {
        state.connectionStatus = state.isConnected ? "conectado" : "desconectado";
        statusManager.renderStatus();
      }, ttlMs);
    }
  };

  const setActivityStatus = (text: string) => {
    state.activityStatus = text;
    if (text === "ferramentas expandidas") chatLog.setToolsExpanded(true);
    if (text === "ferramentas recolhidas") chatLog.setToolsExpanded(false);
    statusManager.renderStatus();
  };

  const updateFooter = () => {
    const s = state.sessionInfo;
    const footerParts = [
      `agent ${formatAgentLabel(state.currentAgentId)}`,
      `session ${s.displayName ? `${formatSessionKey(state.currentSessionKey)} (${s.displayName})` : formatSessionKey(state.currentSessionKey)}`,
      s.model ? (s.modelProvider ? `${s.modelProvider}/${s.model}` : s.model) : "desconhecido",
      s.thinkingLevel && s.thinkingLevel !== "off" ? `pensamento ${s.thinkingLevel}` : null,
      s.verboseLevel && s.verboseLevel !== "off" ? `verboso ${s.verboseLevel}` : null,
      s.reasoningLevel === "on"
        ? "raciocínio"
        : s.reasoningLevel === "stream"
          ? "raciocínio:stream"
          : null,
      formatTokens(s.totalTokens ?? null, s.contextTokens ?? null),
    ].filter(Boolean);
    footer.setText(theme.dim(footerParts.join(" | ")));
  };

  const { openOverlay, closeOverlay } = createOverlayHandlers(tuiService, editor);
  const initialSessionAgentId = initialSessionInput
    ? (parseAgentSessionKey(initialSessionInput)?.agentId ?? null)
    : null;

  const actions = createSessionActions({
    client,
    chatLog,
    tui: tuiService,
    opts,
    state,
    agentNames,
    initialSessionInput,
    initialSessionAgentId,
    resolveSessionKey,
    updateHeader,
    updateFooter,
    updateAutocompleteProvider,
    setActivityStatus,
  });

  const commands = createCommandHandlers({
    client,
    chatLog,
    tui: tuiService,
    opts,
    state,
    deliverDefault: opts.deliver ?? false,
    openOverlay,
    closeOverlay,
    refreshSessionInfo: actions.refreshSessionInfo,
    loadHistory: actions.loadHistory,
    setSession: actions.setSession,
    refreshAgents: actions.refreshAgents,
    abortActive: actions.abortActive,
    setActivityStatus,
    formatSessionKey,
  });

  const { runLocalShellLine } = createLocalShellRunner({
    chatLog,
    tui: tuiService,
    openOverlay,
    closeOverlay,
  });

  const editorCtrl = new TuiEditorController(editor, tuiService, state, client, {
    abortActive: actions.abortActive,
    openModelSelector: commands.openModelSelector,
    openAgentSelector: commands.openAgentSelector,
    openSessionSelector: commands.openSessionSelector,
    loadHistory: actions.loadHistory,
    sendMessage: commands.sendMessage,
    setActivityStatus,
  });
  editorCtrl.setup();
  editor.onSubmit = createEditorSubmitHandler({
    editor,
    handleCommand: commands.handleCommand,
    sendMessage: commands.sendMessage,
    handleBangLine: runLocalShellLine,
  });

  client.onEvent = (evt) => {
    const handlers = createEventHandlers({
      chatLog,
      tui: tuiService,
      state,
      setActivityStatus,
      refreshSessionInfo: actions.refreshSessionInfo,
    });
    if (evt.event === "chat") handlers.handleChatEvent(evt.payload);
    if (evt.event === "agent") handlers.handleAgentEvent(evt.payload);
  };

  client.onConnected = () => {
    state.isConnected = true;
    setConnectionStatus("conectado");
    void (async () => {
      await actions.refreshAgents();
      updateHeader();
      await actions.loadHistory();
      setConnectionStatus("gateway conectado", 4000);
      if (!state.autoMessageSent && opts.message) {
        state.autoMessageSent = true;
        await commands.sendMessage(opts.message.trim());
      }
      updateFooter();
    })();
  };

  client.onDisconnected = (reason) => {
    state.isConnected = false;
    state.historyLoaded = false;
    setConnectionStatus(`gateway desconectado: ${reason?.trim() || "fechado"}`, 5000);
    setActivityStatus("ocioso");
    updateFooter();
  };

  client.onGap = (info) =>
    setConnectionStatus(
      `lacuna de eventos: esperado ${info.expected}, recebido ${info.received}`,
      5000,
    );

  updateHeader();
  updateFooter();
  tuiService.start();
  client.start();
}
