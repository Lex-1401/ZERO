
import type { ElementSnapshot, ACISnapshot } from "./types.js";

interface BrowserElement {
    tagName: string;
    className?: string;
    innerText?: string;
    href?: string;
    innerHTML?: string;
    getBoundingClientRect: () => { top: number; left: number; width: number; height: number };
    role?: string;
    type?: string;
    value?: string;
    disabled?: boolean;
    getAttribute(name: string): string | null;
}

/**
 * Source code of the extraction function to be injected into the browser.
 * Note: We use Function.toString() trick or simple string export to avoid bundling issues.
 */
export const EXTRACT_SNAPSHOT_FN_SOURCE = `
function extractElementSnapshot(el, idCounter) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 5 || rect.height < 5) return null;
    
    // Interactive check
    const tag = el.tagName.toUpperCase();
    const isInteractive =
        ["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(tag) ||
        el.role === "button" ||
        el.role === "link" ||
        el.role === "menuitem" ||
        (el.className && typeof el.className === 'string' && el.className.includes("clickable")) ||
        el.onclick != null;

    return {
        id: idCounter,
        tagName: tag,
        role: el.role || null,
        name: el.innerText ? el.innerText.slice(0, 100).trim() : (el.value || el.getAttribute("aria-label") || ""),
        value: el.value || null,
        description: el.getAttribute("aria-description") || null,
        bounds: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
        },
        attributes: {
            href: el.href || "",
            type: el.type || "",
            // Use logical OR for robust fallback if undefined
            disabled: String(el.disabled || false),
        },
        isInteractive,
        isVisible: true,
    };
}
`;

/**
 * Local implementation for testing/Node usage (mirrors the injected one).
 */
export function extractElementSnapshot(el: BrowserElement, idCounter: number): ElementSnapshot | null {
    const rect = el.getBoundingClientRect();
    if (rect.width < 5 || rect.height < 5) return null;

    const isInteractive =
        ["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) ||
        el.role === "button" ||
        el.role === "link" ||
        el.role === "menuitem" ||
        (el.className?.includes("clickable") ?? false);

    return {
        id: idCounter,
        tagName: el.tagName,
        role: el.role || null,
        name: el.innerText?.slice(0, 100).trim() || el.value || el.getAttribute("aria-label") || "",
        value: el.value || null,
        description: el.getAttribute("aria-description") || null,
        bounds: {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
        },
        attributes: {
            href: el.href || "",
            type: el.type || "",
            disabled: String(el.disabled ?? false),
        },
        isInteractive,
        isVisible: true,
    };
}

/**
 * Generates a textual representation of the UI for the LLM prompt.
 * Focuses on interactive elements to reduce noise.
 */
export function generateACIPrompt(snapshot: ACISnapshot): string {
    const interactiveElements = snapshot.elements.filter((el) => el.isInteractive);

    let prompt = `Current Page: ${snapshot.title} (${snapshot.url})\n\nInteractive Elements:\n`;

    if (interactiveElements.length === 0) {
        prompt += "No interactive elements detected.\n";
    } else {
        interactiveElements.forEach((el) => {
            prompt += `[ID: ${el.id}] ${el.tagName} "${el.name || "unnamed"}"`;
            if (el.role) prompt += ` (Role: ${el.role})`;
            if (el.value) prompt += ` (Value: ${el.value})`;
            prompt += ` at (${el.bounds.x}, ${el.bounds.y})\n`;
        });
    }

    prompt += "\nNon-Interactive Context (Text):\n";
    const textElements = snapshot.elements.filter((el) => !el.isInteractive && el.name && el.name.length > 3);
    textElements.slice(0, 20).forEach((el) => { // Limit context to avoid token bloat
        prompt += `- ${el.name}\n`;
    });

    return prompt;
}

/**
 * Returns the full script to be evaluated in the browser context.
 * This encapsulates all client-side logic for ACI scanning.
 */
export function getBrowserInjectionScript(): string {
    return `
    (function() {
        ${EXTRACT_SNAPSHOT_FN_SOURCE}

        const all = Array.from(document.querySelectorAll('*'));
        let id = 1;
        const snapshots = [];
        for (const el of all) {
            // Function is injected above
            const snap = extractElementSnapshot(el, id);
            if (snap) {
                snapshots.push(snap);
                id++;
            }
        }
        return {
            url: window.location.href,
            title: document.title,
            elements: snapshots,
            timestamp: Date.now()
        };
    })()
    `;
}
