import { html, nothing, type TemplateResult } from "lit";
import { hintForPath, humanize } from "../config-form.shared";
import { t } from "../../i18n";
import { icons } from "./common";
import type { RenderParams } from "./common";
import { renderMapField } from "./render-map";

export function renderObject(
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

  const fallback = value ?? schema.default;
  const obj =
    fallback && typeof fallback === "object" && !Array.isArray(fallback)
      ? (fallback as Record<string, unknown>)
      : {};
  const props = schema.properties ?? {};
  const entries = Object.entries(props);

  // Sort by hint order
  const sorted = entries.sort((a, b) => {
    const orderA = hintForPath([...path, a[0]], hints)?.order ?? 0;
    const orderB = hintForPath([...path, b[0]], hints)?.order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return a[0].localeCompare(b[0]);
  });

  const reserved = new Set(Object.keys(props));
  const additional = schema.additionalProperties;
  const allowExtra = Boolean(additional) && typeof additional === "object";

  // For top-level, don't wrap in collapsible
  if (path.length === 1) {
    return html`
      <div class="cfg-fields">
        ${sorted.map(([propKey, node]) =>
          renderNode({
            schema: node,
            value: obj[propKey],
            path: [...path, propKey],
            hints,
            unsupported,
            disabled,
            onPatch,
          }),
        )}
        ${
          allowExtra
            ? renderMapField({
                schema: additional as any,
                value: obj,
                path,
                hints,
                unsupported,
                disabled,
                reservedKeys: reserved,
                onPatch,
                renderNode,
              })
            : nothing
        }
      </div>
    `;
  }

  // Nested objects get collapsible treatment
  return html`
    <details class="cfg-object" open>
      <summary class="cfg-object__header">
        <span class="cfg-object__title">${label}</span>
        <span class="cfg-object__chevron">${icons.chevronDown}</span>
      </summary>
      ${help ? html`<div class="cfg-object__help">${help}</div>` : nothing}
      <div class="cfg-object__content">
        ${sorted.map(([propKey, node]) =>
          renderNode({
            schema: node,
            value: obj[propKey],
            path: [...path, propKey],
            hints,
            unsupported,
            disabled,
            onPatch,
          }),
        )}
        ${
          allowExtra
            ? renderMapField({
                schema: additional as any,
                value: obj,
                path,
                hints,
                unsupported,
                disabled,
                reservedKeys: reserved,
                onPatch,
                renderNode,
              })
            : nothing
        }
      </div>
    </details>
  `;
}
