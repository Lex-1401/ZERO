
/**
 * Markdown Intermediate Representation (IR)
 *
 * Implements a structured representation for markdown content with style spans.
 * Delegated to src/markdown/ir/ for maintainability and Atomic Modularity.
 */

import {
  type MarkdownIR,
  type MarkdownParseOptions,
  type MarkdownToken,
  type RenderEnv,
  type MarkdownLinkSpan,
  type MarkdownStyleSpan,
  type MarkdownStyle,
} from "./ir/types.js";
import { type RenderState } from "./ir/state.js";
import { createMarkdownIt, applySpoilerTokens } from "./ir/parser.js";
import { renderTokens } from "./ir/renderer.js";
import {
  mergeStyleSpans,
  clampStyleSpans,
  clampLinkSpans,
  closeRemainingStyles,
  sliceStyleSpans,
  sliceLinkSpans
} from "./ir/utils.js";
import { chunkText } from "../auto-reply/chunk.js";

export type { MarkdownIR, MarkdownParseOptions, MarkdownLinkSpan, MarkdownStyleSpan, MarkdownStyle };

export function markdownToIR(markdown: string | null, options: MarkdownParseOptions = {}): MarkdownIR {
  return markdownToIRWithMeta(markdown || "", options).ir;
}

export function markdownToIRWithMeta(
  markdown: string,
  options: MarkdownParseOptions = {},
): { ir: MarkdownIR; hasTables: boolean } {
  const env: RenderEnv = { listStack: [] };
  const md = createMarkdownIt(options);
  const tokens = md.parse(markdown ?? "", env as unknown as object);

  if (options.enableSpoilers) {
    applySpoilerTokens(tokens as MarkdownToken[]);
  }

  const tableMode = options.tableMode ?? "off";

  const state: RenderState = {
    text: "",
    styles: [],
    openStyles: [],
    links: [],
    linkStack: [],
    env,
    headingStyle: options.headingStyle ?? "none",
    blockquotePrefix: options.blockquotePrefix ?? "",
    enableSpoilers: options.enableSpoilers ?? false,
    tableMode,
    table: null,
    hasTables: false,
  };

  renderTokens(tokens as MarkdownToken[], state);
  closeRemainingStyles(state);

  const trimmedText = state.text.trimEnd();
  const trimmedLength = trimmedText.length;
  let codeBlockEnd = 0;
  for (const span of state.styles) {
    if (span.style !== "code_block") continue;
    if (span.end > codeBlockEnd) codeBlockEnd = span.end;
  }
  const finalLength = Math.max(trimmedLength, codeBlockEnd);
  const finalText = finalLength === state.text.length ? state.text : state.text.slice(0, finalLength);

  return {
    ir: {
      text: finalText,
      styles: mergeStyleSpans(clampStyleSpans(state.styles, finalLength)),
      links: clampLinkSpans(state.links, finalLength),
    },
    hasTables: state.hasTables,
  };
}

export function chunkMarkdownIR(ir: MarkdownIR, limit: number): MarkdownIR[] {
  if (!ir.text) return [];
  if (limit <= 0 || ir.text.length <= limit) return [ir];

  const chunks = chunkText(ir.text, limit);
  const results: MarkdownIR[] = [];
  let cursor = 0;

  chunks.forEach((chunk, index) => {
    if (!chunk) return;
    if (index > 0) {
      while (cursor < ir.text.length && /\s/.test(ir.text[cursor] ?? "")) {
        cursor += 1;
      }
    }
    const start = cursor;
    const end = Math.min(ir.text.length, start + chunk.length);
    results.push({
      text: chunk,
      styles: sliceStyleSpans(ir.styles, start, end),
      links: sliceLinkSpans(ir.links, start, end),
    });
    cursor = end;
  });

  return results;
}
