import { html, nothing, type TemplateResult } from "lit";
import { defaultValue } from "../config-form.shared";
import { t } from "../../i18n";
import { isAnySchema, jsonValue, icons } from "./common";
import type { RenderParams } from "./common";

export function renderMapField(
  params: RenderParams & {
    reservedKeys: Set<string>;
    renderNode: (p: any) => TemplateResult | typeof nothing;
  },
): TemplateResult {
  const { schema, value, path, hints, unsupported, disabled, reservedKeys, onPatch, renderNode } =
    params;
  const anySchema = isAnySchema(schema);
  const entries = Object.entries((value as Record<string, unknown>) ?? {}).filter(
    ([key]) => !reservedKeys.has(key),
  );

  return html`
    <div class="cfg-map">
      <div class="cfg-map__header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="cfg-map__label">${t("config.node.map.custom" as any)}</span>
          <span class="cfg-map__count">${t("config.node.array.count" as any)
            .replace("{count}", String(entries.length))
            .replace("{suffix}", entries.length !== 1 ? "s" : "")}</span>
        </div>
        <button
          type="button"
          class="cfg-map__add"
          ?disabled=${disabled}
          @click=${() => {
            const next = { ...((value as Record<string, unknown>) ?? {}) };
            let index = 1;
            let key = `custom-${index}`;
            while (key in next) {
              index += 1;
              key = `custom-${index}`;
            }
            next[key] = anySchema ? {} : defaultValue(schema);
            onPatch(path, next);
          }}
        >
          <span class="cfg-map__add-icon">${icons.plus}</span>
          ${t("config.node.array.add" as any)}
        </button>
      </div>

      ${
        entries.length === 0
          ? html`
        <div class="cfg-map__empty">${t("config.node.map.empty" as any)}</div>
      `
          : html`
        <div class="cfg-map__items">
          ${entries.map(([key, entryValue]) => {
            const valuePath = [...path, key];
            const fallback = jsonValue(entryValue);
            return html`
              <div class="cfg-map__item">
                <div class="cfg-map__item-key">
                  <input
                    type="text"
                    class="cfg-input cfg-input--sm"
                    placeholder="${t("config.node.map.key" as any)}"
                    .value=${key}
                    ?disabled=${disabled}
                    @change=${(e: Event) => {
                      const nextKey = (e.target as HTMLInputElement).value.trim();
                      if (!nextKey || nextKey === key) return;
                      const next = { ...((value as Record<string, unknown>) ?? {}) };
                      if (nextKey in next) return;
                      next[nextKey] = next[key];
                      delete next[key];
                      onPatch(path, next);
                    }}
                  />
                </div>
                <div class="cfg-map__item-value">
                  ${
                    anySchema
                      ? html`
                        <textarea
                          class="cfg-textarea cfg-textarea--sm"
                          placeholder="${t("config.node.map.json" as any)}"
                          rows="2"
                          .value=${fallback}
                          ?disabled=${disabled}
                          @change=${(e: Event) => {
                            const target = e.target as HTMLTextAreaElement;
                            const raw = target.value.trim();
                            if (!raw) {
                              onPatch(valuePath, undefined);
                              return;
                            }
                            try {
                              onPatch(valuePath, JSON.parse(raw));
                            } catch {
                              target.value = fallback;
                            }
                          }}
                        ></textarea>
                      `
                      : renderNode({
                          schema,
                          value: entryValue,
                          path: valuePath,
                          hints,
                          unsupported,
                          disabled,
                          showLabel: false,
                          onPatch,
                        })
                  }
                </div>
                <button
                  type="button"
                  class="cfg-map__item-remove"
                  title="${t("config.node.map.remove" as any)}"
                  ?disabled=${disabled}
                  @click=${() => {
                    const next = { ...((value as Record<string, unknown>) ?? {}) };
                    delete next[key];
                    onPatch(path, next);
                  }}
                >
                  ${icons.trash}
                </button>
              </div>
            `;
          })}
        </div>
      `
      }
    </div>
  `;
}
