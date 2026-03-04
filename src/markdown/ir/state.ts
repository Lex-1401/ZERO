
import { type MarkdownTableMode } from "../../config/schemas/core-base.js";
import {
    type MarkdownStyleSpan,
    type MarkdownLinkSpan,
    type OpenStyle,
    type LinkState,
    type RenderEnv,
} from "./types.js";

export type RenderTarget = {
    text: string;
    styles: MarkdownStyleSpan[];
    openStyles: OpenStyle[];
    links: MarkdownLinkSpan[];
    linkStack: LinkState[];
};

export type TableCell = {
    text: string;
    styles: MarkdownStyleSpan[];
    links: MarkdownLinkSpan[];
};

export type TableState = {
    headers: TableCell[];
    rows: TableCell[][];
    currentRow: TableCell[];
    currentCell: RenderTarget | null;
    inHeader: boolean;
};

export type RenderState = RenderTarget & {
    env: RenderEnv;
    headingStyle: "none" | "bold";
    blockquotePrefix: string;
    enableSpoilers: boolean;
    tableMode: MarkdownTableMode;
    table: TableState | null;
    hasTables: boolean;
};

export function initRenderTarget(): RenderTarget {
    return {
        text: "",
        styles: [],
        openStyles: [],
        links: [],
        linkStack: [],
    };
}

export function resolveRenderTarget(state: RenderState): RenderTarget {
    return state.table?.currentCell ?? state;
}

export function initTableState(): TableState {
    return {
        headers: [],
        rows: [],
        currentRow: [],
        currentCell: null,
        inHeader: false,
    };
}
