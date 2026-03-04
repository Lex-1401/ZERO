import type { Page, Browser } from "playwright-core";
import {
    roleRefsByTarget,
    MAX_ROLE_REFS_CACHE
} from "./state.js";
import {
    RoleRefs,
    PageState,
    TargetInfoResponse
} from "./types.js";

export function normalizeCdpUrl(raw: string) {
    return raw.replace(/\/$/, "");
}

export function roleRefsKey(cdpUrl: string, targetId: string) {
    return `${normalizeCdpUrl(cdpUrl)}::${targetId}`;
}

export function rememberRoleRefsForTarget(opts: {
    cdpUrl: string;
    targetId: string;
    refs: RoleRefs;
    frameSelector?: string;
    mode?: NonNullable<PageState["roleRefsMode"]>;
}): void {
    const targetId = opts.targetId.trim();
    if (!targetId) return;
    roleRefsByTarget.set(roleRefsKey(opts.cdpUrl, targetId), {
        refs: opts.refs,
        ...(opts.frameSelector ? { frameSelector: opts.frameSelector } : {}),
        ...(opts.mode ? { mode: opts.mode } : {}),
    });
    while (roleRefsByTarget.size > MAX_ROLE_REFS_CACHE) {
        const first = roleRefsByTarget.keys().next();
        if (first.done) break;
        roleRefsByTarget.delete(first.value);
    }
}

export async function pageTargetId(page: Page): Promise<string | null> {
    const session = await page.context().newCDPSession(page);
    try {
        const info = (await session.send("Target.getTargetInfo")) as TargetInfoResponse;
        const targetId = String(info?.targetInfo?.targetId ?? "").trim();
        return targetId || null;
    } finally {
        await session.detach().catch(() => { });
    }
}

export async function getAllPages(browser: Browser): Promise<Page[]> {
    const contexts = browser.contexts();
    const pages = contexts.flatMap((c) => c.pages());
    return pages;
}

export async function findPageByTargetId(browser: Browser, targetId: string): Promise<Page | null> {
    const pages = await getAllPages(browser);
    for (const page of pages) {
        const tid = await pageTargetId(page).catch(() => null);
        if (tid && tid === targetId) return page;
    }
    return null;
}
