import { describe, expect, it } from "vitest";

import { resolveSkillInvocationPolicy, resolveZEROMetadata } from "./frontmatter.js";

describe("resolveZEROMetadata", () => {
  it("parses top-level declarative requires", () => {
    const meta = resolveZEROMetadata({
      requires: JSON.stringify({ env: ["DEPLOY_TOKEN"], bins: ["docker"] }),
    });
    expect(meta?.requires?.env).toEqual(["DEPLOY_TOKEN"]);
    expect(meta?.requires?.bins).toEqual(["docker"]);
  });

  it("merges legacy metadata.zero.requires with top-level requires", () => {
    const meta = resolveZEROMetadata({
      metadata: JSON.stringify({ zero: { requires: { anyBins: ["aws"] } } }),
      requires: JSON.stringify({ env: ["DEPLOY_TOKEN"] }),
    });
    expect(meta?.requires?.env).toEqual(["DEPLOY_TOKEN"]);
    expect(meta?.requires?.anyBins).toEqual(["aws"]);
  });
});

describe("resolveSkillInvocationPolicy", () => {
  it("defaults to enabled behaviors", () => {
    const policy = resolveSkillInvocationPolicy({});
    expect(policy.userInvocable).toBe(true);
    expect(policy.disableModelInvocation).toBe(false);
  });

  it("parses frontmatter boolean strings", () => {
    const policy = resolveSkillInvocationPolicy({
      "user-invocable": "no",
      "disable-model-invocation": "yes",
    });
    expect(policy.userInvocable).toBe(false);
    expect(policy.disableModelInvocation).toBe(true);
  });
});
