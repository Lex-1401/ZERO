import { html } from "lit";

import type { ConfigUiHints } from "../types";
import type { ChannelsProps } from "./channels.types";
import {
  analyzeConfigSchema,
  renderNode,
  resolveSchemaNode,
  schemaType,
  type JsonSchema,
} from "./config-form";
import { icons } from "../icons";

type ChannelConfigFormProps = {
  channelId: string;
  configValue: Record<string, unknown> | null;
  schema: unknown | null;
  uiHints: ConfigUiHints;
  disabled: boolean;
  onPatch: (path: Array<string | number>, value: unknown) => void;
};

function resolveChannelValue(
  config: Record<string, unknown>,
  channelId: string,
): Record<string, unknown> {
  const channels = (config.channels ?? {}) as Record<string, unknown>;
  const fromChannels = channels[channelId];
  const fallback = config[channelId];
  const resolved =
    (fromChannels && typeof fromChannels === "object"
      ? (fromChannels as Record<string, unknown>)
      : null) ??
    (fallback && typeof fallback === "object"
      ? (fallback as Record<string, unknown>)
      : null);
  return resolved ?? {};
}

export function renderChannelConfigForm(props: ChannelConfigFormProps) {
  const analysis = analyzeConfigSchema(props.schema);
  const normalized = analysis.schema;
  if (!normalized) {
    return html`<div class="callout info">Esquema indisponível. Use Bruto.</div>`;
  }
  const node = resolveSchemaNode(normalized, ["channels", props.channelId]);
  if (!node) {
    return html`<div class="callout info">Esquema de configuração do canal indisponível.</div>`;
  }
  const configValue = props.configValue ?? {};
  const value = resolveChannelValue(configValue, props.channelId);
  return html`
    <div class="config-form">
      ${renderNode({
    schema: node,
    value,
    path: ["channels", props.channelId],
    hints: props.uiHints,
    unsupported: new Set(analysis.unsupportedPaths),
    disabled: props.disabled,
    showLabel: false,
    onPatch: props.onPatch,
  })}
    </div>
  `;
}

export function renderChannelConfigSection(params: {
  channelId: string;
  props: ChannelsProps;
}) {
  const { channelId, props } = params;
  const disabled = props.configSaving || props.configSchemaLoading;
  return html`
    <div style="margin-top: 16px;">
      ${props.configSchemaLoading
      ? html`<div style="display: flex; align-items: center; justify-content: center; padding: 40px; color: var(--text-dim); font-size: 11px;">
          <div class="animate-spin" style="margin-right: 8px;">${icons.loader}</div> Sincronizando esquema neural...
        </div>`
      : renderChannelConfigForm({
        channelId,
        configValue: props.configForm,
        schema: props.configSchema,
        uiHints: props.configUiHints,
        disabled,
        onPatch: props.onConfigPatch,
      })}
      <div class="row" style="margin-top: 12px;">
        <button
          class="btn primary"
          ?disabled=${disabled || !props.configFormDirty}
          @click=${() => props.onConfigSave()}
        >
          ${props.configSaving ? "Salvando…" : "Salvar"}
        </button>
        <button
          class="btn"
          ?disabled=${disabled}
          @click=${() => props.onConfigReload()}
        >
          Recarregar
        </button>
      </div>
    </div>
  `;
}
