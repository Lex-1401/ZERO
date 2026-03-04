import { html, nothing, type TemplateResult } from "lit";
import { hintForPath, isSensitivePath } from "../config-form.shared";
import { t } from "../../i18n";
import { humanize } from "../config-form.shared";
import type { RenderParams } from "./common";

export function renderTextInput(
  params: RenderParams & { inputType: "text" | "number" },
): TemplateResult {
  const { schema, value, path, hints, disabled, onPatch, inputType } = params;
  const showLabel = params.showLabel ?? true;
  const hint = hintForPath(path, hints);
  const propKey = String(path.at(-1));
  const label = hint?.label ?? schema.title ?? humanize(propKey);

  const helpKey = `config.description.${propKey}`;
  const helpTranslation = t(helpKey as any);
  const help = hint?.help ?? (helpTranslation !== helpKey ? helpTranslation : schema.description);
  const isSensitive = hint?.sensitive || isSensitivePath(path);
  const isReadOnly = schema.readOnly || disabled || path[0] === "wizard";
  const placeholder =
    hint?.placeholder ??
    (isSensitive
      ? "••••"
      : schema.default !== undefined
        ? t("config.node.default" as any).replace("{value}", String(schema.default))
        : "");
  const displayValue = value ?? "";
  const fallbackText = t("common.none" as any) || "n/d";

  if (
    isReadOnly &&
    !isSensitive &&
    (displayValue === "" || displayValue === null || displayValue === undefined)
  ) {
    return html`
      <div class="cfg-field">
        ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
        ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
        <div class="cfg-value-none">${fallbackText}</div>
      </div>
    `;
  }

  return html`
    <div class="cfg-field">
      ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
      ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
      <div class="cfg-input-wrap">
        <input
          type=${isSensitive ? "password" : inputType}
          class="cfg-input ${isReadOnly ? "readonly" : ""}"
          placeholder=${placeholder}
          .value=${displayValue == null ? "" : String(displayValue)}
          ?disabled=${isReadOnly}
          ?readonly=${isReadOnly}
          @input=${(e: Event) => {
            if (isReadOnly) return;
            const raw = (e.target as HTMLInputElement).value;
            if (inputType === "number") {
              if (raw.trim() === "") {
                onPatch(path, undefined);
                return;
              }
              const parsed = Number(raw);
              onPatch(path, Number.isNaN(parsed) ? raw : parsed);
              return;
            }
            onPatch(path, raw);
          }}
        />
        ${
          schema.default !== undefined && !isReadOnly
            ? html`
          <button
            type="button"
            class="cfg-input__reset"
            title="${t("config.node.reset" as any)}"
            ?disabled=${disabled}
            @click=${() => onPatch(path, schema.default)}
          >↺</button>
        `
            : nothing
        }
      </div>
    </div>
  `;
}
