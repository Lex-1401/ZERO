
import { type ServerResponse } from "node:http";
import { type StreamingEvent, type ResolvedResponsesLimits, type Usage, type ResponseResource, type OutputItem } from "./types.js";
import { type GatewayHttpResponsesConfig } from "../../config/types.gateway.js";
import {
    DEFAULT_INPUT_FILE_MAX_BYTES,
    DEFAULT_INPUT_FILE_MAX_CHARS,
    DEFAULT_INPUT_FILE_MIMES,
    DEFAULT_INPUT_IMAGE_MAX_BYTES,
    DEFAULT_INPUT_IMAGE_MIMES,
    DEFAULT_INPUT_MAX_REDIRECTS,
    DEFAULT_INPUT_PDF_MAX_PAGES,
    DEFAULT_INPUT_PDF_MAX_PIXELS,
    DEFAULT_INPUT_PDF_MIN_TEXT_CHARS,
    normalizeMimeList,
} from "../../media/input-files.js";

const DEFAULT_BODY_BYTES = 20 * 1024 * 1024;

export function writeSseEvent(res: ServerResponse, event: StreamingEvent) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function extractTextContent(content: any): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("\n");
    }
    return "";
}

export function resolveResponsesLimits(config: GatewayHttpResponsesConfig | undefined): ResolvedResponsesLimits {
    return {
        maxBodyBytes: config?.maxBodyBytes ?? DEFAULT_BODY_BYTES,
        files: {
            allowUrl: config?.files?.allowUrl ?? false,
            timeoutMs: 10000,
            allowedMimes: normalizeMimeList(config?.files?.allowedMimes, DEFAULT_INPUT_FILE_MIMES),
            maxBytes: config?.files?.maxBytes ?? DEFAULT_INPUT_FILE_MAX_BYTES,
            maxChars: config?.files?.maxChars ?? DEFAULT_INPUT_FILE_MAX_CHARS,
            maxRedirects: DEFAULT_INPUT_MAX_REDIRECTS,
            pdf: {
                maxPages: DEFAULT_INPUT_PDF_MAX_PAGES,
                maxPixels: DEFAULT_INPUT_PDF_MAX_PIXELS,
                minTextChars: DEFAULT_INPUT_PDF_MIN_TEXT_CHARS,
            },
        },
        images: {
            allowUrl: config?.images?.allowUrl ?? false,
            timeoutMs: 10000,
            allowedMimes: normalizeMimeList(config?.images?.allowedMimes, DEFAULT_INPUT_IMAGE_MIMES),
            maxBytes: config?.images?.maxBytes ?? DEFAULT_INPUT_IMAGE_MAX_BYTES,
            maxRedirects: DEFAULT_INPUT_MAX_REDIRECTS,
        },
    };
}

export function createEmptyUsage(): Usage {
    return {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
    };
}

export function toUsage(value: any): Usage {
    if (!value) return createEmptyUsage();
    return {
        input_tokens: value.input ?? 0,
        output_tokens: value.output ?? 0,
        total_tokens: value.total ?? (value.input ?? 0) + (value.output ?? 0),
    };
}

export function createResponseResource(params: {
    id: string;
    model: string;
    status: string;
    output: OutputItem[];
    usage?: Usage;
    error?: { code: string; message: string };
}): ResponseResource {
    return {
        id: params.id,
        object: "response",
        model: params.model,
        status: params.status,
        output: params.output,
        usage: params.usage,
        error: params.error,
    };
}

export function createAssistantOutputItem(params: {
    id: string;
    text: string;
    status?: "in_progress" | "completed";
}): OutputItem {
    return {
        id: params.id,
        object: "response.output_item",
        type: "message",
        status: params.status ?? "completed",
        content: [{ type: "text", text: params.text }],
    };
}
