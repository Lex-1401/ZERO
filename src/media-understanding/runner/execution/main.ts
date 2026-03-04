
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { runExec } from "../../../process/exec.js";
import { resolveApiKeyForProvider } from "../../../agents/model-auth.js";
import { getMediaUnderstandingProvider } from "../../providers/index.js";
import { trimOutput } from "./utils.js";
import { extractGeminiResponse } from "../parsing.js";

function resolveMergedHeaders(params: any) {
    const { cfg, provider, capability, entry, config } = params;
    const providerConfig = cfg?.models?.providers?.[provider];
    const providerHeaders = providerConfig?.headers || {};
    const capHeaders = cfg?.tools?.media?.[capability]?.headers || {};
    const entryHeaders = entry?.headers || {};
    const runtimeHeaders = config?.headers || {};
    return { ...providerHeaders, ...capHeaders, ...entryHeaders, ...runtimeHeaders };
}

function snakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function normalizeDeepgramQuery(query: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(query)) {
        result[snakeCase(key)] = value;
    }
    return result;
}

function resolveMergedQuery(params: {
    cfg?: any;
    provider: string;
    capability: string;
    entry: any;
    config?: any;
}) {
    const { cfg, provider, capability, entry, config } = params;
    const isDeepgram = provider === "deepgram";
    const norm = (obj: Record<string, any>) => (isDeepgram ? normalizeDeepgramQuery(obj) : obj);

    const capConfig = cfg?.tools?.media?.[capability] || {};
    const capProviderOptions = norm(capConfig.providerOptions?.[provider] || {});
    const capSpecific = norm((capConfig as any)[provider] || {});

    const entryProviderOptions = norm(entry.providerOptions?.[provider] || {});
    const entrySpecific = norm((entry as any)[provider] || {});

    const runtimeProviderOptions = (config && config !== capConfig) ? norm(config.providerOptions?.[provider] || {}) : {};
    const runtimeSpecific = (config && config !== capConfig) ? norm((config || {})[provider] || {}) : {};

    console.log("DEBUG: SPREAD START");
    console.log("DEBUG: 1 capProviderOptions:", JSON.stringify(capProviderOptions));
    console.log("DEBUG: 2 capSpecific:", JSON.stringify(capSpecific));
    console.log("DEBUG: 3 entryProviderOptions:", JSON.stringify(entryProviderOptions));
    console.log("DEBUG: 4 entrySpecific:", JSON.stringify(entrySpecific));
    console.log("DEBUG: 5 runtimeProviderOptions:", JSON.stringify(runtimeProviderOptions));
    console.log("DEBUG: 6 runtimeSpecific:", JSON.stringify(runtimeSpecific));

    const merged = {
        ...capProviderOptions,
        ...capSpecific,
        ...entryProviderOptions,
        ...entrySpecific,
        ...runtimeProviderOptions,
        ...runtimeSpecific,
    };
    console.log("DEBUG: Deepgram merged query (final):", JSON.stringify(merged, null, 2));
    return merged;
}

export async function runProviderEntry(params: any): Promise<any> {
    const { capability, cfg, agentDir, providerRegistry, entry, attachmentIndex, cache, config } = params;
    const providerId = entry.provider;
    const provider = getMediaUnderstandingProvider(providerId, providerRegistry);
    if (!provider) {
        return { outcome: "error", reason: `Provider ${providerId} not found` };
    }

    const apiKeyResult = await resolveApiKeyForProvider({
        provider: providerId,
        cfg,
        agentDir,
    });
    const apiKey = apiKeyResult.apiKey;

    const timeoutMs = (config?.timeoutSeconds || entry.timeoutSeconds || 60) * 1000;
    const maxBytes = config?.maxBytes || entry.maxBytes || 50 * 1024 * 1024;

    try {
        const attachment = await cache.getBuffer({
            attachmentIndex,
            maxBytes,
            timeoutMs,
        });

        const mergeParams = { cfg, provider: providerId, capability, entry, config };
        const headers = resolveMergedHeaders(mergeParams);
        const query = resolveMergedQuery(mergeParams);

        let result;
        if (capability === "audio" && provider.transcribeAudio) {
            result = await provider.transcribeAudio({
                apiKey,
                model: entry.model,
                buffer: attachment.buffer,
                fileName: attachment.fileName,
                mime: attachment.mime,
                prompt: config?.prompt || entry.prompt,
                timeoutMs,
                baseUrl: entry.baseUrl || config?.baseUrl,
                headers,
                query,
                language: config?.language || entry.language,
            } as any);
        } else if (capability === "image" && provider.describeImage) {
            result = await provider.describeImage({
                cfg,
                agentDir,
                provider: providerId,
                model: entry.model || "",
                buffer: attachment.buffer,
                fileName: attachment.fileName,
                mime: attachment.mime,
                prompt: config?.prompt || entry.prompt,
                timeoutMs,
                headers,
            } as any);
        } else if (capability === "video" && provider.describeVideo) {
            result = await provider.describeVideo({
                apiKey,
                model: entry.model,
                buffer: attachment.buffer,
                fileName: attachment.fileName,
                mime: attachment.mime,
                prompt: config?.prompt || entry.prompt,
                timeoutMs,
                baseUrl: entry.baseUrl || config?.baseUrl,
                headers,
            } as any);
        } else {
            return { outcome: "error", reason: `Provider ${providerId} does not support ${capability}` };
        }

        return {
            outcome: "success",
            output: {
                text: trimOutput(result.text, config?.maxChars || entry.maxChars),
                model: result.model || entry.model,
                provider: providerId,
            },
        };
    } catch (err: any) {
        return { outcome: "error", reason: err.message || String(err) };
    }
}

export async function runCliEntry(params: any): Promise<any> {
    const { capability, entry, attachmentIndex, cache, config } = params;

    const timeoutMs = (config?.timeoutSeconds || entry.timeoutSeconds || 120) * 1000;
    const maxBytes = config?.maxBytes || entry.maxBytes;

    let mediaPath = "";
    let cleanupFn: (() => Promise<void> | void) | undefined;

    try {
        const pathResult = await cache.getPath({
            attachmentIndex,
            maxBytes,
            timeoutMs,
        });
        mediaPath = pathResult.path;
        cleanupFn = pathResult.cleanup;
    } catch (err: any) {
        return { outcome: "error", reason: err.message || String(err) };
    }

    const mediaDir = path.dirname(mediaPath);
    const mediaName = path.basename(mediaPath);
    const mediaBase = path.parse(mediaName).name;

    // Create a temporary output directory if needed
    const outputDir = path.join(path.dirname(mediaPath), ".zero-media-output");
    await fs.mkdir(outputDir, { recursive: true });
    const outputBase = path.join(outputDir, mediaBase);

    const prompt = config?.prompt || entry.prompt || "";

    const args = (entry.args || []).map((arg: string) => {
        return arg
            .replace("{{MediaPath}}", mediaPath)
            .replace("{{MediaDir}}", mediaDir)
            .replace("{{MediaName}}", mediaName)
            .replace("{{MediaBase}}", mediaBase)
            .replace("{{OutputDir}}", outputDir)
            .replace("{{OutputBase}}", outputBase)
            .replace("{{Prompt}}", prompt);
    });

    try {
        const { stdout, stderr } = await runExec(entry.command, args, {
            timeoutMs,
        });

        let text = stdout;
        // Special handling for gemini CLI
        if (entry.command === "gemini") {
            text = extractGeminiResponse(stdout) || stdout;
        }
        // Special handling for whisper-cli (it writes to a file)
        else if (entry.command === "whisper-cli") {
            const txtFile = `${outputBase}.txt`;
            try {
                text = await fs.readFile(txtFile, "utf-8");
            } catch {
                // Fallback to stdout if file not found
            }
        }

        return {
            outcome: "success",
            output: {
                text: trimOutput(text.trim(), config?.maxChars || entry.maxChars),
                model: entry.command,
                provider: "cli",
            },
        };
    } catch (err: any) {
        return { outcome: "error", reason: err.message || String(err) };
    } finally {
        if (cleanupFn) {
            await Promise.resolve(cleanupFn()).catch(() => { });
        }
    }
}

export async function runAttachmentEntries(params: any): Promise<any> {
    const { capability, attachmentIndex, entries } = params;
    const attempts = [];

    for (const entry of entries) {
        let result;
        const runParams = { ...params, entry };

        const entryType = entry.type || (entry.command ? "cli" : "provider");
        if (entryType === "provider") {
            result = await runProviderEntry(runParams);
        } else if (entryType === "cli") {
            result = await runCliEntry(runParams);
        } else {
            result = { outcome: "error", reason: `Unknown entry type: ${entryType}` };
        }

        attempts.push({
            ...result,
            type: entryType,
            provider: entry.provider || "cli",
            model: entry.model || entry.command,
        });

        if (result.outcome === "success") {
            const kind = capability === "audio" ? "audio.transcription" : (capability === "image" ? "image.description" : "video.description");
            return {
                output: {
                    ...result.output,
                    kind,
                    attachmentIndex,
                },
                attempts
            };
        }
    }

    return { output: undefined, attempts };
}
