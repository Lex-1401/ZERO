import { html, nothing, type TemplateResult } from "lit";
import { hintForPath, humanize } from "../config-form.shared";
import { t } from "../../i18n";
import type { RenderParams } from "./common";

export function renderSelect(params: RenderParams & { options: unknown[] }): TemplateResult {
  const { schema, value, path, hints, disabled, options, onPatch } = params;
  const showLabel = params.showLabel ?? true;
  const hint = hintForPath(path, hints);
  const propKey = String(path.at(-1));
  const label = hint?.label ?? schema.title ?? humanize(propKey);

  const helpKey = `config.description.${propKey}`;
  const helpTranslation = t(helpKey as any);
  const help = hint?.help ?? (helpTranslation !== helpKey ? helpTranslation : schema.description);
  const isReadOnly = schema.readOnly || disabled || path[0] === "wizard";
  const resolvedValue = value ?? schema.default;
  const currentIndex = options.findIndex(
    (opt) => opt === resolvedValue || String(opt) === String(resolvedValue),
  );
  const unset = "__unset__";

  if (isReadOnly) {
    return html`
        <div class="cfg-field">
            ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
            ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
            <div class="cfg-input-wrap">
                <input type="text" class="cfg-input readonly" .value=${String(resolvedValue ?? "")} readonly />
            </div>
        </div>
      `;
  }

  return html`
    <div class="cfg-field">
      ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
      ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
      <select
        class="cfg-select"
        ?disabled=${disabled}
        .value=${currentIndex >= 0 ? String(currentIndex) : unset}
        @change=${(e: Event) => {
          const val = (e.target as HTMLSelectElement).value;
          onPatch(path, val === unset ? undefined : options[Number(val)]);
        }}
      >
        <option value=${unset}>${t("config.node.select" as any)}</option>
        ${options.map(
          (opt, idx) => html`
          <option value=${String(idx)}>${t(`config.value.${opt}` as any) !== `config.value.${opt}` ? t(`config.value.${opt}` as any) : String(opt)}</option>
        `,
        )}
      </select>
    </div>
  `;
}
