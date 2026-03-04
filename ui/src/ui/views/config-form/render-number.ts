import { html, nothing, type TemplateResult } from "lit";
import { hintForPath, humanize } from "../config-form.shared";
import { t } from "../../i18n";
import type { RenderParams } from "./common";

export function renderNumberInput(params: RenderParams): TemplateResult {
  const { schema, value, path, hints, disabled, onPatch } = params;
  const showLabel = params.showLabel ?? true;
  const hint = hintForPath(path, hints);
  const propKey = String(path.at(-1));
  const label = hint?.label ?? schema.title ?? humanize(propKey);

  const helpKey = `config.description.${propKey}`;
  const helpTranslation = t(helpKey as any);
  const help = hint?.help ?? (helpTranslation !== helpKey ? helpTranslation : schema.description);
  const isReadOnly = schema.readOnly || disabled || path[0] === "wizard";
  const displayValue = value ?? schema.default;
  const numValue = typeof displayValue === "number" ? displayValue : 0;

  if (isReadOnly && (displayValue === undefined || displayValue === null)) {
    return html`
        <div class="cfg-field">
            ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
            ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
            <div class="cfg-value-none">${t("common.none" as any) || "n/d"}</div>
        </div>
      `;
  }

  return html`
    <div class="cfg-field">
      ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
      ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
      ${
        isReadOnly
          ? html`
        <div class="cfg-input-wrap">
            <input type="text" class="cfg-input readonly" .value=${String(displayValue ?? "")} readonly />
        </div>
      `
          : html`
      <div class="cfg-number">
        <button
          type="button"
          class="cfg-number__btn"
          ?disabled=${disabled}
          @click=${() => onPatch(path, numValue - 1)}
        >−</button>
        <input
          type="number"
          class="cfg-number__input"
          .value=${displayValue == null ? "" : String(displayValue)}
          @input=${(e: Event) => {
            const raw = (e.target as HTMLInputElement).value;
            const parsed = raw === "" ? undefined : Number(raw);
            onPatch(path, parsed);
          }}
        />
        <button
          type="button"
          class="cfg-number__btn"
          ?disabled=${disabled}
          @click=${() => onPatch(path, numValue + 1)}
        >+</button>
      </div>
      `
      }
    </div>
  `;
}
