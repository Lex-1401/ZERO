
import fs from "node:fs/promises";
import path from "node:path";
import { parseSemver } from "../../infra/runtime-guard.js";
import { fetchNpmTagVersion } from "../../infra/update-check.js";
import { UPDATE_QUIPS, DEFAULT_GIT_DIR } from "./constants.js";

export function normalizeTag(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.startsWith("zero@") ? trimmed.slice("zero@".length) : trimmed;
}

export function pickUpdateQuip(): string {
    return UPDATE_QUIPS[Math.floor(Math.random() * UPDATE_QUIPS.length)] ?? "Atualização completa.";
}

export function normalizeVersionTag(tag: string): string | null {
    const trimmed = tag.trim();
    if (!trimmed) return null;
    const cleaned = trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
    return parseSemver(cleaned) ? cleaned : null;
}

export async function readPackageVersion(root: string): Promise<string | null> {
    try {
        const raw = await fs.readFile(path.join(root, "package.json"), "utf-8");
        const parsed = JSON.parse(raw) as { version?: string };
        return typeof parsed.version === "string" ? parsed.version : null;
    } catch {
        return null;
    }
}

export async function resolveTargetVersion(tag: string, timeoutMs?: number): Promise<string | null> {
    const direct = normalizeVersionTag(tag);
    if (direct) return direct;
    const res = await fetchNpmTagVersion({ tag, timeoutMs });
    return res.version ?? null;
}

export async function isGitCheckout(root: string): Promise<boolean> {
    try {
        await fs.stat(path.join(root, ".git"));
        return true;
    } catch {
        return false;
    }
}

export async function isZEROPackage(root: string): Promise<boolean> {
    try {
        const raw = await fs.readFile(path.join(root, "package.json"), "utf-8");
        const parsed = JSON.parse(raw) as { name?: string };
        return parsed?.name === "zero";
    } catch {
        return false;
    }
}

export async function pathExists(targetPath: string): Promise<boolean> {
    try {
        await fs.stat(targetPath);
        return true;
    } catch {
        return false;
    }
}

export async function isEmptyDir(targetPath: string): Promise<boolean> {
    try {
        const entries = await fs.readdir(targetPath);
        return entries.length === 0;
    } catch {
        return false;
    }
}

export function resolveGitInstallDir(): string {
    const override = process.env.ZERO_GIT_DIR?.trim();
    if (override) return path.resolve(override);
    return DEFAULT_GIT_DIR;
}

import { select } from "@clack/prompts";
import { stylePromptHint, stylePromptMessage } from "../../terminal/prompt-style.js";

export const selectStyled = <T>(params: Parameters<typeof select<T>>[0]) =>
    select({
        ...params,
        message: stylePromptMessage(params.message),
        options: params.options.map((opt) =>
            opt.hint === undefined ? opt : { ...opt, hint: stylePromptHint(opt.hint) },
        ),
    });

export function formatStepStatus(exitCode: number | null): string {
    if (exitCode === 0) return "✅";
    if (exitCode === null) return "⏳";
    return "❌";
}

export function resolveNodeRunner(): string {
    const base = path.basename(process.execPath).toLowerCase();
    if (base === "node" || base === "node.exe") return process.execPath;
    return "node";
}

export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const sec = (ms / 1000).toFixed(1);
    return `${sec}s`;
}
