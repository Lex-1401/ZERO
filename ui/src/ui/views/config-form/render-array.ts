import { html, nothing, type TemplateResult } from "lit";
import { hintForPath, humanize, defaultValue } from "../config-form.shared";
import { t } from "../../i18n";
import { icons } from "./common";
import type { RenderParams } from "./common";

export function renderArray(
  params: RenderParams & { renderNode: (p: any) => TemplateResult | typeof nothing },
): TemplateResult {
  const { schema, value, path, hints, unsupported, disabled, onPatch, renderNode } = params;
  const showLabel = params.showLabel ?? true;
  const hint = hintForPath(path, hints);
  const propKey = String(path.at(-1));
  const label = hint?.label ?? schema.title ?? humanize(propKey);

  const helpKey = `config.description.${propKey}`;
  const helpTranslation = t(helpKey as any);
  const help = hint?.help ?? (helpTranslation !== helpKey ? helpTranslation : schema.description);

  const itemsSchema = Array.isArray(schema.items) ? schema.items[0] : schema.items;
  if (!itemsSchema) {
    return html`
      <div class="cfg-field cfg-field--error">
        <div class="cfg-field__label">${label}</div>
        <div class="cfg-field__error">${t("config.node.array.unsupported" as any)}</div>
      </div>
    `;
  }

  const arr = Array.isArray(value) ? value : Array.isArray(schema.default) ? schema.default : [];

  return html`
    <div class="cfg-array">
      <div class="cfg-array__header">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${showLabel ? html`<span class="cfg-array__label">${label}</span>` : nothing}
          <span class="cfg-array__count">${t("config.node.array.count" as any)
            .replace("{count}", String(arr.length))
            .replace("{suffix}", arr.length !== 1 ? "s" : "")}</span>
        </div>
        <button
          type="button"
          class="cfg-array__add"
          ?disabled=${disabled}
          @click=${() => {
            const next = [...arr, defaultValue(itemsSchema)];
            onPatch(path, next);
          }}
        >
          <span class="cfg-array__add-icon">${icons.plus}</span>
          ${t("config.node.array.add" as any)}
        </button>
      </div>
      ${help ? html`<div class="cfg-array__help">${help}</div>` : nothing}

      ${
        arr.length === 0
          ? html`
        <div class="cfg-array__empty">
          ${t("config.node.array.empty" as any)}
        </div>
      `
          : html`
        <div class="cfg-array__items">
          ${arr.map(
            (item, idx) => html`
            <div class="cfg-array__item">
              <div class="cfg-array__item-header">
                <span class="cfg-array__item-index">#${idx + 1}</span>
                <button
                  type="button"
                  class="cfg-array__item-remove"
                  title="${t("config.node.array.remove" as any)}"
                  ?disabled=${disabled}
                  @click=${() => {
                    const next = [...arr];
                    next.splice(idx, 1);
                    onPatch(path, next);
                  }}
                >
                  ${icons.trash}
                </button>
              </div>
              <div class="cfg-array__item-content">
                ${renderNode({
                  schema: itemsSchema,
                  value: item,
                  path: [...path, idx],
                  hints,
                  unsupported,
                  disabled,
                  showLabel: false,
                  onPatch,
                })}
              </div>
            </div>
          `,
          )}
        </div>
      `
      }
    </div>
  `;
}
