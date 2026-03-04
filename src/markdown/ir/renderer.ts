
import { type MarkdownToken, type MarkdownStyle } from "./types.js";
import { type RenderState, resolveRenderTarget, initRenderTarget } from "./state.js";
import { finishTableCell, renderTableAsBullets, renderTableAsCode } from "./table.js";


function getAttr(token: MarkdownToken, name: string): string | null {
    if (token.attrGet) return token.attrGet(name);
    if (token.attrs) {
        for (const [key, value] of token.attrs) {
            if (key === name) return value;
        }
    }
    return null;
}

function appendText(state: RenderState, value: string) {
    if (!value) return;
    const target = resolveRenderTarget(state);
    target.text += value;
}

function openStyle(state: RenderState, style: MarkdownStyle) {
    const target = resolveRenderTarget(state);
    target.openStyles.push({ style, start: target.text.length });
}

function closeStyle(state: RenderState, style: MarkdownStyle) {
    const target = resolveRenderTarget(state);
    for (let i = target.openStyles.length - 1; i >= 0; i -= 1) {
        if (target.openStyles[i]?.style === style) {
            const start = target.openStyles[i].start;
            target.openStyles.splice(i, 1);
            const end = target.text.length;
            if (end > start) {
                target.styles.push({ start, end, style });
            }
            return;
        }
    }
}

function appendParagraphSeparator(state: RenderState) {
    if (state.env.listStack.length > 0) return;
    if (state.table) return;
    state.text += "\n\n";
}

function appendListPrefix(state: RenderState) {
    const stack = state.env.listStack;
    const top = stack[stack.length - 1];
    if (!top) return;
    top.index += 1;
    const indent = "  ".repeat(Math.max(0, stack.length - 1));
    const prefix = top.type === "ordered" ? `${top.index}. ` : "• ";
    state.text += `${indent}${prefix}`;
}

function renderInlineCode(state: RenderState, content: string) {
    if (!content) return;
    const target = resolveRenderTarget(state);
    const start = target.text.length;
    target.text += content;
    target.styles.push({ start, end: start + content.length, style: "code" });
}

function renderCodeBlock(state: RenderState, content: string) {
    let code = content ?? "";
    if (!code.endsWith("\n")) code = `${code}\n`;
    const target = resolveRenderTarget(state);
    const start = target.text.length;
    target.text += code;
    target.styles.push({ start, end: start + code.length, style: "code_block" });
    if (state.env.listStack.length === 0) {
        target.text += "\n";
    }
}

function handleLinkClose(state: RenderState) {
    const target = resolveRenderTarget(state);
    const link = target.linkStack.pop();
    if (!link?.href) return;
    const href = link.href.trim();
    if (!href) return;
    const start = link.labelStart;
    const end = target.text.length;
    target.links.push({ start, end, href });
}

export function renderTokens(tokens: MarkdownToken[], state: RenderState): void {
    for (const token of tokens) {
        switch (token.type) {
            case "inline":
                if (token.children) renderTokens(token.children, state);
                break;
            case "text":
                appendText(state, token.content ?? "");
                break;
            case "em_open":
                openStyle(state, "italic");
                break;
            case "em_close":
                closeStyle(state, "italic");
                break;
            case "strong_open":
                openStyle(state, "bold");
                break;
            case "strong_close":
                closeStyle(state, "bold");
                break;
            case "s_open":
                openStyle(state, "strikethrough");
                break;
            case "s_close":
                closeStyle(state, "strikethrough");
                break;
            case "code_inline":
                renderInlineCode(state, token.content ?? "");
                break;
            case "spoiler_open":
                if (state.enableSpoilers) openStyle(state, "spoiler");
                break;
            case "spoiler_close":
                if (state.enableSpoilers) closeStyle(state, "spoiler");
                break;
            case "link_open": {
                const href = getAttr(token, "href") ?? "";
                const target = resolveRenderTarget(state);
                target.linkStack.push({ href, labelStart: target.text.length });
                break;
            }
            case "link_close":
                handleLinkClose(state);
                break;
            case "image":
                appendText(state, token.content ?? "");
                break;
            case "softbreak":
            case "hardbreak":
                appendText(state, "\n");
                break;
            case "paragraph_close":
                appendParagraphSeparator(state);
                break;
            case "heading_open":
                if (state.headingStyle === "bold") openStyle(state, "bold");
                break;
            case "heading_close":
                if (state.headingStyle === "bold") closeStyle(state, "bold");
                appendParagraphSeparator(state);
                break;
            case "blockquote_open":
                if (state.blockquotePrefix) state.text += state.blockquotePrefix;
                break;
            case "blockquote_close":
                state.text += "\n";
                break;
            case "bullet_list_open":
                state.env.listStack.push({ type: "bullet", index: 0 });
                break;
            case "bullet_list_close":
                state.env.listStack.pop();
                break;
            case "ordered_list_open": {
                const start = Number(getAttr(token, "start") ?? "1");
                state.env.listStack.push({ type: "ordered", index: start - 1 });
                break;
            }
            case "ordered_list_close":
                state.env.listStack.pop();
                break;
            case "list_item_open":
                appendListPrefix(state);
                break;
            case "list_item_close":
                state.text += "\n";
                break;
            case "code_block":
            case "fence":
                renderCodeBlock(state, token.content ?? "");
                break;
            case "html_block":
            case "html_inline":
                appendText(state, token.content ?? "");
                break;
            case "table_open":
                if (state.tableMode !== "off") {
                    state.table = { headers: [], rows: [], currentRow: [], currentCell: null, inHeader: false };
                    state.hasTables = true;
                }
                break;
            case "table_close":
                if (state.table) {
                    if (state.tableMode === "bullets") renderTableAsBullets(state);
                    else if (state.tableMode === "code") renderTableAsCode(state);
                }
                state.table = null;
                break;
            case "thead_open":
                if (state.table) state.table.inHeader = true;
                break;
            case "thead_close":
                if (state.table) state.table.inHeader = false;
                break;
            case "tr_open":
                if (state.table) state.table.currentRow = [];
                break;
            case "tr_close":
                if (state.table) {
                    if (state.table.inHeader) state.table.headers = state.table.currentRow;
                    else state.table.rows.push(state.table.currentRow);
                    state.table.currentRow = [];
                }
                break;
            case "th_open":
            case "td_open":
                if (state.table) state.table.currentCell = initRenderTarget();
                break;
            case "th_close":
            case "td_close":
                if (state.table?.currentCell) {
                    state.table.currentRow.push(finishTableCell(state.table.currentCell));
                    state.table.currentCell = null;
                }
                break;
            case "hr":
                state.text += "\n";
                break;
            default:
                if (token.children) renderTokens(token.children, state);
                break;
        }
    }
}
