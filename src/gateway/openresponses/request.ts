
import { type IncomingMessage, type ServerResponse } from "node:http";
import { type ImageContent } from "../../commands/agent/types.js";
import { type InputImageSource, extractImageContentFromSource, extractFileContentFromSource } from "../../media/input-files.js";
import { type ResolvedResponsesLimits, type CreateResponseBody } from "./types.js";
import { CreateResponseBodySchema } from "../open-responses.schema.js";
import { readJsonBodyOrError, sendJson } from "../http-common.js";

export async function parseAndValidateRequest(
    req: IncomingMessage,
    res: ServerResponse,
    limits: ResolvedResponsesLimits,
    maxBodyBytes: number
) {
    const body = await readJsonBodyOrError(req, res, maxBodyBytes);
    if (body === undefined) return null;

    const parseResult = CreateResponseBodySchema.safeParse(body);
    if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        const message = issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid request body";
        sendJson(res, 400, {
            error: { message, type: "invalid_request_error" },
        });
        return null;
    }

    return parseResult.data as CreateResponseBody;
}

export async function extractMedia(input: any, limits: ResolvedResponsesLimits) {
    let images: ImageContent[] = [];
    let fileContexts: string[] = [];

    if (Array.isArray(input)) {
        for (const item of input) {
            if (item.type === "message" && typeof item.content !== "string") {
                for (const part of item.content) {
                    if (part.type === "input_image") {
                        const source = part.source as any;
                        const sourceType = source.type === "base64" || source.type === "url" ? source.type : undefined;
                        if (!sourceType) throw new Error("input_image must have 'source.url' or 'source.data'");

                        const imageSource: InputImageSource = {
                            type: sourceType,
                            url: source.url,
                            data: source.data,
                            mediaType: source.media_type,
                        };
                        const image = await extractImageContentFromSource(imageSource, limits.images);
                        images.push(image);
                    } else if (part.type === "input_file") {
                        const source = part.source as any;
                        const sourceType = source.type === "base64" || source.type === "url" ? source.type : undefined;
                        if (!sourceType) throw new Error("input_file must have 'source.url' or 'source.data'");

                        const file = await extractFileContentFromSource({
                            source: {
                                type: sourceType,
                                url: source.url,
                                data: source.data,
                                mediaType: source.media_type,
                                filename: source.filename,
                            },
                            limits: limits.files,
                        });
                        if (file.text?.trim()) {
                            fileContexts.push(`<file name="${file.filename}">\n${file.text}\n</file>`);
                        }
                        if (file.images && file.images.length > 0) {
                            images = images.concat(file.images);
                        }
                    }
                }
            }
        }
    }

    return { images, fileContexts };
}
