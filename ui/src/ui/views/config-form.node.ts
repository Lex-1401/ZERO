import { html, nothing, type TemplateResult } from "lit";
import { hintForPath, humanize, pathKey, schemaType } from "./config-form.shared";
import { t } from "../i18n";

import { renderBoolean } from "./config-form/render-boolean";
import { renderNumberInput } from "./config-form/render-number";
import { renderTextInput } from "./config-form/render-text";
import { renderSelect } from "./config-form/render-select";
import { renderObject } from "./config-form/render-object";
import { renderArray } from "./config-form/render-array";
import type { RenderParams } from "./config-form/common";

export function renderNode(params: RenderParams): TemplateResult | typeof nothing {
  const { schema, value, path, hints, unsupported, disabled, onPatch } = params;
  const showLabel = params.showLabel ?? true;
  const type = schemaType(schema);
  const propKey = String(path.at(-1));

  const hint = hintForPath(path, hints);
  const labelKey = `config.field.${propKey}`;
  const translatedLabel = t(labelKey as any);
  const label =
    translatedLabel !== labelKey
      ? translatedLabel
      : (hint?.label ?? schema.title ?? humanize(propKey));

  const helpKey = `config.description.${propKey}`;
  const translatedHelp = t(helpKey as any);
  const help = translatedHelp !== helpKey ? translatedHelp : (hint?.help ?? schema.description);

  const key = pathKey(path);

  if (unsupported.has(key)) {
    return html`<div class="cfg-field cfg-field--error">
      <div class="cfg-field__label">${label}</div>
      <div class="cfg-field__error">${t("config.node.unsupported" as any)}</div>
    </div>`;
  }

  // Handle anyOf/oneOf unions
  if (schema.anyOf || schema.oneOf) {
    const variants = schema.anyOf ?? schema.oneOf ?? [];
    const nonNull = variants.filter(
      (v) => !(v.type === "null" || (Array.isArray(v.type) && v.type.includes("null"))),
    );

    if (nonNull.length === 1) {
      return renderNode({ ...params, schema: nonNull[0] });
    }

    const literals = nonNull.map((v) =>
      v.const !== undefined ? v.const : v.enum && v.enum.length === 1 ? v.enum[0] : undefined,
    );
    const allLiterals = literals.every((v) => v !== undefined);

    if (allLiterals && literals.length > 0 && literals.length <= 5) {
      const resolvedValue = value ?? schema.default;
      return html`
        <div class="cfg-field">
          ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
          ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
          <div class="cfg-segmented">
            ${literals.map(
              (lit) => html`
              <button
                type="button"
                class="cfg-segmented__btn ${lit === resolvedValue || String(lit) === String(resolvedValue) ? "active" : ""}"
                ?disabled=${disabled}
                @click=${() => onPatch(path, lit)}
              >
                ${t(`config.value.${lit}` as any) !== `config.value.${lit}` ? t(`config.value.${lit}` as any) : String(lit)}
              </button>
            `,
            )}
          </div>
        </div>
      `;
    }

    if (allLiterals && literals.length > 5) {
      return renderSelect({
        ...params,
        options: literals as unknown[],
        value: value ?? schema.default,
      });
    }
  }

  // Enum
  if (schema.enum) {
    const options = schema.enum;
    if (options.length <= 5) {
      const resolvedValue = value ?? schema.default;
      return html`
        <div class="cfg-field">
          ${showLabel ? html`<label class="cfg-field__label">${label}</label>` : nothing}
          ${help ? html`<div class="cfg-field__help">${help}</div>` : nothing}
          <div class="cfg-segmented">
            ${options.map(
              (opt) => html`
              <button
                type="button"
                class="cfg-segmented__btn ${opt === resolvedValue || String(opt) === String(resolvedValue) ? "active" : ""}"
                ?disabled=${disabled}
                @click=${() => onPatch(path, opt)}
              >
                ${t(`config.value.${opt}` as any) !== `config.value.${opt}` ? t(`config.value.${opt}` as any) : String(opt)}
              </button>
            `,
            )}
          </div>
        </div>
      `;
    }
    return renderSelect({ ...params, options, value: value ?? schema.default });
  }

  if (type === "object") return renderObject({ ...params, renderNode });
  if (type === "array") return renderArray({ ...params, renderNode });
  if (type === "boolean") return renderBoolean(params);
  if (type === "number" || type === "integer") return renderNumberInput(params);
  if (type === "string") return renderTextInput({ ...params, inputType: "text" });

  return html`
    <div class="cfg-field cfg-field--error">
      <div class="cfg-field__label">${label}</div>
      <div class="cfg-field__error">${t("config.node.type.unsupported" as any).replace("{type}", String(type))}</div>
    </div>
  `;
}
