import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { resolveApiKeyForProvider, requireApiKey } from "../../agents/model-auth.js";
import { getMediaUnderstandingProvider, normalizeMediaProviderId } from "../providers/index.js";
import { describeImageWithModel } from "../providers/image.js";
import { estimateBase64Size, resolveVideoMaxBase64Bytes } from "../video.js";
import { isMediaUnderstandingSkipError, MediaUnderstandingSkipError } from "../errors.js";
import {
    resolveMaxBytes,
    resolveMaxChars,
    resolveTimeoutMs,
    resolvePrompt
} from "../resolve.js";
import { DEFAULT_TIMEOUT_SECONDS, DEFAULT_AUDIO_MODELS, CLI_OUTPUT_MAX_BUFFER } from "../defaults.js";
import { fileExists } from "./system-utils.js";
import { extractGeminiResponse, extractSherpaOnnxText } from "./parsing.js";
import { applyTemplate } from "../../auto-reply/templating.js";
import { logVerbose, shouldLogVerbose } from "../../globals.js";
import { runExec } from "../../process/exec.js";
import type {
    MediaUnderstandingCapability,
    MediaUnderstandingOutput,
    MediaUnderstandingDecision,
    MediaUnderstandingModelDecision,
    MediaUnderstandingProvider
} from "../types.js";
import type { MediaUnderstandingModelConfig, MediaUnderstandingConfig } from "../../config/types.tools.js";
import type { ZEROConfig } from "../../config/config.js";
import type { MsgContext } from "../../auto-reply/templating.js";
import type { MediaAttachmentCache } from "../attachments.js";
import type { ProviderRegistry } from "./types.js";

export function trimOutput(text: string, maxChars?: number): string {
    const trimmed = text.trim();
    if (!maxChars || trimmed.length <= maxChars) return trimmed;
    return trimmed.slice(0, maxChars).trim();
}

export function commandBase(command: string): string {
    return path.parse(command).name;
}

export function findArgValue(args: string[], keys: string[]): string | undefined {
    for (let i = 0; i < args.length; i += 1) {
        if (keys.includes(args[i] ?? "")) {
            const value = args[i + 1];
            if (value) return value;
        }
    }
    return undefined;
}

export function hasArg(args: string[], keys: string[]): boolean {
    return args.some((arg) => keys.includes(arg));
}

export function resolveWhisperOutputPath(args: string[], mediaPath: string): string | null {
    const outputDir = findArgValue(args, ["--output_dir", "-o"]);
    const outputFormat = findArgValue(args, ["--output_format"]);
    if (!outputDir || !outputFormat) return null;
    const formats = outputFormat.split(",").map((value) => value.trim());
    if (!formats.includes("txt")) return null;
    const base = path.parse(mediaPath).name;
    return path.join(outputDir, `${base}.txt`);
}

export function resolveWhisperCppOutputPath(args: string[]): string | null {
    if (!hasArg(args, ["-otxt", "--output-txt"])) return null;
    const outputBase = findArgValue(args, ["-of", "--output-file"]);
    if (!outputBase) return null;
    return `${outputBase}.txt`;
}

export async function resolveCliOutput(params: {
    command: string;
    args: string[];
    stdout: string;
    mediaPath: string;
}): Promise<string> {
    const commandId = commandBase(params.command);
    const fileOutput =
        commandId === "whisper-cli"
            ? resolveWhisperCppOutputPath(params.args)
            : commandId === "whisper"
                ? resolveWhisperOutputPath(params.args, params.mediaPath)
                : null;
    if (fileOutput && (await fileExists(fileOutput))) {
        try {
            const content = await fs.readFile(fileOutput, "utf8");
            if (content.trim()) return content.trim();
        } catch { }
    }

    if (commandId === "gemini") {
        const response = extractGeminiResponse(params.stdout);
        if (response) return response;
    }

    if (commandId === "sherpa-onnx-offline") {
        const response = extractSherpaOnnxText(params.stdout);
        if (response) return response;
    }

    return params.stdout.trim();
}

export function buildModelDecision(params: {
    entry: MediaUnderstandingModelConfig;
    entryType: "provider" | "cli";
    outcome: MediaUnderstandingModelDecision["outcome"];
    reason?: string;
}): MediaUnderstandingModelDecision {
    if (params.entryType === "cli") {
        const command = params.entry.command?.trim();
        return {
            type: "cli",
            provider: command ?? "cli",
            model: params.entry.model ?? command,
            outcome: params.outcome,
            reason: params.reason,
        };
    }
    const providerIdRaw = params.entry.provider?.trim();
    const providerId = providerIdRaw ? normalizeMediaProviderId(providerIdRaw) : undefined;
    return {
        type: "provider",
        provider: providerId ?? providerIdRaw,
        model: params.entry.model,
        outcome: params.outcome,
        reason: params.reason,
    };
}

export function formatDecisionSummary(decision: MediaUnderstandingDecision): string {
    const total = decision.attachments.length;
    const success = decision.attachments.filter(
        (entry) => entry.chosen?.outcome === "success",
    ).length;
    const chosen = decision.attachments.find((entry) => entry.chosen)?.chosen;
    const provider = chosen?.provider?.trim();
    const model = chosen?.model?.trim();
    const modelLabel = provider ? (model ? `${provider}/${model}` : provider) : undefined;
    const reason = decision.attachments
        .flatMap((entry) => entry.attempts.map((attempt) => attempt.reason).filter(Boolean))
        .find(Boolean);
    const shortReason = reason ? reason.split(":")[0]?.trim() : undefined;
    const countLabel = total > 0 ? ` (${success}/${total})` : "";
    const viaLabel = modelLabel ? ` via ${modelLabel}` : "";
    const reasonLabel = shortReason ? ` reason=${shortReason}` : "";
    return `${decision.capability}: ${decision.outcome}${countLabel}${viaLabel}${reasonLabel}`;
}

export function resolveProviderQuery(params: {
    providerId: string;
    capability: MediaUnderstandingCapability;
    entry: MediaUnderstandingModelConfig;
    cfg: ZEROConfig;
    config?: MediaUnderstandingConfig;
}): Record<string, string | number | boolean> | undefined {
    const { providerId, entry, config } = params;
    const capabilityOptions = config?.providerOptions?.[providerId];
    const entryOptions = entry.providerOptions?.[providerId];

    const merged: Record<string, string | number | boolean> = {
        ...capabilityOptions,
        ...entryOptions,
    };

    if (providerId === "deepgram") {
        // Handle deprecated fields and camelCase normalization
        const mergeDeepgram = (dg?: { detectLanguage?: boolean; punctuate?: boolean; smartFormat?: boolean }) => {
            if (dg?.detectLanguage !== undefined) merged.detect_language = dg.detectLanguage;
            if (dg?.punctuate !== undefined) merged.punctuate = dg.punctuate;
            if (dg?.smartFormat !== undefined) merged.smart_format = dg.smartFormat;
        };
        mergeDeepgram(config?.deepgram);
        mergeDeepgram(entry.deepgram);

        if ("detectLanguage" in merged) {
            merged.detect_language = merged.detectLanguage!;
            delete merged.detectLanguage;
        }
        if ("smartFormat" in merged) {
            merged.smart_format = merged.smartFormat!;
            delete merged.smartFormat;
        }
    }

    return Object.keys(merged).length > 0 ? merged : undefined;
}

export async function runProviderEntry(params: {
    capability: MediaUnderstandingCapability;
    entry: MediaUnderstandingModelConfig;
    cfg: ZEROConfig;
    ctx: MsgContext;
    attachmentIndex: number;
    cache: MediaAttachmentCache;
    agentDir?: string;
    providerRegistry: ProviderRegistry;
    config?: MediaUnderstandingConfig;
}): Promise<MediaUnderstandingOutput | null> {
    const { entry, capability, cfg } = params;
    const providerIdRaw = entry.provider?.trim();
    if (!providerIdRaw) {
        throw new Error(`Provider entry missing provider for ${capability}`);
    }
    const providerId = normalizeMediaProviderId(providerIdRaw);
    const maxBytes = resolveMaxBytes({ capability, entry, cfg, config: params.config });
    const maxChars = resolveMaxChars({ capability, entry, cfg, config: params.config });
    const timeoutMs = resolveTimeoutMs(
        entry.timeoutSeconds ??
        params.config?.timeoutSeconds ??
        cfg.tools?.media?.[capability]?.timeoutSeconds,
        DEFAULT_TIMEOUT_SECONDS[capability],
    );
    const prompt = resolvePrompt(
        capability,
        entry.prompt ?? params.config?.prompt ?? cfg.tools?.media?.[capability]?.prompt,
        maxChars,
    );

    if (capability === "image") {
        if (!params.agentDir) {
            throw new Error("Image understanding requires agentDir");
        }
        const modelId = entry.model?.trim();
        if (!modelId) {
            throw new Error("Image understanding requires model id");
        }
        const media = await params.cache.getBuffer({
            attachmentIndex: params.attachmentIndex,
            maxBytes,
            timeoutMs,
        });
        const provider = getMediaUnderstandingProvider(providerId, params.providerRegistry);
        const result = provider?.describeImage
            ? await provider.describeImage({
                buffer: media.buffer,
                fileName: media.fileName,
                mime: media.mime,
                model: modelId,
                provider: providerId,
                prompt,
                timeoutMs,
                profile: entry.profile,
                preferredProfile: entry.preferredProfile,
                agentDir: params.agentDir,
                cfg: params.cfg,
            })
            : await describeImageWithModel({
                buffer: media.buffer,
                fileName: media.fileName,
                mime: media.mime,
                model: modelId,
                provider: providerId,
                prompt,
                timeoutMs,
                profile: entry.profile,
                preferredProfile: entry.preferredProfile,
                agentDir: params.agentDir,
                cfg: params.cfg,
            });
        return {
            kind: "image.description",
            attachmentIndex: params.attachmentIndex,
            text: trimOutput(result.text, maxChars),
            provider: providerId,
            model: result.model ?? modelId,
        };
    }

    const provider = getMediaUnderstandingProvider(providerId, params.providerRegistry);
    if (!provider) {
        throw new Error(`Media provider not available: ${providerId}`);
    }

    if (capability === "audio") {
        if (!provider.transcribeAudio) {
            throw new Error(`Audio transcription provider "${providerId}" not available.`);
        }
        const media = await params.cache.getBuffer({
            attachmentIndex: params.attachmentIndex,
            maxBytes,
            timeoutMs,
        });
        const auth = await resolveApiKeyForProvider({
            provider: providerId,
            cfg,
            profileId: entry.profile,
            preferredProfile: entry.preferredProfile,
            agentDir: params.agentDir,
        });
        const apiKey = requireApiKey(auth, providerId);
        const providerConfig = cfg.models?.providers?.[providerId];
        const baseUrl = entry.baseUrl ?? params.config?.baseUrl ?? providerConfig?.baseUrl;
        const mergedHeaders = {
            ...providerConfig?.headers,
            ...params.config?.headers,
            ...entry.headers,
        };
        const headers = Object.keys(mergedHeaders).length > 0 ? mergedHeaders : undefined;

        const query = resolveProviderQuery({
            providerId,
            capability,
            entry,
            cfg,
            config: params.config,
        });
        const model = entry.model?.trim() || DEFAULT_AUDIO_MODELS[providerId] || entry.model;
        const result = await provider.transcribeAudio({
            buffer: media.buffer,
            fileName: media.fileName,
            mime: media.mime,
            apiKey,
            baseUrl,
            headers,
            model,
            language: entry.language ?? params.config?.language ?? cfg.tools?.media?.audio?.language,
            prompt,
            query,
            timeoutMs,
        });
        return {
            kind: "audio.transcription",
            attachmentIndex: params.attachmentIndex,
            text: trimOutput(result.text, maxChars),
            provider: providerId,
            model: result.model ?? model,
        };
    }

    if (!provider.describeVideo) {
        throw new Error(`Video understanding provider "${providerId}" not available.`);
    }
    const media = await params.cache.getBuffer({
        attachmentIndex: params.attachmentIndex,
        maxBytes,
        timeoutMs,
    });
    const estimatedBase64Bytes = estimateBase64Size(media.size);
    const maxBase64Bytes = resolveVideoMaxBase64Bytes(maxBytes);
    if (estimatedBase64Bytes > maxBase64Bytes) {
        throw new MediaUnderstandingSkipError(
            "maxBytes",
            `Video attachment ${params.attachmentIndex + 1} base64 payload ${estimatedBase64Bytes} exceeds ${maxBase64Bytes}`,
        );
    }
    const auth = await resolveApiKeyForProvider({
        provider: providerId,
        cfg,
        profileId: entry.profile,
        preferredProfile: entry.preferredProfile,
        agentDir: params.agentDir,
    });
    const apiKey = requireApiKey(auth, providerId);
    const providerConfig = cfg.models?.providers?.[providerId];
    const result = await provider.describeVideo({
        buffer: media.buffer,
        fileName: media.fileName,
        mime: media.mime,
        apiKey,
        baseUrl: providerConfig?.baseUrl,
        headers: providerConfig?.headers,
        model: entry.model,
        prompt,
        timeoutMs,
    });
    return {
        kind: "video.description",
        attachmentIndex: params.attachmentIndex,
        text: trimOutput(result.text, maxChars),
        provider: providerId,
        model: result.model ?? entry.model,
    };
}

export async function runCliEntry(params: {
    capability: MediaUnderstandingCapability;
    entry: MediaUnderstandingModelConfig;
    cfg: ZEROConfig;
    ctx: MsgContext;
    attachmentIndex: number;
    cache: MediaAttachmentCache;
    config?: MediaUnderstandingConfig;
}): Promise<MediaUnderstandingOutput | null> {
    const { entry, capability, cfg, ctx } = params;
    const command = entry.command?.trim();
    const args = entry.args ?? [];
    if (!command) {
        throw new Error(`CLI entry missing command for ${capability}`);
    }
    const maxBytes = resolveMaxBytes({ capability, entry, cfg, config: params.config });
    const maxChars = resolveMaxChars({ capability, entry, cfg, config: params.config });
    const timeoutMs = resolveTimeoutMs(
        entry.timeoutSeconds ??
        params.config?.timeoutSeconds ??
        cfg.tools?.media?.[capability]?.timeoutSeconds,
        DEFAULT_TIMEOUT_SECONDS[capability],
    );
    const prompt = resolvePrompt(
        capability,
        entry.prompt ?? params.config?.prompt ?? cfg.tools?.media?.[capability]?.prompt,
        maxChars,
    );
    const pathResult = await params.cache.getPath({
        attachmentIndex: params.attachmentIndex,
        maxBytes,
        timeoutMs,
    });
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "zero-media-cli-"));
    const mediaPath = pathResult.path;
    const outputBase = path.join(outputDir, path.parse(mediaPath).name);

    const templCtx: MsgContext = {
        ...ctx,
        MediaPath: mediaPath,
        MediaDir: path.dirname(mediaPath),
        OutputDir: outputDir,
        OutputBase: outputBase,
        Prompt: prompt,
        MaxChars: maxChars,
    };
    const argv = [command, ...args].map((part, index) =>
        index === 0 ? part : applyTemplate(part, templCtx),
    );
    try {
        if (shouldLogVerbose()) {
            logVerbose(`Media understanding via CLI: ${argv.join(" ")}`);
        }
        const { stdout } = await runExec(argv[0], argv.slice(1), {
            timeoutMs,
            maxBuffer: CLI_OUTPUT_MAX_BUFFER,
        });
        const resolved = await resolveCliOutput({
            command,
            args: argv.slice(1),
            stdout,
            mediaPath,
        });
        const text = trimOutput(resolved, maxChars);
        if (!text) return null;
        return {
            kind: capability === "audio" ? "audio.transcription" : `${capability}.description`,
            attachmentIndex: params.attachmentIndex,
            text,
            provider: "cli",
            model: command,
        };
    } finally {
        await fs.rm(outputDir, { recursive: true, force: true }).catch(() => { });
    }
}

export async function runAttachmentEntries(params: {
    capability: MediaUnderstandingCapability;
    cfg: ZEROConfig;
    ctx: MsgContext;
    attachmentIndex: number;
    cache: MediaAttachmentCache;
    entries: MediaUnderstandingModelConfig[];
    config?: MediaUnderstandingConfig;
    providerRegistry: ProviderRegistry;
    agentDir?: string;
}): Promise<{
    output: MediaUnderstandingOutput | null;
    attempts: MediaUnderstandingModelDecision[];
}> {
    const { entries, capability, agentDir } = params;
    const attempts: MediaUnderstandingModelDecision[] = [];
    for (const entry of entries) {
        const entryType = entry.type ?? (entry.command ? "cli" : "provider");
        try {
            const result =
                entryType === "cli"
                    ? await runCliEntry({
                        capability,
                        entry,
                        cfg: params.cfg,
                        ctx: params.ctx,
                        attachmentIndex: params.attachmentIndex,
                        cache: params.cache,
                        config: params.config,
                    })
                    : await runProviderEntry({
                        capability,
                        entry,
                        cfg: params.cfg,
                        ctx: params.ctx,
                        attachmentIndex: params.attachmentIndex,
                        cache: params.cache,
                        agentDir: params.agentDir,
                        providerRegistry: params.providerRegistry,
                        config: params.config,
                    });
            if (result) {
                const decision = buildModelDecision({ entry, entryType, outcome: "success" });
                if (result.provider) decision.provider = result.provider;
                if (result.model) decision.model = result.model;
                attempts.push(decision);
                return { output: result, attempts };
            }
            attempts.push(
                buildModelDecision({ entry, entryType, outcome: "skipped", reason: "empty output" }),
            );
        } catch (err) {
            if (isMediaUnderstandingSkipError(err)) {
                attempts.push(
                    buildModelDecision({
                        entry,
                        entryType,
                        outcome: "skipped",
                        reason: `${(err as any).reason}: ${(err as any).message}`,
                    }),
                );
                if (shouldLogVerbose()) {
                    logVerbose(`Skipping ${capability} model due to ${(err as any).reason}: ${(err as any).message}`);
                }
                continue;
            }
            attempts.push(
                buildModelDecision({
                    entry,
                    entryType,
                    outcome: "failed",
                    reason: String(err),
                }),
            );
            if (shouldLogVerbose()) {
                logVerbose(`${capability} understanding failed: ${String(err)}`);
            }
        }
    }

    return { output: null, attempts };
}
