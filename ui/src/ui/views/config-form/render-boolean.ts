import { html, nothing, type TemplateResult } from "lit";
import { hintForPath, humanize } from "../config-form.shared";
import { t } from "../../i18n";
import type { RenderParams } from "./common";

export function renderBoolean(params: RenderParams): TemplateResult {
  const { schema, value, path, hints, disabled, onPatch } = params;
  const showLabel = params.showLabel ?? true;
  const hint = hintForPath(path, hints);
  const propKey = String(path.at(-1));
  const label = hint?.label ?? schema.title ?? humanize(propKey);

  const helpKey = `config.description.${propKey}`;
  const helpTranslation = t(helpKey as any);
  const help = hint?.help ?? (helpTranslation !== helpKey ? helpTranslation : schema.description);
  const isReadOnly = schema.readOnly || disabled || path[0] === "wizard";
  const displayValue =
    typeof value === "boolean"
      ? value
      : typeof schema.default === "boolean"
        ? schema.default
        : false;

  if (isReadOnly) {
    return html`
      <div class="cfg-field">
          ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
          ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
          <div class="cfg-input-wrap">
              <input type="text" class="cfg-input readonly" .value=${displayValue ? "SIM" : "NÃO"} readonly />
          </div>
      </div>
    `;
  }

  return html`
    <label class="cfg-toggle-row ${disabled ? "disabled" : ""}">
      <div class="cfg-toggle-row__content">
        <span class="cfg-toggle-row__label">${label}</span>
        ${help ? html`<span class="cfg-toggle-row__help">${help}</span>` : nothing}
      </div>
      <div class="cfg-toggle">
        <input
          type="checkbox"
          .checked=${displayValue}
          ?disabled=${disabled}
          @change=${(e: Event) => onPatch(path, (e.target as HTMLInputElement).checked)}
        />
        <span class="cfg-toggle__track"></span>
      </div>
    </label>
  `;
}
