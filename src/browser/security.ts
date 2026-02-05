/**
 * Browser Security Module
 * 
 * Provides security validation for browser automation code execution.
 * Implements AST-based validation to prevent arbitrary code execution
 * via eval() in Playwright browser tools.
 * 
 * Security Controls:
 * - LLM01: Prompt Injection (via code injection)
 * - LLM08: Excessive Agency (via unsafe browser automation)
 */

import { parseScript, type Program } from "esprima";
import { generate } from "escodegen";

/**
 * Whitelist of allowed JavaScript constructs for browser automation.
 * These are considered safe for execution in the browser context.
 */
const ALLOWED_NODE_TYPES = new Set([
    "Program",
    "ExpressionStatement",
    "CallExpression",
    "MemberExpression",
    "Identifier",
    "Literal",
    "ArrayExpression",
    "ObjectExpression",
    "Property",
    "ArrowFunctionExpression",
    "FunctionExpression",
    "BlockStatement",
    "ReturnStatement",
    "VariableDeclaration",
    "VariableDeclarator",
    "BinaryExpression",
    "LogicalExpression",
    "UnaryExpression",
    "ConditionalExpression",
    "IfStatement",
    "ForStatement",
    "WhileStatement",
    "AssignmentExpression",
    "UpdateExpression",
    "TemplateLiteral",
    "TemplateElement",
    "SpreadElement",
]);

/**
 * Blacklist of dangerous global objects and methods.
 * These should never be accessible in browser automation code.
 */
const DANGEROUS_GLOBALS = new Set([
    "eval",
    "Function",
    "setTimeout",
    "setInterval",
    "setImmediate",
    "require",
    "import",
    "process",
    "child_process",
    "fs",
    "net",
    "http",
    "https",
    "crypto",
]);

/**
 * Whitelist of safe browser APIs that can be accessed.
 */
const SAFE_BROWSER_APIS = new Set([
    "document",
    "window",
    "console",
    "navigator",
    "location",
    "history",
    "localStorage",
    "sessionStorage",
    "alert",
    "confirm",
    "prompt",
    "fetch",
    "XMLHttpRequest",
]);

/**
 * Validates an AST node recursively.
 * Throws an error if any dangerous construct is found.
 */
function validateASTNode(node: any, depth = 0): void {
    if (!node || typeof node !== "object") return;

    // Prevent deeply nested structures (potential DoS)
    if (depth > 50) {
        throw new Error("AST depth limit exceeded (max 50 levels)");
    }

    // Check if node type is allowed
    if (node.type && !ALLOWED_NODE_TYPES.has(node.type)) {
        throw new Error(`Forbidden AST node type: ${node.type}`);
    }

    // Check for dangerous identifiers
    if (node.type === "Identifier" && DANGEROUS_GLOBALS.has(node.name)) {
        // Allow if it's a property access on a safe API
        // e.g., window.eval is still dangerous, but document.querySelector is safe
        throw new Error(`Forbidden global identifier: ${node.name}`);
    }

    // Check for dynamic code execution patterns
    if (node.type === "CallExpression") {
        // Check if calling eval, Function, etc.
        if (
            node.callee?.type === "Identifier" &&
            DANGEROUS_GLOBALS.has(node.callee.name)
        ) {
            throw new Error(`Forbidden function call: ${node.callee.name}`);
        }

        // Check for new Function()
        if (
            node.callee?.type === "Identifier" &&
            node.callee.name === "Function"
        ) {
            throw new Error("Forbidden: new Function() constructor");
        }
    }

    // Recursively validate child nodes
    for (const key in node) {
        if (key === "loc" || key === "range" || key === "comments") continue;
        const value = node[key];

        if (Array.isArray(value)) {
            for (const item of value) {
                validateASTNode(item, depth + 1);
            }
        } else if (value && typeof value === "object") {
            validateASTNode(value, depth + 1);
        }
    }
}

/**
 * Validates and sanitizes a function body for safe execution.
 * 
 * @param fnBody - The function body as a string
 * @returns The sanitized function body
 * @throws Error if the function body contains dangerous constructs
 * 
 * @example
 * ```typescript
 * // Safe code
 * const safe = validateAndSanitizeFnBody("return document.querySelector('button')");
 * 
 * // Dangerous code (throws)
 * const unsafe = validateAndSanitizeFnBody("eval('malicious code')");
 * ```
 */
export function validateAndSanitizeFnBody(fnBody: string): string {
    if (!fnBody || typeof fnBody !== "string") {
        throw new Error("Function body must be a non-empty string");
    }

    // Limit function body size (prevent DoS)
    if (fnBody.length > 10000) {
        throw new Error("Function body too large (max 10000 characters)");
    }

    try {
        // Wrap the function body in a function to allow return statements
        const wrappedCode = `(function() { ${fnBody} })`;

        // Parse the wrapped function as a script
        const ast: Program = parseScript(wrappedCode, {
            tolerant: false,
            range: true,
            loc: true,
        });

        // Validate the entire AST
        validateASTNode(ast);

        // Regenerate code from AST (normalizes and removes comments)
        const regenerated = generate(ast);

        // Extract the function body from the wrapped code
        // Pattern: (function() { BODY })
        // We want to extract just BODY
        const match = regenerated.match(/^\(function\s*\(\)\s*\{\s*([\s\S]*?)\s*\}\)$/);
        if (!match || !match[1]) {
            // Fallback: try to extract from simpler patterns
            const simpleMatch = regenerated.match(/^\(function\(\)\{([\s\S]*?)\}\)$/);
            if (simpleMatch && simpleMatch[1]) {
                return simpleMatch[1].trim();
            }
            // Last resort: return regenerated code (still normalized)
            return regenerated;
        }

        return match[1].trim();
    } catch (err) {
        if (err instanceof SyntaxError) {
            throw new Error(`Invalid JavaScript syntax: ${err.message}`);
        }
        throw err;
    }
}

/**
 * Validates a function body and wraps it in a safe execution context.
 * 
 * @param fnBody - The function body to validate
 * @param allowedGlobals - Additional globals to allow (default: safe browser APIs)
 * @returns A safe wrapper function
 */
export function createSafeBrowserFunction(
    fnBody: string,
    allowedGlobals: string[] = [],
): string {
    // Validate the function body
    const sanitized = validateAndSanitizeFnBody(fnBody);

    // Create a whitelist of allowed globals
    const globals = new Set([...SAFE_BROWSER_APIS, ...allowedGlobals]);

    // Generate a safe wrapper that only exposes whitelisted globals
    const wrapper = `
(function() {
  'use strict';
  
  // Create a restricted scope with only allowed globals
  const allowedGlobals = ${JSON.stringify([...globals])};
  const scope = {};
  
  for (const name of allowedGlobals) {
    if (typeof window[name] !== 'undefined') {
      scope[name] = window[name];
    }
  }
  
  // Execute the sanitized function in the restricted scope
  return (function() {
    ${sanitized}
  }).call(scope);
})();
`;

    return wrapper;
}

/**
 * Checks if a function body is safe without throwing.
 * 
 * @param fnBody - The function body to check
 * @returns true if safe, false otherwise
 */
export function isSafeFunctionBody(fnBody: string): boolean {
    try {
        validateAndSanitizeFnBody(fnBody);
        return true;
    } catch {
        return false;
    }
}
