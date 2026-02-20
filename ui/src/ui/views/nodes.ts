import { html, nothing } from "lit";
import { t } from "../i18n";

import { clampText, formatAgo, formatList } from "../format";
import type {
  ExecApprovalsAllowlistEntry,
  ExecApprovalsFile,
  ExecApprovalsSnapshot,
} from "../controllers/exec-approvals";
import type {
  DevicePairingList,
  DeviceTokenSummary,
  PairedDevice,
  PendingDevice,
} from "../controllers/devices";
import { icons } from "../icons";

export type NodesProps = {
  loading: boolean;
  nodes: Array<Record<string, unknown>>;
  devicesLoading: boolean;
  devicesError: string | null;
  devicesList: DevicePairingList | null;
  configForm: Record<string, unknown> | null;
  configLoading: boolean;
  configSaving: boolean;
  configDirty: boolean;
  configFormMode: "form" | "raw";
  execApprovalsLoading: boolean;
  execApprovalsSaving: boolean;
  execApprovalsDirty: boolean;
  execApprovalsSnapshot: ExecApprovalsSnapshot | null;
  execApprovalsForm: ExecApprovalsFile | null;
  execApprovalsSelectedAgent: string | null;
  execApprovalsTarget: "gateway" | "node";
  execApprovalsTargetNodeId: string | null;
  onRefresh: () => void;
  onDevicesRefresh: () => void;
  onDeviceApprove: (requestId: string) => void;
  onDeviceReject: (requestId: string) => void;
  onDeviceRotate: (deviceId: string, role: string, scopes?: string[]) => void;
  onDeviceRevoke: (deviceId: string, role: string) => void;
  onLoadConfig: () => void;
  onLoadExecApprovals: () => void;
  onBindDefault: (nodeId: string | null) => void;
  onBindAgent: (agentIndex: number, nodeId: string | null) => void;
  onSaveBindings: () => void;
  onExecApprovalsTargetChange: (kind: "gateway" | "node", nodeId: string | null) => void;
  onExecApprovalsSelectAgent: (agentId: string) => void;
  onExecApprovalsPatch: (path: Array<string | number>, value: unknown) => void;
  onExecApprovalsRemove: (path: Array<string | number>) => void;
  onSaveExecApprovals: () => void;
};

type BindingAgent = {
  id: string;
  name?: string;
  index: number;
  isDefault: boolean;
  binding?: string | null;
};

type BindingNode = {
  id: string;
  label: string;
};

type BindingState = {
  ready: boolean;
  disabled: boolean;
  configDirty: boolean;
  configLoading: boolean;
  configSaving: boolean;
  defaultBinding?: string | null;
  agents: BindingAgent[];
  nodes: BindingNode[];
  onBindDefault: (nodeId: string | null) => void;
  onBindAgent: (agentIndex: number, nodeId: string | null) => void;
  onSave: () => void;
  onLoadConfig: () => void;
  formMode: "form" | "raw";
};

type ExecSecurity = "deny" | "allowlist" | "full";
type ExecAsk = "off" | "on-miss" | "always";

type ExecApprovalsResolvedDefaults = {
  security: ExecSecurity;
  ask: ExecAsk;
  askFallback: ExecSecurity;
  autoAllowSkills: boolean;
};

type ExecApprovalsAgentOption = {
  id: string;
  name?: string;
  isDefault?: boolean;
};

type ExecApprovalsTargetNode = {
  id: string;
  label: string;
};

type ExecApprovalsState = {
  ready: boolean;
  disabled: boolean;
  dirty: boolean;
  loading: boolean;
  saving: boolean;
  form: ExecApprovalsFile | null;
  defaults: ExecApprovalsResolvedDefaults;
  selectedScope: string;
  selectedAgent: Record<string, unknown> | null;
  agents: ExecApprovalsAgentOption[];
  allowlist: ExecApprovalsAllowlistEntry[];
  target: "gateway" | "node";
  targetNodeId: string | null;
  targetNodes: ExecApprovalsTargetNode[];
  onSelectScope: (agentId: string) => void;
  onSelectTarget: (kind: "gateway" | "node", nodeId: string | null) => void;
  onPatch: (path: Array<string | number>, value: unknown) => void;
  onRemove: (path: Array<string | number>) => void;
  onLoad: () => void;
  onSave: () => void;
};

const EXEC_APPROVALS_DEFAULT_SCOPE = "__defaults__";

const SECURITY_OPTIONS: Array<{ value: ExecSecurity; label: string }> = [
  { value: "deny", label: t("skills.status.blocked" as any) },
  { value: "allowlist", label: t("skills.marketplace.title" as any) },
  { value: "full", label: t("nexus.status.sovereign" as any) },
];

const ASK_OPTIONS: Array<{ value: ExecAsk; label: string }> = [
  { value: "off", label: t("skills.status.ready" as any) },
  { value: "on-miss", label: t("skills.eligible" as any) },
  { value: "always", label: t("onboarding.tour.welcome.title" as any) },
];

function resolveExecNodes(nodes: Array<Record<string, unknown>>): BindingNode[] {
  return nodes
    .filter((n) => n.id && typeof n.id === "string")
    .map((n) => ({
      id: n.id as string,
      label: (n.host as string) || (n.id as string),
    }));
}

function resolveAgentBindings(config: Record<string, unknown> | null): {
  defaultBinding: string | null;
  agents: BindingAgent[];
} {
  if (!config) return { defaultBinding: null, agents: [] };
  const tools = config.tools as Record<string, unknown> | undefined;
  const exec = tools?.exec as Record<string, unknown> | undefined;
  const defaultBinding = typeof exec?.node === "string" ? exec.node : null;
  const agentsObj = config.agents as Record<string, unknown> | undefined;
  const list = Array.isArray(agentsObj?.list) ? agentsObj.list : [];
  const agents: BindingAgent[] = list.map((entry, index) => {
    const record = entry as Record<string, unknown>;
    const id = record.id as string;
    const name = record.name as string | undefined;
    const isDefault = record.default === true;
    const aTools = record.tools as Record<string, unknown> | undefined;
    const aExec = aTools?.exec as Record<string, unknown> | undefined;
    const binding = typeof aExec?.node === "string" ? aExec.node : null;
    return { id, name, index, isDefault, binding };
  });
  return { defaultBinding, agents };
}

function resolveBindingsState(props: NodesProps): BindingState {
  const config = props.configForm;
  const nodes = resolveExecNodes(props.nodes);
  const { defaultBinding, agents } = resolveAgentBindings(config);
  const ready = Boolean(config);
  const disabled = props.configSaving || props.configFormMode === "raw";
  return {
    ready,
    disabled,
    configDirty: props.configDirty,
    configLoading: props.configLoading,
    configSaving: props.configSaving,
    defaultBinding,
    agents,
    nodes,
    onBindDefault: props.onBindDefault,
    onBindAgent: props.onBindAgent,
    onSave: props.onSaveBindings,
    onLoadConfig: props.onLoadConfig,
    formMode: props.configFormMode,
  };
}

function normalizeSecurity(value?: string): ExecSecurity {
  if (value === "allowlist" || value === "full" || value === "deny") return value;
  return "deny";
}

function normalizeAsk(value?: string): ExecAsk {
  if (value === "always" || value === "off" || value === "on-miss") return value;
  return "on-miss";
}

function resolveExecApprovalsNodes(nodes: Array<Record<string, unknown>>): ExecApprovalsTargetNode[] {
  return nodes
    .filter((n) => {
      const services = Array.isArray(n.services) ? n.services : [];
      return services.includes("exec.approval");
    })
    .map((n) => ({
      id: n.id as string,
      label: (n.host as string) || (n.id as string),
    }));
}

function resolveExecApprovalsDefaults(
  form: ExecApprovalsFile | null,
): ExecApprovalsResolvedDefaults {
  const defaults = form?.defaults ?? {};
  return {
    security: normalizeSecurity(defaults.security),
    ask: normalizeAsk(defaults.ask),
    askFallback: normalizeSecurity(defaults.askFallback ?? "deny"),
    autoAllowSkills: Boolean(defaults.autoAllowSkills ?? false),
  };
}

function resolveExecApprovalsAgents(
  config: Record<string, unknown> | null,
  form: ExecApprovalsFile | null,
): ExecApprovalsAgentOption[] {
  const agentsNode = (config?.agents ?? {}) as Record<string, unknown>;
  const list = Array.isArray(agentsNode.list) ? agentsNode.list : [];
  const configAgents: ExecApprovalsAgentOption[] = list.map((record: any) => ({
    id: record.id,
    name: record.name,
    isDefault: record.default === true
  }));
  const approvalsAgents = Object.keys(form?.agents ?? {});
  const merged = new Map<string, ExecApprovalsAgentOption>();
  configAgents.forEach((agent) => merged.set(agent.id, agent));
  approvalsAgents.forEach((id) => {
    if (merged.has(id)) return;
    merged.set(id, { id });
  });
  const agents = Array.from(merged.values());
  if (agents.length === 0) agents.push({ id: "main", isDefault: true });
  agents.sort((a, b) => (a.isDefault ? -1 : 1));
  return agents;
}

function resolveExecApprovalsState(props: NodesProps): ExecApprovalsState {
  const form = props.execApprovalsForm ?? props.execApprovalsSnapshot?.file ?? null;
  const ready = Boolean(form);
  const defaults = resolveExecApprovalsDefaults(form);
  const agents = resolveExecApprovalsAgents(props.configForm, form);
  const targetNodes = resolveExecApprovalsNodes(props.nodes);
  const target = props.execApprovalsTarget;
  const targetNodeId = props.execApprovalsTargetNodeId;
  const selectedScope = props.execApprovalsSelectedAgent || EXEC_APPROVALS_DEFAULT_SCOPE;
  const selectedAgent = selectedScope !== EXEC_APPROVALS_DEFAULT_SCOPE ? (form?.agents ?? {})[selectedScope] ?? null : null;
  const allowlist = Array.isArray(selectedAgent?.allowlist) ? selectedAgent.allowlist : [];

  return {
    ready,
    disabled: props.execApprovalsSaving || props.execApprovalsLoading,
    dirty: props.execApprovalsDirty,
    loading: props.execApprovalsLoading,
    saving: props.execApprovalsSaving,
    form,
    defaults,
    selectedScope,
    selectedAgent,
    agents,
    allowlist,
    target,
    targetNodeId,
    targetNodes,
    onSelectScope: props.onExecApprovalsSelectAgent,
    onSelectTarget: props.onExecApprovalsTargetChange,
    onPatch: props.onExecApprovalsPatch,
    onRemove: props.onExecApprovalsRemove,
    onLoad: props.onLoadExecApprovals,
    onSave: props.onSaveExecApprovals,
  };
}

export function renderNodes(props: NodesProps) {
  const bindingState = resolveBindingsState(props);
  const approvalsState = resolveExecApprovalsState(props);

  return html`
    <div class="animate-fade-in">
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start;">
            
            <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
                    <div class="section-title" style="margin: 0;">${t("nodes.title" as any)}</div>
                    <button class="btn btn--sm" ?disabled=${props.loading} @click=${props.onRefresh}>
                        ${icons.rotateCcw} ${t("nodes.refresh" as any)}
                    </button>
                </div>
                <div class="group-list">
                    ${props.nodes.length === 0 ? html`
                        <div class="group-item" style="padding: 40px; justify-content: center; color: var(--text-dim);">${t("nodes.none" as any)}</div>
                    ` : props.nodes.map(n => renderNode(n))}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; margin-top: 40px;">
                    <div class="section-title" style="margin: 0;">${t("nodes.bindings.title" as any)}</div>
                    <button class="btn primary btn--sm" ?disabled=${bindingState.disabled || !bindingState.configDirty} @click=${bindingState.onSave}>
                        ${bindingState.configSaving ? t("nodes.bindings.saving" as any) : t("nodes.bindings.save" as any)}
                    </button>
                </div>
                <div class="group-list">
                    <div class="group-item">
                        <div class="group-label">
                            <div class="group-title">${t("nodes.binding.global" as any)}</div>
                            <div class="group-desc">${t("nodes.binding.global.desc" as any)}</div>
                        </div>
                        <div class="group-content">
                            <select class="select-native" style="width: 240px;" @change=${(e: any) => bindingState.onBindDefault(e.target.value || null)}>
                                <option value="" .selected=${!bindingState.defaultBinding}>${t("nodes.binding.any" as any)}</option>
                                ${bindingState.nodes.map(n => html`<option value=${n.id} .selected=${bindingState.defaultBinding === n.id}>${n.label}</option>`)}
                            </select>
                        </div>
                    </div>
                    ${bindingState.agents.map(a => html`
                        <div class="group-item">
                            <div class="group-label">
                                <div class="group-title">${a.name || a.id}</div>
                                <div class="group-desc">${t("nexus.node_id" as any)}: ${a.id}</div>
                            </div>
                            <div class="group-content">
                                <select class="select-native" style="width: 240px;" @change=${(e: any) => bindingState.onBindAgent(a.index, e.target.value || null)}>
                                    <option value="" .selected=${!a.binding}>${t("nodes.binding.inherit" as any)}</option>
                                    ${bindingState.nodes.map(n => html`<option value=${n.id} .selected=${a.binding === n.id}>${n.label}</option>`)}
                                </select>
                            </div>
                        </div>
                    `)}
                </div>
            </div>

            <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
                    <div class="section-title" style="margin: 0;">${t("nodes.security.title" as any)}</div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn--sm" @click=${approvalsState.onLoad}>${t("nodes.security.sync" as any)}</button>
                        <button class="btn primary btn--sm" ?disabled=${!approvalsState.dirty} @click=${approvalsState.onSave}>${t("nodes.security.save" as any)}</button>
                    </div>
                </div>
                <div class="group-list">
                     <div class="group-item">
                        <div class="group-label"><div class="group-title">${t("nodes.security.target" as any)}</div></div>
                        <div class="group-content" style="gap: 8px;">
                            <select class="select-native" style="width: 120px;" .value=${approvalsState.target} @change=${(e: any) => approvalsState.onSelectTarget(e.target.value, approvalsState.targetNodeId)}>
                                <option value="gateway">${t("nodes.security.target.gateway" as any)}</option>
                                <option value="node">${t("nodes.security.target.local" as any)}</option>
                            </select>
                            ${approvalsState.target === "node" ? html`
                                <select class="select-native" style="width: 132px;" .value=${approvalsState.targetNodeId || ""} @change=${(e: any) => approvalsState.onSelectTarget("node", e.target.value)}>
                                    <option value="">${t("nodes.security.target.select" as any)}</option>
                                    ${approvalsState.targetNodes.map(n => html`<option value=${n.id}>${n.label}</option>`)}
                                </select>
                            ` : nothing}
                        </div>
                    </div>
                </div>

                <div class="section-title">${t("nodes.security.scope" as any)}</div>
                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 16px;">
                    <button class="btn btn--sm ${approvalsState.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE ? "primary" : ""}" @click=${() => approvalsState.onSelectScope(EXEC_APPROVALS_DEFAULT_SCOPE)}>${t("nodes.security.global" as any)}</button>
                    ${approvalsState.agents.map(a => html`
                        <button class="btn btn--sm ${approvalsState.selectedScope === a.id ? "primary" : ""}" @click=${() => approvalsState.onSelectScope(a.id)}>${a.name || a.id}</button>
                    `)}
                </div>

                <div class="group-list">
                    <div class="group-item">
                        <div class="group-label"><div class="group-title">${t("nodes.security.level" as any)}</div></div>
                        <div class="group-content">
                            <select class="select-native" style="width: 240px;" .value=${approvalsState.defaults.security} @change=${(e: any) => approvalsState.onPatch([approvalsState.selectedScope === EXEC_APPROVALS_DEFAULT_SCOPE ? "defaults" : "agents", approvalsState.selectedScope, "security"], e.target.value)}>
                                ${SECURITY_OPTIONS.map(o => html`<option value=${o.value}>${o.label}</option>`)}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="section-title">${t("nodes.hardware.title" as any)}</div>
                <div class="group-list">
                    ${(props.devicesList?.pending || []).length === 0 && (props.devicesList?.paired || []).length === 0 ? html`
                         <div class="group-item" style="padding: 40px; justify-content: center; color: var(--text-dim);">${t("nodes.hardware.none" as any)}</div>
                    ` : nothing}
                    ${(props.devicesList?.pending || []).map(req => html`
                        <div class="group-item">
                            <div class="group-label">
                                <div class="group-title">${req.displayName || req.deviceId}</div>
                                <div class="group-desc">${t("nodes.hardware.pending" as any)} • ${req.remoteIp || "Local"}</div>
                            </div>
                            <div class="group-content">
                                <button class="btn btn--sm primary" @click=${() => props.onDeviceApprove(req.requestId)}>${t("nodes.hardware.approve" as any)}</button>
                                <button class="btn btn--sm danger" @click=${() => props.onDeviceReject(req.requestId)}>${t("nodes.hardware.reject" as any)}</button>
                            </div>
                        </div>
                    `)}
                    ${(props.devicesList?.paired || []).map(dev => html`
                        <div class="group-item">
                            <div class="group-label">
                                <div class="group-title">${dev.displayName || dev.deviceId}</div>
                                <div class="group-desc">${t("nodes.hardware.paired" as any)} • ${(dev as any).platform || t("nodes.hardware.native" as any)}</div>
                            </div>
                            <div class="group-content">
                                <button class="btn btn--sm danger" @click=${() => props.onDeviceRevoke(dev.deviceId, (dev as any).roles?.[0] || "user")}>${t("nodes.hardware.revoke" as any)}</button>
                            </div>
                        </div>
                    `)}
                </div>
            </div>

        </div>

    </div>
  `;
}

function renderNode(node: Record<string, unknown>) {
  const host = (node.host as string) || (node.id as string);
  const status = node.status as string;
  const services = Array.isArray(node.services) ? node.services : [];
  return html`
    <div class="group-item">
      <div class="group-label">
        <div class="group-title" style="display: flex; align-items: center; gap: 8px;">
            <div class="status-orb ${status === "online" ? "success" : "danger"}"></div>
            ${host}
        </div>
        <div class="group-desc">${t("common.id" as any)}: ${node.id}</div>
        <div style="display: flex; gap: 4px; margin-top: 6px;">
            ${services.map(s => html`<span class="badge">${s}</span>`)}
        </div>
      </div>
      <div class="group-content" style="flex-direction: column; align-items: flex-end; gap: 4px;">
        <div class="badge active">${t("common.status" as any)}: ${status}</div>
        <div style="font-size: 11px; color: var(--text-dim);">${t("common.platform" as any)}: ${node.kind}</div>
      </div>
    </div>
  `;
}
