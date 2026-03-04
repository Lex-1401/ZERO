
import { type MarkdownStyleSpan, type MarkdownLinkSpan } from "./types.js";
import { type RenderTarget } from "./state.js";

export function clampStyleSpans(spans: MarkdownStyleSpan[], maxLength: number): MarkdownStyleSpan[] {
    const clamped: MarkdownStyleSpan[] = [];
    for (const span of spans) {
        const start = Math.max(0, Math.min(span.start, maxLength));
        const end = Math.max(start, Math.min(span.end, maxLength));
        if (end > start) clamped.push({ start, end, style: span.style });
    }
    return clamped;
}

export function clampLinkSpans(spans: MarkdownLinkSpan[], maxLength: number): MarkdownLinkSpan[] {
    const clamped: MarkdownLinkSpan[] = [];
    for (const span of spans) {
        const start = Math.max(0, Math.min(span.start, maxLength));
        const end = Math.max(start, Math.min(span.end, maxLength));
        if (end > start) clamped.push({ start, end, href: span.href });
    }
    return clamped;
}

export function mergeStyleSpans(spans: MarkdownStyleSpan[]): MarkdownStyleSpan[] {
    const sorted = [...spans].sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        if (a.end !== b.end) return a.end - b.end;
        return a.style.localeCompare(b.style);
    });

    const merged: MarkdownStyleSpan[] = [];
    for (const span of sorted) {
        const prev = merged[merged.length - 1];
        if (prev && prev.style === span.style && span.start <= prev.end) {
            prev.end = Math.max(prev.end, span.end);
            continue;
        }
        merged.push({ ...span });
    }
    return merged;
}

export function sliceStyleSpans(
    spans: MarkdownStyleSpan[],
    start: number,
    end: number,
): MarkdownStyleSpan[] {
    if (spans.length === 0) return [];
    const sliced: MarkdownStyleSpan[] = [];
    for (const span of spans) {
        const sliceStart = Math.max(span.start, start);
        const sliceEnd = Math.min(span.end, end);
        if (sliceEnd > sliceStart) {
            sliced.push({
                start: sliceStart - start,
                end: sliceEnd - start,
                style: span.style,
            });
        }
    }
    return mergeStyleSpans(sliced);
}

export function sliceLinkSpans(spans: MarkdownLinkSpan[], start: number, end: number): MarkdownLinkSpan[] {
    if (spans.length === 0) return [];
    const sliced: MarkdownLinkSpan[] = [];
    for (const span of spans) {
        const sliceStart = Math.max(span.start, start);
        const sliceEnd = Math.min(span.end, end);
        if (sliceEnd > sliceStart) {
            sliced.push({
                start: sliceStart - start,
                end: sliceEnd - start,
                href: span.href,
            });
        }
    }
    return sliced;
}

export function closeRemainingStyles(target: RenderTarget) {
    for (let i = target.openStyles.length - 1; i >= 0; i -= 1) {
        const open = target.openStyles[i];
        const end = target.text.length;
        if (end > open.start) {
            target.styles.push({
                start: open.start,
                end,
                style: open.style,
            });
        }
    }
    target.openStyles = [];
}
