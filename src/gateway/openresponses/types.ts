

import type { ResolvedGatewayAuth } from "../auth.js";
import type { GatewayHttpResponsesConfig } from "../../config/types.gateway.js";
import { type InputFileLimits, type InputImageLimits } from "../../media/input-files.js";

export interface OpenResponsesHttpOptions {
    auth: ResolvedGatewayAuth;
    maxBodyBytes?: number;
    config?: GatewayHttpResponsesConfig;
    trustedProxies?: string[];
}

export interface ResolvedResponsesLimits {
    maxBodyBytes: number;
    files: InputFileLimits;
    images: InputImageLimits;
}

export type StreamingEvent = any; // SSE event type simplified
export type ContentPart = any;
export type CreateResponseBody = any;
export type ResponseResource = any;
export type OutputItem = any;
export type Usage = any;
export type ItemParam = any;
