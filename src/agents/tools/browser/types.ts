
export interface BrowserProxyFile {
    path: string;
    base64: string;
    mimeType?: string;
}

export interface BrowserProxyResult {
    result: unknown;
    files?: BrowserProxyFile[];
}

export interface BrowserNodeTarget {
    nodeId: string;
    label?: string;
}
