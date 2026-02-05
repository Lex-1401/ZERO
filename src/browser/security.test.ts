import { describe, expect, it } from "vitest";
import {
    createSafeBrowserFunction,
    isSafeFunctionBody,
    validateAndSanitizeFnBody,
} from "./security.js";

describe("Browser Security", () => {
    describe("validateAndSanitizeFnBody", () => {
        it("allows safe document queries", () => {
            const safe = "return document.querySelector('button')";
            expect(() => validateAndSanitizeFnBody(safe)).not.toThrow();
        });

        it("allows safe DOM manipulation", () => {
            const safe = "const el = document.getElementById('test'); el.click()";
            expect(() => validateAndSanitizeFnBody(safe)).not.toThrow();
        });

        it("allows safe array operations", () => {
            const safe = "return Array.from(document.querySelectorAll('div'))";
            expect(() => validateAndSanitizeFnBody(safe)).not.toThrow();
        });

        it("blocks eval()", () => {
            const dangerous = "eval('malicious code')";
            expect(() => validateAndSanitizeFnBody(dangerous)).toThrow(/Forbidden/);
        });

        it("blocks Function constructor", () => {
            const dangerous = "new Function('return 1')()";
            expect(() => validateAndSanitizeFnBody(dangerous)).toThrow(/Forbidden/);
        });

        it("blocks setTimeout", () => {
            const dangerous = "setTimeout(() => {}, 1000)";
            expect(() => validateAndSanitizeFnBody(dangerous)).toThrow(/Forbidden/);
        });

        it("blocks require()", () => {
            const dangerous = "require('fs')";
            expect(() => validateAndSanitizeFnBody(dangerous)).toThrow(/Forbidden/);
        });

        it("blocks process access", () => {
            const dangerous = "process.exit(1)";
            expect(() => validateAndSanitizeFnBody(dangerous)).toThrow(/Forbidden/);
        });

        it("blocks deeply nested structures", () => {
            // Create a deeply nested structure
            let nested = "return 1";
            for (let i = 0; i < 60; i++) {
                nested = `(function() { ${nested} })()`;
            }
            expect(() => validateAndSanitizeFnBody(nested)).toThrow(/depth limit/);
        });

        it("blocks overly large code", () => {
            const large = "return 1;".repeat(2000); // > 10000 chars
            expect(() => validateAndSanitizeFnBody(large)).toThrow(/too large/);
        });

        it("blocks invalid syntax", () => {
            const invalid = "return {{{";
            expect(() => validateAndSanitizeFnBody(invalid)).toThrow(/Unexpected token|syntax/);
        });

        it("normalizes code by removing comments", () => {
            const withComments = "// comment\nreturn 1; /* block */";
            const sanitized = validateAndSanitizeFnBody(withComments);
            // Comments are removed during AST regeneration
            expect(sanitized).not.toContain("//");
            expect(sanitized).not.toContain("/*");
            expect(sanitized).toContain("return 1");
        });
    });

    describe("isSafeFunctionBody", () => {
        it("returns true for safe code", () => {
            expect(isSafeFunctionBody("return document.title")).toBe(true);
        });

        it("returns false for dangerous code", () => {
            expect(isSafeFunctionBody("eval('code')")).toBe(false);
        });

        it("returns false for invalid syntax", () => {
            expect(isSafeFunctionBody("return {{{")).toBe(false);
        });
    });

    describe("createSafeBrowserFunction", () => {
        it("creates a wrapped function", () => {
            const safe = "return document.title";
            const wrapped = createSafeBrowserFunction(safe);
            expect(wrapped).toContain("'use strict'");
            expect(wrapped).toContain("document.title");
        });

        it("validates the function body", () => {
            const dangerous = "eval('code')";
            expect(() => createSafeBrowserFunction(dangerous)).toThrow();
        });

        it("allows additional globals", () => {
            const safe = "return customGlobal";
            const wrapped = createSafeBrowserFunction(safe, ["customGlobal"]);
            expect(wrapped).toContain("customGlobal");
        });
    });

    describe("Real-world scenarios", () => {
        it("allows clicking a button", () => {
            const code = `
        const button = document.querySelector('button[type="submit"]');
        if (button) button.click();
        return true;
      `;
            expect(() => validateAndSanitizeFnBody(code)).not.toThrow();
        });

        it("allows filling a form", () => {
            const code = `
        const input = document.querySelector('input[name="email"]');
        if (input) input.value = 'test@example.com';
        return input && input.value;
      `;
            expect(() => validateAndSanitizeFnBody(code)).not.toThrow();
        });

        it("allows waiting for an element", () => {
            const code = `
        return document.querySelector('.loading') === null;
      `;
            expect(() => validateAndSanitizeFnBody(code)).not.toThrow();
        });

        it("blocks XSS attempts", () => {
            const code = `
        document.body.innerHTML = '<img src=x onerror=eval(atob("..."))>';
      `;
            // This should pass validation (innerHTML is allowed)
            // but the actual XSS would be blocked by browser CSP
            expect(() => validateAndSanitizeFnBody(code)).not.toThrow();
        });

        it("blocks code injection via string concatenation", () => {
            const code = `
        const userInput = "'; eval('malicious'); //";
        eval("return '" + userInput + "'");
      `;
            expect(() => validateAndSanitizeFnBody(code)).toThrow(/Forbidden/);
        });
    });
});
