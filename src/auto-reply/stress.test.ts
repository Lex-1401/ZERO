import { describe, expect, it } from "vitest";
import { parseInlineDirectives } from "./reply/directive-handling.parse.js";

describe("Directive Stress and Resilience Audit", () => {
  it("handles duplicate directives by taking the first one (Precedence Check)", () => {
    const body = "/think:high /think:low run analysis";
    const res = parseInlineDirectives(body);
    expect(res.hasThinkDirective).toBe(true);
    expect(res.thinkLevel).toBe("high");
    expect(res.cleaned).toBe("run analysis");
  });

  it("handles ambiguous directives embedded in natural language and strips all occurrences", () => {
    const body = "I really /think you should use /t:high for this";
    const res = parseInlineDirectives(body);
    // /think should match (no level), then /t:high should match (level: high)
    // Both are removed from the body.
    expect(res.hasThinkDirective).toBe(true);
    expect(res.thinkLevel).toBe("high"); // /t:high provided the level
    expect(res.cleaned).toBe("I really you should use for this");
  });

  it("handles case insensitivity and weird spacing (Thermodynamics/Entropy)", () => {
    const body = "   /THink   :   HIgh    test    ";
    const res = parseInlineDirectives(body);
    expect(res.thinkLevel).toBe("high");
    expect(res.cleaned).toBe("test");
  });

  it("resilience against malicious-looking inputs (Security/Heuristics)", () => {
    const body = "/model:../../../etc/passwd";
    const res = parseInlineDirectives(body);
    expect(res.hasModelDirective).toBe(true);
    expect(res.rawModelDirective).toBe("../../../etc/passwd");
    // This is fine as parsing, but handleDirectiveOnly should handle it.
  });

  it("handles mixed types and chain-stripping", () => {
    const body = "/model:gpt-4o /v:full /t:high /elevated:ask Execute order 66";
    const res = parseInlineDirectives(body);
    expect(res.rawModelDirective).toBe("gpt-4o");
    expect(res.verboseLevel).toBe("full");
    expect(res.thinkLevel).toBe("high");
    expect(res.elevatedLevel).toBe("ask");
    expect(res.cleaned).toBe("Execute order 66");
  });

  it("handles deceptive punctuation", () => {
    const body = "Check out /t:high... it works!";
    const res = parseInlineDirectives(body);
    // Current regex for arg is [A-Za-z-], so it will stop at '.'
    expect(res.thinkLevel).toBe("high");
    expect(res.cleaned).toBe("Check out ... it works!");
  });

  it("handles Unicode lookalikes (Bypassing heuristics)", () => {
    const body = "∕t:high run"; // Using U+2215 DIVISION SLASH
    const res = parseInlineDirectives(body);
    expect(res.hasThinkDirective).toBe(false); // Should NOT match normal slash regex
  });
});
