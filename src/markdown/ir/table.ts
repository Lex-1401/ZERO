
import { type RenderState, type TableCell, type RenderTarget } from "./state.js";
import { type MarkdownStyleSpan, type MarkdownLinkSpan } from "./types.js";
import { closeRemainingStyles } from "./utils.js";

export function finishTableCell(cell: RenderTarget): TableCell {
    closeRemainingStyles(cell);
    return {
        text: cell.text,
        styles: cell.styles,
        links: cell.links,
    };
}

export function trimCell(cell: TableCell): TableCell {
    const text = cell.text;
    let start = 0;
    let end = text.length;
    while (start < end && /\s/.test(text[start] ?? "")) start += 1;
    while (end > start && /\s/.test(text[end - 1] ?? "")) end -= 1;
    if (start === 0 && end === text.length) return cell;
    const trimmedText = text.slice(start, end);
    const trimmedLength = trimmedText.length;
    const trimmedStyles: MarkdownStyleSpan[] = [];
    for (const span of cell.styles) {
        const sliceStart = Math.max(0, span.start - start);
        const sliceEnd = Math.min(trimmedLength, span.end - start);
        if (sliceEnd > sliceStart) {
            trimmedStyles.push({ start: sliceStart, end: sliceEnd, style: span.style });
        }
    }
    const trimmedLinks: MarkdownLinkSpan[] = [];
    for (const span of cell.links) {
        const sliceStart = Math.max(0, span.start - start);
        const sliceEnd = Math.min(trimmedLength, span.end - start);
        if (sliceEnd > sliceStart) {
            trimmedLinks.push({ start: sliceStart, end: sliceEnd, href: span.href });
        }
    }
    return { text: trimmedText, styles: trimmedStyles, links: trimmedLinks };
}

export function appendCell(state: RenderState, cell: TableCell) {
    if (!cell.text) return;
    const start = state.text.length;
    state.text += cell.text;
    for (const span of cell.styles) {
        state.styles.push({
            start: start + span.start,
            end: start + span.end,
            style: span.style,
        });
    }
    for (const link of cell.links) {
        state.links.push({
            start: start + link.start,
            end: start + link.end,
            href: link.href,
        });
    }
}

export function renderTableAsBullets(state: RenderState) {
    if (!state.table) return;
    const headers = state.table.headers.map(trimCell);
    const rows = state.table.rows.map((row) => row.map(trimCell));

    if (headers.length === 0 && rows.length === 0) return;

    const useFirstColAsLabel = headers.length > 1 && rows.length > 0;

    if (useFirstColAsLabel) {
        for (const row of rows) {
            if (row.length === 0) continue;
            const rowLabel = row[0];
            if (rowLabel?.text) {
                const labelStart = state.text.length;
                appendCell(state, rowLabel);
                const labelEnd = state.text.length;
                if (labelEnd > labelStart) {
                    state.styles.push({ start: labelStart, end: labelEnd, style: "bold" });
                }
                state.text += "\n";
            }
            for (let i = 1; i < row.length; i++) {
                const header = headers[i];
                const value = row[i];
                if (!value?.text) continue;
                state.text += "• ";
                if (header?.text) {
                    appendCell(state, header);
                    state.text += ": ";
                } else {
                    state.text += `Column ${i}: `;
                }
                appendCell(state, value);
                state.text += "\n";
            }
            state.text += "\n";
        }
    } else {
        for (const row of rows) {
            for (let i = 0; i < row.length; i++) {
                const header = headers[i];
                const value = row[i];
                if (!value?.text) continue;
                state.text += "• ";
                if (header?.text) {
                    appendCell(state, header);
                    state.text += ": ";
                }
                appendCell(state, value);
                state.text += "\n";
            }
            state.text += "\n";
        }
    }
}

export function renderTableAsCode(state: RenderState) {
    if (!state.table) return;
    const headers = state.table.headers.map(trimCell);
    const rows = state.table.rows.map((row) => row.map(trimCell));

    const columnCount = Math.max(headers.length, ...rows.map((row) => row.length));
    if (columnCount === 0) return;

    const widths = Array.from({ length: columnCount }, () => 0);
    const updateWidths = (cells: TableCell[]) => {
        for (let i = 0; i < columnCount; i += 1) {
            const cell = cells[i];
            const width = cell?.text.length ?? 0;
            if (widths[i] < width) widths[i] = width;
        }
    };
    updateWidths(headers);
    for (const row of rows) updateWidths(row);

    const codeStart = state.text.length;

    const appendRow = (cells: TableCell[]) => {
        state.text += "|";
        for (let i = 0; i < columnCount; i += 1) {
            state.text += " ";
            const cell = cells[i];
            if (cell) appendCell(state, cell);
            const pad = widths[i] - (cell?.text.length ?? 0);
            if (pad > 0) state.text += " ".repeat(pad);
            state.text += " |";
        }
        state.text += "\n";
    };

    const appendDivider = () => {
        state.text += "|";
        for (let i = 0; i < columnCount; i += 1) {
            const dashCount = Math.max(3, widths[i]);
            state.text += ` ${"-".repeat(dashCount)} |`;
        }
        state.text += "\n";
    };

    appendRow(headers);
    appendDivider();
    for (const row of rows) {
        appendRow(row);
    }

    const codeEnd = state.text.length;
    if (codeEnd > codeStart) {
        state.styles.push({ start: codeStart, end: codeEnd, style: "code_block" });
    }
    if (state.env.listStack.length === 0) {
        state.text += "\n";
    }
}
