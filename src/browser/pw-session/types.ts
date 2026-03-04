
import type { Request } from "playwright-core";

export type BrowserConsoleMessage = {
    type: string;
    text: string;
    timestamp: string;
    location?: { url?: string; lineNumber?: number; columnNumber?: number };
};

export type BrowserPageError = {
    message: string;
    name?: string;
    stack?: string;
    timestamp: string;
};

export type BrowserNetworkRequest = {
    id: string;
    timestamp: string;
    method: string;
    url: string;
    resourceType?: string;
    status?: number;
    ok?: boolean;
    failureText?: string;
};

export type SnapshotForAIResult = { full: string; incremental?: string };
export type SnapshotForAIOptions = { timeout?: number; track?: string };

export type WithSnapshotForAI = {
    _snapshotForAI?: (options?: SnapshotForAIOptions) => Promise<SnapshotForAIResult>;
};

export type TargetInfoResponse = {
    targetInfo?: {
        targetId?: string;
    };
};

export type PageState = {
    console: BrowserConsoleMessage[];
    errors: BrowserPageError[];
    requests: BrowserNetworkRequest[];
    requestIds: WeakMap<Request, string>;
    nextRequestId: number;
    armIdUpload: number;
    armIdDialog: number;
    armIdDownload: number;
    roleRefs?: Record<string, { role: string; name?: string; nth?: number }>;
    roleRefsMode?: "role" | "aria";
    roleRefsFrameSelector?: string;
};

export type RoleRefs = NonNullable<PageState["roleRefs"]>;

export type RoleRefsCacheEntry = {
    refs: RoleRefs;
    frameSelector?: string;
    mode?: NonNullable<PageState["roleRefsMode"]>;
};

export type ContextState = {
    traceActive: boolean;
};

export type ConnectedBrowser = {
    browser: any; // Browser
    cdpUrl: string;
};
