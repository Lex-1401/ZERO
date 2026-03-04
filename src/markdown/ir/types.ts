
import { type MarkdownTableMode } from "../../config/schemas/core-base.js";

export type MarkdownStyle = "bold" | "italic" | "strikethrough" | "code" | "code_block" | "spoiler";

export interface MarkdownStyleSpan {
    start: number;
    end: number;
    style: MarkdownStyle;
}

export interface MarkdownLinkSpan {
    start: number;
    end: number;
    href: string;
}

export interface MarkdownIR {
    text: string;
    styles: MarkdownStyleSpan[];
    links: MarkdownLinkSpan[];
}

export interface MarkdownParseOptions {
    linkify?: boolean;
    enableSpoilers?: boolean;
    headingStyle?: "none" | "bold";
    blockquotePrefix?: string;
    autolink?: boolean;
    tableMode?: MarkdownTableMode;
}

export interface MarkdownToken {
    type: string;
    content?: string;
    children?: MarkdownToken[];
    attrs?: [string, string][];
    attrGet?: (name: string) => string | null;
}

export type ListState = {
    type: "bullet" | "ordered";
    index: number;
};

export type LinkState = {
    href: string;
    labelStart: number;
};

export type RenderEnv = {
    listStack: ListState[];
};

export type OpenStyle = {
    style: MarkdownStyle;
    start: number;
};
