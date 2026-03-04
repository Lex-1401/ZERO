
import MarkdownIt from "markdown-it";
import { type MarkdownParseOptions, type MarkdownToken } from "./types.js";

export function createMarkdownIt(options: MarkdownParseOptions): MarkdownIt {
    const md = new MarkdownIt({
        html: false,
        linkify: options.linkify ?? true,
        breaks: false,
        typographer: false,
    });
    md.enable("strikethrough");
    if (options.tableMode && options.tableMode !== "off") {
        md.enable("table");
    } else {
        md.disable("table");
    }
    if (options.autolink === false) {
        md.disable("autolink");
    }
    return md;
}

export function applySpoilerTokens(tokens: MarkdownToken[]): void {
    for (const token of tokens) {
        if (token.children && token.children.length > 0) {
            token.children = injectSpoilersIntoInline(token.children);
        }
    }
}

function createTextToken(base: MarkdownToken, content: string): MarkdownToken {
    return { ...base, type: "text", content, children: undefined };
}

function injectSpoilersIntoInline(tokens: MarkdownToken[]): MarkdownToken[] {
    const result: MarkdownToken[] = [];
    const state = { spoilerOpen: false };

    for (const token of tokens) {
        if (token.type !== "text") {
            result.push(token);
            continue;
        }

        const content = token.content ?? "";
        if (!content.includes("||")) {
            result.push(token);
            continue;
        }

        let index = 0;
        while (index < content.length) {
            const next = content.indexOf("||", index);
            if (next === -1) {
                if (index < content.length) {
                    result.push(createTextToken(token, content.slice(index)));
                }
                break;
            }
            if (next > index) {
                result.push(createTextToken(token, content.slice(index, next)));
            }
            state.spoilerOpen = !state.spoilerOpen;
            result.push({
                type: state.spoilerOpen ? "spoiler_open" : "spoiler_close",
            } as MarkdownToken);
            index = next + 2;
        }
    }

    return result;
}
